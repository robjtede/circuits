use std::time::{SystemTime, UNIX_EPOCH};

use crate::args::GenerateArgs;
use crate::model::{chebyshev_distance, index_for, manhattan_distance, SolveError, Stats, LABELS};
use crate::parser::parse_grid;
use crate::solver::solve_puzzle;

const MIN_GENERATED_PATH_LENGTH: usize = 3;

pub struct GeneratedPuzzle {
    pub puzzle_rows: Vec<String>,
    pub solution_rows: Vec<String>,
    pub seed: u64,
    pub attempts: usize,
    pub template: &'static str,
    pub lengths: Vec<usize>,
    pub verification_stats: Option<Stats>,
}

struct Rng {
    state: u64,
}

pub fn generate_puzzle(args: &GenerateArgs) -> Result<GeneratedPuzzle, String> {
    if args.width < 2 || args.height < 2 {
        return Err("generate requires a board size of at least 2x2".to_string());
    }

    let size = args
        .width
        .checked_mul(args.height)
        .ok_or_else(|| "Board is too large".to_string())?;
    let pair_count = args.pairs.unwrap_or_else(|| args.width.min(args.height));

    if pair_count == 0 {
        return Err("--pairs must be a positive integer".to_string());
    }

    if pair_count > LABELS.len() {
        return Err(format!(
            "This generator supports at most {} pairs",
            LABELS.len()
        ));
    }

    if size < pair_count * MIN_GENERATED_PATH_LENGTH {
        return Err(format!(
            "{} cells cannot fit {} non-adjacent endpoint pairs; reduce --pairs or increase --size",
            size, pair_count
        ));
    }

    let seed = args.seed.unwrap_or_else(random_seed);
    let mut rng = Rng::new(seed);

    for attempt in 1..=args.attempts {
        let (path, template) = random_solution_path(args.width, args.height, &mut rng);

        if !is_valid_solution_path(args.width, args.height, &path) {
            continue;
        }

        let lengths = random_segment_lengths(size, pair_count, &mut rng);

        if !segments_satisfy_endpoint_constraints(args.width, &path, &lengths) {
            continue;
        }

        let (puzzle_rows, solution_rows) =
            build_generated_rows(args.width, args.height, &path, &lengths);
        let mut verification_stats = None;

        if args.verify {
            let puzzle = parse_grid(&puzzle_rows.join("\n"))?;

            match solve_puzzle(&puzzle, args.timeout_ms) {
                Ok(result) if result.solved => {
                    verification_stats = Some(result.stats);
                }
                Ok(_) => continue,
                Err(SolveError::Timeout(_)) => continue,
                Err(SolveError::Invalid(error)) => return Err(error),
            }
        }

        return Ok(GeneratedPuzzle {
            puzzle_rows,
            solution_rows,
            seed,
            attempts: attempt,
            template,
            lengths,
            verification_stats,
        });
    }

    Err(format!(
        "Could not generate a verified puzzle after {} attempts",
        args.attempts
    ))
}

impl Rng {
    fn new(seed: u64) -> Self {
        Self {
            state: seed ^ 0x9e37_79b9_7f4a_7c15,
        }
    }

    fn next_u64(&mut self) -> u64 {
        self.state = self.state.wrapping_add(0x9e37_79b9_7f4a_7c15);
        let mut value = self.state;
        value = (value ^ (value >> 30)).wrapping_mul(0xbf58_476d_1ce4_e5b9);
        value = (value ^ (value >> 27)).wrapping_mul(0x94d0_49bb_1331_11eb);
        value ^ (value >> 31)
    }

    fn usize(&mut self, upper_bound: usize) -> usize {
        if upper_bound <= 1 {
            return 0;
        }

        (self.next_u64() % upper_bound as u64) as usize
    }
}

fn random_seed() -> u64 {
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_nanos() as u64)
        .unwrap_or(0);

    nanos ^ u64::from(std::process::id())
}

fn random_solution_path(width: usize, height: usize, rng: &mut Rng) -> (Vec<usize>, &'static str) {
    match rng.usize(6) {
        0 => (row_switchback_path(width, height), "rows"),
        1 => {
            let mut path = row_switchback_path(width, height);
            path.reverse();
            (path, "rows-reversed")
        }
        2 => (column_switchback_path(width, height), "columns"),
        3 => {
            let mut path = column_switchback_path(width, height);
            path.reverse();
            (path, "columns-reversed")
        }
        4 => (spiral_path(width, height), "spiral"),
        _ => {
            let mut path = spiral_path(width, height);
            path.reverse();
            (path, "spiral-reversed")
        }
    }
}

fn row_switchback_path(width: usize, height: usize) -> Vec<usize> {
    let mut path = Vec::with_capacity(width * height);

    for y in 0..height {
        if y % 2 == 0 {
            for x in 0..width {
                path.push(index_for(width, x, y));
            }
        } else {
            for x in (0..width).rev() {
                path.push(index_for(width, x, y));
            }
        }
    }

    path
}

fn column_switchback_path(width: usize, height: usize) -> Vec<usize> {
    let mut path = Vec::with_capacity(width * height);

    for x in 0..width {
        if x % 2 == 0 {
            for y in 0..height {
                path.push(index_for(width, x, y));
            }
        } else {
            for y in (0..height).rev() {
                path.push(index_for(width, x, y));
            }
        }
    }

    path
}

fn spiral_path(width: usize, height: usize) -> Vec<usize> {
    let mut path = Vec::with_capacity(width * height);
    let mut left = 0;
    let mut right = width - 1;
    let mut top = 0;
    let mut bottom = height - 1;

    while left <= right && top <= bottom {
        for x in left..=right {
            path.push(index_for(width, x, top));
        }

        if top == bottom {
            break;
        }
        top += 1;

        for y in top..=bottom {
            path.push(index_for(width, right, y));
        }

        if left == right {
            break;
        }
        right -= 1;

        for x in (left..=right).rev() {
            path.push(index_for(width, x, bottom));
        }

        if top == bottom {
            break;
        }
        bottom -= 1;

        for y in (top..=bottom).rev() {
            path.push(index_for(width, left, y));
        }

        left += 1;
    }

    path
}

fn is_valid_solution_path(width: usize, height: usize, path: &[usize]) -> bool {
    if path.len() != width * height {
        return false;
    }

    let mut seen = vec![false; width * height];

    for (index, pos) in path.iter().copied().enumerate() {
        if pos >= seen.len() || seen[pos] {
            return false;
        }

        if index > 0 && manhattan_distance(width, path[index - 1], pos) != 1 {
            return false;
        }

        seen[pos] = true;
    }

    true
}

fn random_segment_lengths(total_cells: usize, pair_count: usize, rng: &mut Rng) -> Vec<usize> {
    let mut lengths = vec![MIN_GENERATED_PATH_LENGTH; pair_count];
    let mut remaining = total_cells - pair_count * MIN_GENERATED_PATH_LENGTH;

    while remaining > 0 {
        lengths[rng.usize(pair_count)] += 1;
        remaining -= 1;
    }

    lengths
}

fn segments_satisfy_endpoint_constraints(width: usize, path: &[usize], lengths: &[usize]) -> bool {
    let mut start = 0;

    for length in lengths {
        if *length < MIN_GENERATED_PATH_LENGTH {
            return false;
        }

        let end = start + length - 1;
        if end >= path.len() {
            return false;
        }

        if chebyshev_distance(width, path[start], path[end]) <= 1 {
            return false;
        }

        start += length;
    }

    start == path.len()
}

fn build_generated_rows(
    width: usize,
    height: usize,
    path: &[usize],
    lengths: &[usize],
) -> (Vec<String>, Vec<String>) {
    let mut puzzle_cells = vec!['.'; width * height];
    let mut solution_cells = vec!['.'; width * height];
    let mut start = 0;

    for (color, length) in lengths.iter().copied().enumerate() {
        let label = LABELS[color] as char;
        let end = start + length - 1;

        puzzle_cells[path[start]] = label;
        puzzle_cells[path[end]] = label;

        for pos in path[start..=end].iter().copied() {
            solution_cells[pos] = label;
        }

        start += length;
    }

    (
        cells_to_rows(width, height, &puzzle_cells),
        cells_to_rows(width, height, &solution_cells),
    )
}

fn cells_to_rows(width: usize, height: usize, cells: &[char]) -> Vec<String> {
    let mut rows = Vec::with_capacity(height);

    for y in 0..height {
        rows.push(cells[y * width..(y + 1) * width].iter().collect());
    }

    rows
}

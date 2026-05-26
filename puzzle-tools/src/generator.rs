use std::time::{SystemTime, UNIX_EPOCH};

use crate::args::GenerateArgs;
use crate::model::{chebyshev_distance, index_for, manhattan_distance, SolveError, Stats, LABELS};
use crate::parser::parse_grid;
use crate::solver::count_puzzle_solutions;

const MIN_GENERATED_PATH_LENGTH: usize = 3;

pub struct GeneratedPuzzle {
    pub puzzle_rows: Vec<String>,
    pub solution_rows: Vec<String>,
    pub seed: u64,
    pub attempts: usize,
    pub template: &'static str,
    pub lengths: Vec<usize>,
    pub reward: SolutionReward,
    pub verification_stats: Option<Stats>,
}

struct SolutionCandidate {
    paths: Vec<Vec<usize>>,
    template: &'static str,
    lengths: Vec<usize>,
}

#[derive(Clone, Copy)]
pub struct SolutionReward {
    pub score: isize,
    pub longest_path: usize,
    pub longest_straight_run: usize,
    pub total_bends: usize,
    pub path_count: usize,
}

impl SolutionReward {
    pub fn average_bends(self) -> f64 {
        if self.path_count == 0 {
            return 0.0;
        }

        self.total_bends as f64 / self.path_count as f64
    }
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
    let pair_count = args
        .pairs
        .unwrap_or_else(|| default_pair_count(args.width, args.height));

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
    let mut best_candidate: Option<GeneratedPuzzle> = None;
    let mut accepted_candidates = 0;
    let reward_sample_target = reward_sample_target(args.width, args.height, pair_count);

    for attempt in 1..=args.attempts {
        let Some(solution_candidate) =
            random_solution_candidate(args.width, args.height, pair_count, &mut rng)
        else {
            continue;
        };

        if !solution_paths_are_valid(
            args.width,
            args.height,
            pair_count,
            &solution_candidate.paths,
        ) {
            continue;
        }

        if !paths_satisfy_endpoint_constraints(args.width, &solution_candidate.paths) {
            continue;
        }

        let (puzzle_rows, solution_rows) =
            build_generated_rows(args.width, args.height, &solution_candidate.paths);

        if rows_contain_same_label_block(&solution_rows) {
            continue;
        }

        let mut verification_stats = None;
        let accepted_solution_rows = if args.verify {
            let puzzle = parse_grid(&puzzle_rows.join("\n"))?;

            match count_puzzle_solutions(&puzzle, 2, args.timeout_ms) {
                Ok(mut result) if result.count == 1 => {
                    let Some(solution) = result.first_solution.take() else {
                        continue;
                    };

                    if rows_contain_same_label_block(&solution) || solution_is_band_heavy(&solution)
                    {
                        continue;
                    }

                    verification_stats = Some(result.stats);
                    solution
                }
                Ok(_) => continue,
                Err(SolveError::Timeout(_)) => continue,
                Err(SolveError::Invalid(error)) => return Err(error),
            }
        } else {
            if solution_is_band_heavy(&solution_rows) {
                continue;
            }

            solution_rows
        };

        let reward = solution_reward(&accepted_solution_rows);
        accepted_candidates += 1;
        let candidate = GeneratedPuzzle {
            puzzle_rows,
            solution_rows: accepted_solution_rows,
            seed,
            attempts: attempt,
            template: solution_candidate.template,
            lengths: solution_candidate.lengths,
            reward,
            verification_stats,
        };

        if best_candidate
            .as_ref()
            .is_none_or(|best| reward_is_better(reward, best.reward))
        {
            best_candidate = Some(candidate);
        }

        if accepted_candidates >= reward_sample_target
            && best_candidate.as_ref().is_some_and(|best| {
                reward_meets_target(args.width, args.height, pair_count, best.reward)
            })
        {
            return Ok(best_candidate.expect("best candidate exists"));
        }
    }

    best_candidate.ok_or_else(|| {
        format!(
            "Could not generate a verified puzzle after {} attempts",
            args.attempts
        )
    })
}

fn reward_sample_target(width: usize, height: usize, pair_count: usize) -> usize {
    if width == height && width >= 5 && pair_count == width {
        1
    } else if width.min(height) >= 8 {
        8
    } else {
        4
    }
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

    fn unit_f64(&mut self) -> f64 {
        let mantissa = self.next_u64() >> 11;

        mantissa as f64 / ((1_u64 << 53) as f64)
    }

    fn shuffle<T>(&mut self, values: &mut [T]) {
        for index in (1..values.len()).rev() {
            values.swap(index, self.usize(index + 1));
        }
    }
}

fn random_seed() -> u64 {
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_nanos() as u64)
        .unwrap_or(0);

    nanos ^ u64::from(std::process::id())
}

fn default_pair_count(width: usize, height: usize) -> usize {
    width.min(height).min(LABELS.len())
}

fn random_solution_candidate(
    width: usize,
    height: usize,
    pair_count: usize,
    rng: &mut Rng,
) -> Option<SolutionCandidate> {
    if width == height && width >= 5 && pair_count <= width.min(height) {
        let use_noise = rng.usize(2) == 0;

        if use_noise {
            if let Some(paths) = random_noise_path_tiling(width, height, pair_count, rng) {
                let lengths = paths.iter().map(Vec::len).collect();

                return Some(SolutionCandidate {
                    paths,
                    template: "noise-tiling",
                    lengths,
                });
            }
        }

        if let Some(paths) = random_path_tiling(width, height, pair_count, rng) {
            let lengths = paths.iter().map(Vec::len).collect();

            return Some(SolutionCandidate {
                paths,
                template: "path-tiling",
                lengths,
            });
        }

        if !use_noise {
            if let Some(paths) = random_noise_path_tiling(width, height, pair_count, rng) {
                let lengths = paths.iter().map(Vec::len).collect();

                return Some(SolutionCandidate {
                    paths,
                    template: "noise-tiling",
                    lengths,
                });
            }
        }
    }

    random_segmented_solution_candidate(width, height, pair_count, rng)
}

fn random_segmented_solution_candidate(
    width: usize,
    height: usize,
    pair_count: usize,
    rng: &mut Rng,
) -> Option<SolutionCandidate> {
    let (path, template) = random_solution_path(width, height, rng);

    if !is_valid_solution_path(width, height, &path) {
        return None;
    }

    let lengths = random_segment_lengths(width * height, pair_count, rng);

    if !segments_satisfy_endpoint_constraints(width, &path, &lengths) {
        return None;
    }

    let paths = path_segments(&path, &lengths);

    Some(SolutionCandidate {
        paths,
        template,
        lengths,
    })
}

fn random_solution_path(width: usize, height: usize, rng: &mut Rng) -> (Vec<usize>, &'static str) {
    match rng.usize(14) {
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
        5 => {
            let mut path = spiral_path(width, height);
            path.reverse();
            (path, "spiral-reversed")
        }
        6 => (comb_path(width, height), "comb"),
        7 => {
            let mut path = comb_path(width, height);
            path.reverse();
            (path, "comb-reversed")
        }
        8 => (rotated_comb_path(width, height), "comb-rotated"),
        9 => {
            let mut path = rotated_comb_path(width, height);
            path.reverse();
            (path, "comb-rotated-reversed")
        }
        10 => (ladder_path(width, height), "ladder"),
        11 => {
            let mut path = ladder_path(width, height);
            path.reverse();
            (path, "ladder-reversed")
        }
        12 => (rotated_ladder_path(width, height), "ladder-rotated"),
        _ => {
            let mut path = rotated_ladder_path(width, height);
            path.reverse();
            (path, "ladder-rotated-reversed")
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

fn comb_path(width: usize, height: usize) -> Vec<usize> {
    let mut path = Vec::with_capacity(width * height);
    let bottom = height - 1;
    let mut current_y = 0;

    for x in 0..width {
        path.push(index_for(width, x, 0));
    }

    for column in (0..width).rev() {
        if current_y <= 1 {
            for y in current_y + 1..=bottom {
                path.push(index_for(width, column, y));
            }
            current_y = bottom;
        } else {
            for y in (1..bottom).rev() {
                path.push(index_for(width, column, y));
            }
            current_y = 1;
        }

        if column > 0 {
            path.push(index_for(width, column - 1, current_y));
        }
    }

    path
}

fn rotated_comb_path(width: usize, height: usize) -> Vec<usize> {
    comb_path(height, width)
        .into_iter()
        .map(|pos| {
            let x = pos % height;
            let y = pos / height;

            index_for(width, y, x)
        })
        .collect()
}

fn ladder_path(width: usize, height: usize) -> Vec<usize> {
    if width % 2 == 0 {
        return row_switchback_path(width, height);
    }

    let mut path = Vec::with_capacity(width * height);
    let mut y = 0;
    let mut left_to_right = true;

    while y + 1 < height {
        if left_to_right {
            for x in 0..width {
                if x % 2 == 0 {
                    path.push(index_for(width, x, y));
                    path.push(index_for(width, x, y + 1));
                } else {
                    path.push(index_for(width, x, y + 1));
                    path.push(index_for(width, x, y));
                }
            }
        } else {
            for (offset, x) in (0..width).rev().enumerate() {
                if offset % 2 == 0 {
                    path.push(index_for(width, x, y));
                    path.push(index_for(width, x, y + 1));
                } else {
                    path.push(index_for(width, x, y + 1));
                    path.push(index_for(width, x, y));
                }
            }
        }

        y += 2;
        left_to_right = !left_to_right;
    }

    if y < height {
        let last_x = path.last().copied().map(|pos| pos % width).unwrap_or(0);

        if last_x == 0 {
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

fn rotated_ladder_path(width: usize, height: usize) -> Vec<usize> {
    ladder_path(height, width)
        .into_iter()
        .map(|pos| {
            let x = pos % height;
            let y = pos / height;

            index_for(width, y, x)
        })
        .collect()
}

fn random_path_tiling(
    width: usize,
    height: usize,
    pair_count: usize,
    rng: &mut Rng,
) -> Option<Vec<Vec<usize>>> {
    random_path_tiling_with_field(width, height, pair_count, None, rng)
}

fn random_noise_path_tiling(
    width: usize,
    height: usize,
    pair_count: usize,
    rng: &mut Rng,
) -> Option<Vec<Vec<usize>>> {
    let field = NoiseField::new(width, height, rng);

    random_path_tiling_with_field(width, height, pair_count, Some(&field), rng)
}

fn random_path_tiling_with_field(
    width: usize,
    height: usize,
    pair_count: usize,
    field: Option<&NoiseField>,
    rng: &mut Rng,
) -> Option<Vec<Vec<usize>>> {
    let total_cells = width * height;
    let mut remaining_lengths = random_tiling_path_lengths(total_cells, pair_count, rng)?;

    let mut occupied = vec![false; total_cells];
    let mut paths = Vec::with_capacity(pair_count);
    let mut budget = 15_000;

    if tile_paths(
        width,
        height,
        &mut remaining_lengths,
        &mut occupied,
        &mut paths,
        &mut budget,
        field,
        rng,
    ) {
        Some(paths)
    } else {
        None
    }
}

fn random_tiling_path_lengths(
    total_cells: usize,
    pair_count: usize,
    rng: &mut Rng,
) -> Option<Vec<usize>> {
    if total_cells < pair_count * MIN_GENERATED_PATH_LENGTH {
        return None;
    }

    let average = total_cells / pair_count;
    let max_length = (average * 2)
        .max(MIN_GENERATED_PATH_LENGTH)
        .min(total_cells - MIN_GENERATED_PATH_LENGTH * (pair_count - 1));

    for _ in 0..64 {
        let mut lengths = vec![MIN_GENERATED_PATH_LENGTH; pair_count];
        let mut remaining = total_cells - pair_count * MIN_GENERATED_PATH_LENGTH;

        while remaining > 0 {
            let index = rng.usize(pair_count);

            if lengths[index] < max_length {
                lengths[index] += 1;
                remaining -= 1;
            }
        }

        if path_lengths_are_varied(&lengths, average) {
            rng.shuffle(&mut lengths);
            return Some(lengths);
        }
    }

    let mut lengths = random_segment_lengths(total_cells, pair_count, rng);
    rng.shuffle(&mut lengths);
    Some(lengths)
}

fn path_lengths_are_varied(lengths: &[usize], average: usize) -> bool {
    if lengths.len() < 3 {
        return true;
    }

    let min_length = lengths.iter().copied().min().unwrap_or(0);
    let max_length = lengths.iter().copied().max().unwrap_or(0);
    let spread_target = (average / 3).max(2);

    min_length < average && max_length > average && max_length - min_length >= spread_target
}

fn tile_paths(
    width: usize,
    height: usize,
    remaining_lengths: &mut Vec<usize>,
    occupied: &mut [bool],
    paths: &mut Vec<Vec<usize>>,
    budget: &mut usize,
    field: Option<&NoiseField>,
    rng: &mut Rng,
) -> bool {
    if remaining_lengths.is_empty() {
        return occupied.iter().all(|cell| *cell);
    }

    if *budget == 0 {
        return false;
    }
    *budget -= 1;

    if uncovered_components_are_invalid(width, height, occupied, remaining_lengths) {
        return false;
    }

    let Some(start) = best_unoccupied_cell(width, height, occupied, rng) else {
        return false;
    };

    let mut length_indices = (0..remaining_lengths.len()).collect::<Vec<_>>();
    rng.shuffle(&mut length_indices);
    length_indices.sort_by(|left, right| remaining_lengths[*right].cmp(&remaining_lengths[*left]));
    let mut tried_lengths = Vec::new();

    for length_index in length_indices {
        let path_length = remaining_lengths[length_index];

        if tried_lengths.contains(&path_length) {
            continue;
        }
        tried_lengths.push(path_length);

        let mut candidates = path_candidates(width, height, path_length, start, occupied, rng);

        candidates.sort_by(|left, right| {
            path_candidate_score(width, right, field).cmp(&path_candidate_score(width, left, field))
        });

        let path_length = remaining_lengths.remove(length_index);

        for candidate in candidates {
            for pos in candidate.iter().copied() {
                occupied[pos] = true;
            }
            paths.push(candidate);

            if tile_paths(
                width,
                height,
                remaining_lengths,
                occupied,
                paths,
                budget,
                field,
                rng,
            ) {
                return true;
            }

            let candidate = paths.pop().expect("candidate path exists");
            for pos in candidate {
                occupied[pos] = false;
            }
        }

        remaining_lengths.insert(length_index, path_length);
    }

    false
}

fn path_candidates(
    width: usize,
    height: usize,
    path_length: usize,
    start: usize,
    occupied: &[bool],
    rng: &mut Rng,
) -> Vec<Vec<usize>> {
    let mut used = vec![false; occupied.len()];
    let mut path = vec![start];
    let mut candidates = Vec::new();
    used[start] = true;

    collect_path_candidates(
        width,
        height,
        path_length,
        occupied,
        &mut used,
        &mut path,
        &mut candidates,
        96,
        rng,
    );

    candidates
}

fn collect_path_candidates(
    width: usize,
    height: usize,
    path_length: usize,
    occupied: &[bool],
    used: &mut [bool],
    path: &mut Vec<usize>,
    candidates: &mut Vec<Vec<usize>>,
    limit: usize,
    rng: &mut Rng,
) {
    if candidates.len() >= limit {
        return;
    }

    if path.len() == path_length {
        let metrics = path_position_metrics(width, path);

        if chebyshev_distance(width, path[0], path[path.len() - 1]) > 1
            && path_shape_is_interesting(path_length, metrics)
        {
            candidates.push(path.clone());
        }

        return;
    }

    let current = path[path.len() - 1];
    let mut neighbors = available_neighbors(width, height, current, occupied, used);
    rng.shuffle(&mut neighbors);
    neighbors.sort_by_key(|pos| unoccupied_neighbor_count(width, height, *pos, occupied, used));

    for neighbor in neighbors {
        used[neighbor] = true;
        path.push(neighbor);

        if !path_contains_cell_block(width, height, used) {
            collect_path_candidates(
                width,
                height,
                path_length,
                occupied,
                used,
                path,
                candidates,
                limit,
                rng,
            );
        }

        path.pop();
        used[neighbor] = false;

        if candidates.len() >= limit {
            break;
        }
    }
}

fn path_shape_is_interesting(path_length: usize, metrics: PathMetrics) -> bool {
    if path_length < 5 {
        return true;
    }

    let min_bends = if path_length >= 8 { 2 } else { 1 };
    let longest_allowed = if path_length >= 8 {
        path_length.saturating_sub(4).max(4)
    } else {
        path_length.saturating_sub(1).max(3)
    };

    metrics.bends >= min_bends && metrics.longest_straight_run <= longest_allowed
}

fn path_candidate_score(width: usize, path: &[usize], field: Option<&NoiseField>) -> isize {
    let metrics = path_position_metrics(width, path);
    let field_score = field.map_or(0, |field| field.path_score(path));

    (metrics.bends as isize * 10) + path.len() as isize - metrics.longest_straight_run as isize
        + field_score
}

struct NoiseField {
    width: usize,
    height: usize,
    values: Vec<f64>,
}

impl NoiseField {
    fn new(width: usize, height: usize, rng: &mut Rng) -> Self {
        let octaves = [(4, 1.0), (7, 0.55), (11, 0.25)];
        let mut values = vec![0.0; width * height];
        let mut total_weight = 0.0;

        for (step, weight) in octaves {
            let octave = ValueNoiseOctave::new(width, height, step, rng);

            for y in 0..height {
                for x in 0..width {
                    values[index_for(width, x, y)] += octave.value_at(x, y) * weight;
                }
            }

            total_weight += weight;
        }

        for value in &mut values {
            *value /= total_weight;
        }

        Self {
            width,
            height,
            values,
        }
    }

    fn path_score(&self, path: &[usize]) -> isize {
        let mut in_path = vec![false; self.values.len()];
        let mut path_sum = 0.0;
        let mut step_delta = 0.0;

        for pos in path.iter().copied() {
            in_path[pos] = true;
            path_sum += self.values[pos];
        }

        for step in path.windows(2) {
            step_delta += (self.values[step[0]] - self.values[step[1]]).abs();
        }

        let mean = path_sum / path.len() as f64;
        let variance = path
            .iter()
            .copied()
            .map(|pos| (self.values[pos] - mean).abs())
            .sum::<f64>()
            / path.len() as f64;
        let boundary_delta = path
            .iter()
            .copied()
            .flat_map(|pos| position_neighbors(self.width, self.height, pos))
            .filter(|neighbor| !in_path[*neighbor])
            .map(|neighbor| (self.values[neighbor] - mean).abs())
            .sum::<f64>();

        ((boundary_delta * 4.0) - (variance * 90.0) - (step_delta * 25.0)).round() as isize
    }
}

struct ValueNoiseOctave {
    step: usize,
    grid_width: usize,
    values: Vec<f64>,
}

impl ValueNoiseOctave {
    fn new(width: usize, height: usize, step: usize, rng: &mut Rng) -> Self {
        let grid_width = width.div_ceil(step) + 2;
        let grid_height = height.div_ceil(step) + 2;
        let mut values = Vec::with_capacity(grid_width * grid_height);

        for _ in 0..grid_width * grid_height {
            values.push(rng.unit_f64());
        }

        Self {
            step,
            grid_width,
            values,
        }
    }

    fn value_at(&self, x: usize, y: usize) -> f64 {
        let left = x / self.step;
        let top = y / self.step;
        let local_x = smoothstep((x % self.step) as f64 / self.step as f64);
        let local_y = smoothstep((y % self.step) as f64 / self.step as f64);
        let top_value = lerp(
            self.grid_value(left, top),
            self.grid_value(left + 1, top),
            local_x,
        );
        let bottom_value = lerp(
            self.grid_value(left, top + 1),
            self.grid_value(left + 1, top + 1),
            local_x,
        );

        lerp(top_value, bottom_value, local_y)
    }

    fn grid_value(&self, x: usize, y: usize) -> f64 {
        self.values[y * self.grid_width + x]
    }
}

fn smoothstep(value: f64) -> f64 {
    value * value * (3.0 - 2.0 * value)
}

fn lerp(left: f64, right: f64, t: f64) -> f64 {
    left + (right - left) * t
}

fn path_position_metrics(width: usize, path: &[usize]) -> PathMetrics {
    let mut direction = None;
    let mut run_length = 1;
    let mut longest_line = 1;
    let mut bends = 0;

    for step in path.windows(2) {
        let current = step[0];
        let next = step[1];
        let current_x = (current % width) as isize;
        let current_y = (current / width) as isize;
        let next_x = (next % width) as isize;
        let next_y = (next / width) as isize;
        let next_direction = (next_x - current_x, next_y - current_y);

        if let Some(prev_direction) = direction {
            if prev_direction == next_direction {
                run_length += 1;
            } else {
                bends += 1;
                longest_line = longest_line.max(run_length);
                run_length = 2;
            }
        } else {
            run_length = 2;
        }

        direction = Some(next_direction);
    }

    longest_line = longest_line.max(run_length);

    PathMetrics {
        length: path.len(),
        longest_straight_run: longest_line,
        bends,
    }
}

fn path_contains_cell_block(width: usize, height: usize, used: &[bool]) -> bool {
    for y in 0..height - 1 {
        for x in 0..width - 1 {
            if used[index_for(width, x, y)]
                && used[index_for(width, x + 1, y)]
                && used[index_for(width, x, y + 1)]
                && used[index_for(width, x + 1, y + 1)]
            {
                return true;
            }
        }
    }

    false
}

fn uncovered_components_are_invalid(
    width: usize,
    height: usize,
    occupied: &[bool],
    remaining_lengths: &[usize],
) -> bool {
    let mut seen = vec![false; occupied.len()];
    let mut component_sizes = Vec::new();

    for pos in 0..occupied.len() {
        if occupied[pos] || seen[pos] {
            continue;
        }

        let mut stack = vec![pos];
        let mut size = 0;
        seen[pos] = true;

        while let Some(current) = stack.pop() {
            size += 1;

            for neighbor in position_neighbors(width, height, current) {
                if !occupied[neighbor] && !seen[neighbor] {
                    seen[neighbor] = true;
                    stack.push(neighbor);
                }
            }
        }

        component_sizes.push(size);
    }

    component_sizes_can_fit_lengths(&component_sizes, remaining_lengths)
        .is_some_and(|can_fit| !can_fit)
}

fn component_sizes_can_fit_lengths(
    component_sizes: &[usize],
    remaining_lengths: &[usize],
) -> Option<bool> {
    let uncovered_cells = component_sizes.iter().sum::<usize>();
    let remaining_cells = remaining_lengths.iter().sum::<usize>();

    if uncovered_cells != remaining_cells {
        return Some(false);
    }

    if component_sizes.is_empty() {
        return Some(remaining_lengths.is_empty());
    }

    let min_length = remaining_lengths.iter().copied().min()?;
    if component_sizes.iter().any(|size| *size < min_length) {
        return Some(false);
    }

    if remaining_lengths.len() > 18 {
        return None;
    }

    let mask_count = 1_usize << remaining_lengths.len();
    let full_mask = mask_count - 1;
    let mut mask_sums = vec![0; mask_count];

    for mask in 1..mask_count {
        let bit = mask.trailing_zeros() as usize;
        let previous_mask = mask & !(1_usize << bit);
        mask_sums[mask] = mask_sums[previous_mask] + remaining_lengths[bit];
    }

    let mut components = component_sizes.to_vec();
    components.sort_unstable_by(|left, right| right.cmp(left));

    Some(component_masks_can_fit(
        0,
        0,
        full_mask,
        &components,
        &mask_sums,
    ))
}

fn component_masks_can_fit(
    component_index: usize,
    used_mask: usize,
    full_mask: usize,
    components: &[usize],
    mask_sums: &[usize],
) -> bool {
    if component_index == components.len() {
        return used_mask == full_mask;
    }

    let target = components[component_index];
    let available_mask = full_mask & !used_mask;
    let mut mask = available_mask;

    while mask > 0 {
        if mask_sums[mask] == target
            && component_masks_can_fit(
                component_index + 1,
                used_mask | mask,
                full_mask,
                components,
                mask_sums,
            )
        {
            return true;
        }

        mask = (mask - 1) & available_mask;
    }

    false
}

fn best_unoccupied_cell(
    width: usize,
    height: usize,
    occupied: &[bool],
    rng: &mut Rng,
) -> Option<usize> {
    let mut best = Vec::new();
    let mut best_neighbor_count = usize::MAX;

    for pos in 0..occupied.len() {
        if occupied[pos] {
            continue;
        }

        let neighbor_count = unoccupied_neighbor_count(width, height, pos, occupied, occupied);

        if neighbor_count < best_neighbor_count {
            best.clear();
            best_neighbor_count = neighbor_count;
        }

        if neighbor_count == best_neighbor_count {
            best.push(pos);
        }
    }

    rng.shuffle(&mut best);
    best.first().copied()
}

fn available_neighbors(
    width: usize,
    height: usize,
    pos: usize,
    occupied: &[bool],
    used: &[bool],
) -> Vec<usize> {
    position_neighbors(width, height, pos)
        .into_iter()
        .filter(|neighbor| !occupied[*neighbor] && !used[*neighbor])
        .collect()
}

fn unoccupied_neighbor_count(
    width: usize,
    height: usize,
    pos: usize,
    occupied: &[bool],
    used: &[bool],
) -> usize {
    available_neighbors(width, height, pos, occupied, used).len()
}

fn position_neighbors(width: usize, height: usize, pos: usize) -> Vec<usize> {
    let x = pos % width;
    let y = pos / width;
    let mut neighbors = Vec::with_capacity(4);

    if x > 0 {
        neighbors.push(index_for(width, x - 1, y));
    }
    if x + 1 < width {
        neighbors.push(index_for(width, x + 1, y));
    }
    if y > 0 {
        neighbors.push(index_for(width, x, y - 1));
    }
    if y + 1 < height {
        neighbors.push(index_for(width, x, y + 1));
    }

    neighbors
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

fn paths_satisfy_endpoint_constraints(width: usize, paths: &[Vec<usize>]) -> bool {
    paths.iter().all(|path| {
        path.len() >= MIN_GENERATED_PATH_LENGTH
            && chebyshev_distance(width, path[0], path[path.len() - 1]) > 1
    })
}

fn path_segments(path: &[usize], lengths: &[usize]) -> Vec<Vec<usize>> {
    let mut paths = Vec::with_capacity(lengths.len());
    let mut start = 0;

    for length in lengths {
        let end = start + length;
        paths.push(path[start..end].to_vec());
        start = end;
    }

    paths
}

fn solution_paths_are_valid(
    width: usize,
    height: usize,
    pair_count: usize,
    paths: &[Vec<usize>],
) -> bool {
    if paths.len() != pair_count {
        return false;
    }

    let mut seen = vec![false; width * height];

    for path in paths {
        if path.len() < MIN_GENERATED_PATH_LENGTH {
            return false;
        }

        for (index, pos) in path.iter().copied().enumerate() {
            if pos >= seen.len() || seen[pos] {
                return false;
            }

            if index > 0 && manhattan_distance(width, path[index - 1], pos) != 1 {
                return false;
            }

            seen[pos] = true;
        }
    }

    seen.into_iter().all(|cell_seen| cell_seen)
}

fn build_generated_rows(
    width: usize,
    height: usize,
    paths: &[Vec<usize>],
) -> (Vec<String>, Vec<String>) {
    let mut puzzle_cells = vec!['.'; width * height];
    let mut solution_cells = vec!['.'; width * height];

    for (color, path) in paths.iter().enumerate() {
        let label = LABELS[color] as char;

        puzzle_cells[path[0]] = label;
        puzzle_cells[path[path.len() - 1]] = label;

        for pos in path.iter().copied() {
            solution_cells[pos] = label;
        }
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

fn rows_contain_same_label_block(rows: &[String]) -> bool {
    if rows.len() < 2 {
        return false;
    }

    let grid = rows
        .iter()
        .map(|row| row.chars().collect::<Vec<_>>())
        .collect::<Vec<_>>();

    for y in 0..grid.len() - 1 {
        let width = grid[y].len().min(grid[y + 1].len());

        for x in 0..width.saturating_sub(1) {
            let label = grid[y][x];

            if label != '.'
                && grid[y][x + 1] == label
                && grid[y + 1][x] == label
                && grid[y + 1][x + 1] == label
            {
                return true;
            }
        }
    }

    false
}

fn solution_is_band_heavy(rows: &[String]) -> bool {
    if rows.len() < 6 || rows.first().is_none_or(|row| row.len() < 6) {
        return false;
    }

    let grid = rows
        .iter()
        .map(|row| row.chars().collect::<Vec<_>>())
        .collect::<Vec<_>>();
    let width = grid[0].len();
    let height = grid.len();
    let stripe_threshold = (width * 4).div_ceil(5);
    let row_stripes = grid
        .iter()
        .filter(|row| max_label_count(row.iter().copied()) >= stripe_threshold)
        .count();
    let column_threshold = (height * 4).div_ceil(5);
    let column_stripes = (0..width)
        .filter(|x| max_label_count((0..height).map(|y| grid[y][*x])) >= column_threshold)
        .count();

    row_stripes > height / 2 || column_stripes > width / 2
}

fn reward_meets_target(
    width: usize,
    height: usize,
    pair_count: usize,
    reward: SolutionReward,
) -> bool {
    let smaller_dimension = width.min(height);

    if smaller_dimension < 5 {
        return true;
    }

    let longest_straight_run_target = smaller_dimension.saturating_sub(1);
    let bend_target = pair_count.div_ceil(3);

    reward.longest_straight_run <= longest_straight_run_target.max(3)
        && reward.total_bends >= bend_target
}

fn reward_is_better(next: SolutionReward, current: SolutionReward) -> bool {
    next.score > current.score
        || (next.score == current.score && next.longest_path > current.longest_path)
        || (next.score == current.score
            && next.longest_path == current.longest_path
            && next.longest_straight_run < current.longest_straight_run)
        || (next.score == current.score
            && next.longest_path == current.longest_path
            && next.longest_straight_run == current.longest_straight_run
            && next.total_bends > current.total_bends)
}

fn solution_reward(rows: &[String]) -> SolutionReward {
    let grid = rows
        .iter()
        .map(|row| row.chars().collect::<Vec<_>>())
        .collect::<Vec<_>>();
    let labels = solution_labels(&grid);
    let mut longest_path = 1;
    let mut longest_straight_run = 1;
    let mut total_bends = 0;
    let mut path_count = 0;

    for label in labels {
        if let Some(metrics) = label_path_metrics(&grid, label) {
            longest_path = longest_path.max(metrics.length);
            longest_straight_run = longest_straight_run.max(metrics.longest_straight_run);
            total_bends += metrics.bends;
            path_count += 1;
        }
    }

    SolutionReward {
        score: (total_bends as isize * 100) + (longest_path as isize * 10)
            - (longest_straight_run as isize * 25),
        longest_path,
        longest_straight_run,
        total_bends,
        path_count,
    }
}

struct PathMetrics {
    length: usize,
    longest_straight_run: usize,
    bends: usize,
}

fn solution_labels(grid: &[Vec<char>]) -> Vec<char> {
    let mut labels = Vec::new();

    for row in grid {
        for label in row.iter().copied() {
            if label != '.' && !labels.contains(&label) {
                labels.push(label);
            }
        }
    }

    labels.sort_unstable();
    labels
}

fn label_path_metrics(grid: &[Vec<char>], label: char) -> Option<PathMetrics> {
    let mut cells = Vec::new();

    for (y, row) in grid.iter().enumerate() {
        for (x, cell) in row.iter().copied().enumerate() {
            if cell == label {
                cells.push((x, y));
            }
        }
    }

    if cells.len() < 2 {
        return None;
    }

    let start = cells
        .iter()
        .copied()
        .find(|(x, y)| same_label_neighbors(grid, label, *x, *y).len() <= 1)
        .unwrap_or(cells[0]);
    let mut previous = None;
    let mut current = start;
    let mut direction = None;
    let mut run_length = 1;
    let mut longest_line = 1;
    let mut bends = 0;

    loop {
        let next = same_label_neighbors(grid, label, current.0, current.1)
            .into_iter()
            .find(|pos| Some(*pos) != previous);

        let Some(next) = next else {
            break;
        };

        let next_direction = (
            next.0 as isize - current.0 as isize,
            next.1 as isize - current.1 as isize,
        );

        if let Some(prev_direction) = direction {
            if prev_direction == next_direction {
                run_length += 1;
            } else {
                bends += 1;
                longest_line = longest_line.max(run_length);
                run_length = 2;
            }
        } else {
            run_length = 2;
        }

        direction = Some(next_direction);
        previous = Some(current);
        current = next;
    }

    longest_line = longest_line.max(run_length);

    Some(PathMetrics {
        length: cells.len(),
        longest_straight_run: longest_line,
        bends,
    })
}

fn same_label_neighbors(
    grid: &[Vec<char>],
    label: char,
    x: usize,
    y: usize,
) -> Vec<(usize, usize)> {
    let mut neighbors = Vec::with_capacity(4);
    let height = grid.len();
    let width = grid[y].len();

    if x > 0 && grid[y][x - 1] == label {
        neighbors.push((x - 1, y));
    }
    if x + 1 < width && grid[y][x + 1] == label {
        neighbors.push((x + 1, y));
    }
    if y > 0 && grid[y - 1][x] == label {
        neighbors.push((x, y - 1));
    }
    if y + 1 < height && grid[y + 1][x] == label {
        neighbors.push((x, y + 1));
    }

    neighbors
}

fn max_label_count(cells: impl Iterator<Item = char>) -> usize {
    let mut counts = [0_usize; 128];

    for cell in cells {
        let index = cell as usize;

        if index < counts.len() && cell != '.' {
            counts[index] += 1;
        }
    }

    counts.into_iter().max().unwrap_or(0)
}

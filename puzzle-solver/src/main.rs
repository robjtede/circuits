use clap::{error::ErrorKind, Parser};
use std::collections::HashMap;
use std::env;
use std::fs;
use std::io::{self, Read};
use std::time::{Instant, SystemTime, UNIX_EPOCH};

const EMPTY_CELLS: [char; 3] = ['.', '_', '-'];
const LABELS: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const MIN_GENERATED_PATH_LENGTH: usize = 3;

#[derive(Clone, Copy)]
struct Pair {
    label: char,
    start: usize,
    target: usize,
}

struct Puzzle {
    width: usize,
    height: usize,
    size: usize,
    pairs: Vec<Pair>,
}

#[derive(Clone, Copy)]
struct Step {
    pos: usize,
    target: bool,
}

struct Choice {
    color: usize,
    moves: Vec<Step>,
}

struct SolveArgs {
    grid: Option<String>,
    file: Option<String>,
    quiet: bool,
    stats: bool,
    timeout_ms: u64,
}

struct GenerateArgs {
    width: usize,
    height: usize,
    pairs: Option<usize>,
    seed: Option<u64>,
    attempts: usize,
    show_solution: bool,
    stats: bool,
    verify: bool,
    timeout_ms: u64,
}

enum Command {
    Solve(SolveArgs),
    Generate(GenerateArgs),
}

enum ParsedCommand {
    Command(Command),
    Help(String),
    Error(String),
}

#[derive(Parser)]
#[command(
    name = "just solve --",
    about = "Solve a Flow-style endpoint puzzle.",
    after_help = GRID_FORMAT_HELP
)]
struct SolveCli {
    #[arg(
        long,
        short = 'q',
        help = "Print only solvable, unsolvable, or unknown."
    )]
    quiet: bool,
    #[arg(long, help = "Print search statistics.")]
    stats: bool,
    #[arg(
        long,
        value_name = "ROWS",
        help = "Grid text. Use /, comma, semicolon, or newlines between rows."
    )]
    grid: Option<String>,
    #[arg(
        long,
        default_value_t = 30_000,
        value_name = "N",
        help = "Stop search after n milliseconds. Use 0 for no timeout."
    )]
    timeout_ms: u64,
    #[arg(value_name = "GRID_FILE", help = "Grid file to read instead of stdin.")]
    file: Option<String>,
}

#[derive(Parser)]
#[command(
    name = "just generate --",
    about = "Generate a solvable Flow-style endpoint puzzle.",
    after_help = GRID_FORMAT_HELP
)]
struct GenerateCli {
    #[arg(
        value_name = "SIZE",
        value_parser = parse_size,
        conflicts_with = "size",
        help = "Board size as n or widthxheight."
    )]
    positional_size: Option<(usize, usize)>,
    #[arg(long, value_name = "N|WxH", value_parser = parse_size, help = "Board size.")]
    size: Option<(usize, usize)>,
    #[arg(
        long,
        value_name = "N",
        value_parser = parse_positive_usize,
        help = "Endpoint pairs. Default: smaller board dimension."
    )]
    pairs: Option<usize>,
    #[arg(long, value_name = "N", help = "Deterministic generator seed.")]
    seed: Option<u64>,
    #[arg(
        long,
        default_value_t = 1_000,
        value_name = "N",
        value_parser = parse_positive_usize,
        help = "Candidate attempts before failing."
    )]
    attempts: usize,
    #[arg(long, help = "Also print the generated full solution.")]
    solution: bool,
    #[arg(long, help = "Print generation statistics.")]
    stats: bool,
    #[arg(
        long = "no-verify",
        help = "Skip solver verification after construction."
    )]
    no_verify: bool,
    #[arg(
        long,
        default_value_t = 30_000,
        value_name = "N",
        help = "Solver verification timeout per candidate. Use 0 for no timeout."
    )]
    timeout_ms: u64,
}

const GRID_FORMAT_HELP: &str = "\
Grid format:
  Each endpoint label must appear exactly twice.
  Empty cells are ., _, or -.
  Whitespace is ignored, so either A...A or A . . . A works.

Examples:
  just solve -- --grid 'A...A/B...B/C...C/D...D/E...E'
  just generate -- 8 --pairs 8 --seed 42";

struct Stats {
    nodes: u64,
    backtracks: u64,
    elapsed_ms: u128,
}

struct SolveResult {
    solved: bool,
    solution: Option<Vec<String>>,
    stats: Stats,
}

#[derive(Debug)]
struct PuzzleTimeoutError {
    timeout_ms: u64,
}

#[derive(Debug)]
enum SolveError {
    Invalid(String),
    Timeout(PuzzleTimeoutError),
}

struct GeneratedPuzzle {
    puzzle_rows: Vec<String>,
    solution_rows: Vec<String>,
    seed: u64,
    attempts: usize,
    template: &'static str,
    lengths: Vec<usize>,
    verification_stats: Option<Stats>,
}

struct Rng {
    state: u64,
}

struct Solver<'a> {
    puzzle: &'a Puzzle,
    board: Vec<i16>,
    heads: Vec<usize>,
    complete: Vec<bool>,
    paths: Vec<Vec<usize>>,
    visited: Vec<u32>,
    component_visited: Vec<u32>,
    visit_stamp: u32,
    component_stamp: u32,
    incomplete_count: usize,
    deadline: Option<Instant>,
    timeout_ms: u64,
    stats: Stats,
}

impl Default for SolveArgs {
    fn default() -> Self {
        Self {
            grid: None,
            file: None,
            quiet: false,
            stats: false,
            timeout_ms: 30_000,
        }
    }
}

impl Default for GenerateArgs {
    fn default() -> Self {
        Self {
            width: 0,
            height: 0,
            pairs: None,
            seed: None,
            attempts: 1_000,
            show_solution: false,
            stats: false,
            verify: true,
            timeout_ms: 30_000,
        }
    }
}

impl<'a> Solver<'a> {
    fn new(puzzle: &'a Puzzle, timeout_ms: u64) -> Result<Self, String> {
        if puzzle.pairs.len() > i16::MAX as usize {
            return Err("Too many endpoint pairs for this solver".to_string());
        }

        let mut board = vec![-1; puzzle.size];
        let mut heads = vec![0; puzzle.pairs.len()];
        let mut paths = vec![Vec::new(); puzzle.pairs.len()];

        for (color, pair) in puzzle.pairs.iter().enumerate() {
            if board[pair.start] != -1 || board[pair.target] != -1 {
                return Err("Endpoint pairs cannot overlap".to_string());
            }

            board[pair.start] = color as i16;
            board[pair.target] = color as i16;
            heads[color] = pair.start;
            paths[color].push(pair.start);
        }

        Ok(Self {
            puzzle,
            board,
            heads,
            complete: vec![false; puzzle.pairs.len()],
            paths,
            visited: vec![0; puzzle.size],
            component_visited: vec![0; puzzle.size],
            visit_stamp: 0,
            component_stamp: 0,
            incomplete_count: puzzle.pairs.len(),
            deadline: if timeout_ms == 0 {
                None
            } else {
                Some(Instant::now() + std::time::Duration::from_millis(timeout_ms))
            },
            timeout_ms,
            stats: Stats {
                nodes: 0,
                backtracks: 0,
                elapsed_ms: 0,
            },
        })
    }

    fn solve(mut self) -> Result<SolveResult, PuzzleTimeoutError> {
        let empty_count = self.puzzle.size - self.puzzle.pairs.len() * 2;
        let started_at = Instant::now();
        let solved = self.search(empty_count)?;
        self.stats.elapsed_ms = started_at.elapsed().as_millis();

        let solution = if solved {
            Some(render_solution(self.puzzle, &self.paths))
        } else {
            None
        };

        Ok(SolveResult {
            solved,
            solution,
            stats: self.stats,
        })
    }

    fn search(&mut self, current_empty_count: usize) -> Result<bool, PuzzleTimeoutError> {
        self.stats.nodes += 1;

        if (self.stats.nodes & 1023) == 0 {
            if let Some(deadline) = self.deadline {
                if Instant::now() > deadline {
                    return Err(PuzzleTimeoutError {
                        timeout_ms: self.timeout_ms,
                    });
                }
            }
        }

        if self.incomplete_count == 0 {
            return Ok(current_empty_count == 0);
        }

        if !self.passes_pruning(current_empty_count) {
            return Ok(false);
        }

        let Some(choice) = self.choose_color(current_empty_count) else {
            return Ok(false);
        };

        for step in choice.moves {
            let previous_head = self.heads[choice.color];
            let mut next_empty_count = current_empty_count;

            self.heads[choice.color] = step.pos;
            self.paths[choice.color].push(step.pos);

            if step.target {
                self.complete[choice.color] = true;
                self.incomplete_count -= 1;
            } else {
                self.board[step.pos] = choice.color as i16;
                next_empty_count -= 1;
            }

            if self.search(next_empty_count)? {
                return Ok(true);
            }

            if step.target {
                self.complete[choice.color] = false;
                self.incomplete_count += 1;
            } else {
                self.board[step.pos] = -1;
            }

            self.paths[choice.color].pop();
            self.heads[choice.color] = previous_head;
            self.stats.backtracks += 1;
        }

        Ok(false)
    }

    fn passes_pruning(&mut self, current_empty_count: usize) -> bool {
        for color in 0..self.puzzle.pairs.len() {
            if self.complete[color] {
                continue;
            }

            if self.legal_moves(color, current_empty_count).is_empty() {
                return false;
            }

            if !self.can_reach_target(color) {
                return false;
            }
        }

        if current_empty_count == 0 {
            return true;
        }

        for pos in 0..self.puzzle.size {
            if self.board[pos] == -1 && self.available_neighbor_count(pos) < 2 {
                return false;
            }
        }

        self.empty_components_can_be_filled()
    }

    fn choose_color(&self, current_empty_count: usize) -> Option<Choice> {
        let mut best_color = None;
        let mut best_moves = Vec::new();

        for color in 0..self.puzzle.pairs.len() {
            if self.complete[color] {
                continue;
            }

            let moves = self.legal_moves(color, current_empty_count);

            if best_color.is_none() || moves.len() < best_moves.len() {
                best_color = Some(color);
                best_moves = moves;
            }
        }

        let color = best_color?;
        if best_moves.is_empty() {
            return None;
        }

        best_moves.sort_by_key(|step| self.move_score(color, *step, current_empty_count));

        Some(Choice {
            color,
            moves: best_moves,
        })
    }

    fn legal_moves(&self, color: usize, current_empty_count: usize) -> Vec<Step> {
        let mut moves = Vec::new();
        let head = self.heads[color];
        let target = self.puzzle.pairs[color].target;

        for next in self.neighbor_positions(head).into_iter().flatten() {
            if next == target {
                if self.incomplete_count != 1 || current_empty_count == 0 {
                    moves.push(Step {
                        pos: next,
                        target: true,
                    });
                }
            } else if self.board[next] == -1 {
                moves.push(Step {
                    pos: next,
                    target: false,
                });
            }
        }

        moves
    }

    fn move_score(&self, color: usize, step: Step, current_empty_count: usize) -> i32 {
        if step.target {
            return if current_empty_count == 0 { -1 } else { 1000 };
        }

        let target = self.puzzle.pairs[color].target;
        let mut score = 0;

        for next in self.neighbor_positions(step.pos).into_iter().flatten() {
            if next == target || self.board[next] == -1 {
                score += 1;
            }
        }

        score
    }

    fn can_reach_target(&mut self, color: usize) -> bool {
        let target = self.puzzle.pairs[color].target;
        let stamp = self.next_visit_stamp();
        let mut queue = Vec::with_capacity(self.puzzle.size);
        let mut read_index = 0;

        self.visited[self.heads[color]] = stamp;
        queue.push(self.heads[color]);

        while read_index < queue.len() {
            let current = queue[read_index];
            read_index += 1;

            if current == target {
                return true;
            }

            for next in self.neighbor_positions(current).into_iter().flatten() {
                if self.visited[next] == stamp {
                    continue;
                }

                if next != target && self.board[next] != -1 {
                    continue;
                }

                self.visited[next] = stamp;
                queue.push(next);
            }
        }

        false
    }

    fn available_neighbor_count(&self, pos: usize) -> usize {
        self.neighbor_positions(pos)
            .into_iter()
            .flatten()
            .filter(|next| self.is_available_for_empty_cell(*next))
            .count()
    }

    fn is_available_for_empty_cell(&self, pos: usize) -> bool {
        let color = self.board[pos];

        if color == -1 {
            return true;
        }

        let color = color as usize;
        if self.complete[color] {
            return false;
        }

        self.heads[color] == pos || self.puzzle.pairs[color].target == pos
    }

    fn empty_components_can_be_filled(&mut self) -> bool {
        let stamp = self.next_component_stamp();

        for pos in 0..self.puzzle.size {
            if self.board[pos] != -1 || self.component_visited[pos] == stamp {
                continue;
            }

            if !self.empty_component_can_be_filled(pos, stamp) {
                return false;
            }
        }

        true
    }

    fn empty_component_can_be_filled(&mut self, start: usize, stamp: u32) -> bool {
        let mut queue = Vec::with_capacity(self.puzzle.size);
        let mut read_index = 0;
        let mut terminal_masks = vec![0_u8; self.puzzle.pairs.len()];

        self.component_visited[start] = stamp;
        queue.push(start);

        while read_index < queue.len() {
            let current = queue[read_index];
            read_index += 1;

            for next in self.neighbor_positions(current).into_iter().flatten() {
                let color = self.board[next];

                if color == -1 {
                    if self.component_visited[next] != stamp {
                        self.component_visited[next] = stamp;
                        queue.push(next);
                    }
                    continue;
                }

                let color = color as usize;
                if self.complete[color] {
                    continue;
                }

                if self.heads[color] == next {
                    terminal_masks[color] |= 1;
                }

                if self.puzzle.pairs[color].target == next {
                    terminal_masks[color] |= 2;
                }
            }
        }

        terminal_masks.into_iter().any(|mask| mask == 3)
    }

    fn neighbor_positions(&self, pos: usize) -> [Option<usize>; 4] {
        let x = pos % self.puzzle.width;
        let y = pos / self.puzzle.width;

        [
            if y > 0 {
                Some(index_for(self.puzzle.width, x, y - 1))
            } else {
                None
            },
            if x + 1 < self.puzzle.width {
                Some(index_for(self.puzzle.width, x + 1, y))
            } else {
                None
            },
            if y + 1 < self.puzzle.height {
                Some(index_for(self.puzzle.width, x, y + 1))
            } else {
                None
            },
            if x > 0 {
                Some(index_for(self.puzzle.width, x - 1, y))
            } else {
                None
            },
        ]
    }

    fn next_visit_stamp(&mut self) -> u32 {
        self.visit_stamp = self.visit_stamp.wrapping_add(1);

        if self.visit_stamp == 0 {
            self.visited.fill(0);
            self.visit_stamp = 1;
        }

        self.visit_stamp
    }

    fn next_component_stamp(&mut self) -> u32 {
        self.component_stamp = self.component_stamp.wrapping_add(1);

        if self.component_stamp == 0 {
            self.component_visited.fill(0);
            self.component_stamp = 1;
        }

        self.component_stamp
    }
}

fn parse_args<I>(argv: I) -> ParsedCommand
where
    I: IntoIterator<Item = String>,
{
    let mut argv: Vec<String> = argv.into_iter().filter(|arg| arg != "--").collect();

    if matches!(argv.first(), Some(command) if command == "generate") {
        argv.remove(0);
        return parse_generate_args(argv);
    }

    parse_solve_args(argv)
}

fn parse_solve_args(argv: Vec<String>) -> ParsedCommand {
    match SolveCli::try_parse_from(std::iter::once("just solve --".to_string()).chain(argv)) {
        Ok(cli) => ParsedCommand::Command(Command::Solve(cli.into())),
        Err(error) if error.kind() == ErrorKind::DisplayHelp => {
            ParsedCommand::Help(error.to_string())
        }
        Err(error) => ParsedCommand::Error(error.to_string()),
    }
}

fn parse_generate_args(argv: Vec<String>) -> ParsedCommand {
    match GenerateCli::try_parse_from(std::iter::once("just generate --".to_string()).chain(argv)) {
        Ok(cli) => ParsedCommand::Command(Command::Generate(cli.into())),
        Err(error) if error.kind() == ErrorKind::DisplayHelp => {
            ParsedCommand::Help(error.to_string())
        }
        Err(error) => ParsedCommand::Error(error.to_string()),
    }
}

fn parse_positive_usize(value: &str) -> Result<usize, String> {
    let parsed = value
        .parse::<usize>()
        .map_err(|_| "must be a positive integer".to_string())?;

    if parsed == 0 {
        return Err("must be a positive integer".to_string());
    }

    Ok(parsed)
}

fn parse_size(value: &str) -> Result<(usize, usize), String> {
    let normalized = value.to_ascii_lowercase();

    if let Some((width, height)) = normalized.split_once('x') {
        let width = parse_positive_usize(width)?;
        let height = parse_positive_usize(height)?;
        return Ok((width, height));
    }

    let size = parse_positive_usize(&normalized)?;
    Ok((size, size))
}

impl From<SolveCli> for SolveArgs {
    fn from(cli: SolveCli) -> Self {
        Self {
            grid: cli.grid,
            file: cli.file,
            quiet: cli.quiet,
            stats: cli.stats,
            timeout_ms: cli.timeout_ms,
        }
    }
}

impl From<GenerateCli> for GenerateArgs {
    fn from(cli: GenerateCli) -> Self {
        let (width, height) = cli.size.or(cli.positional_size).unwrap_or_default();

        Self {
            width,
            height,
            pairs: cli.pairs,
            seed: cli.seed,
            attempts: cli.attempts,
            show_solution: cli.solution,
            stats: cli.stats,
            verify: !cli.no_verify,
            timeout_ms: cli.timeout_ms,
        }
    }
}

fn read_grid(args: &SolveArgs) -> Result<String, String> {
    if let Some(grid) = &args.grid {
        return Ok(grid.clone());
    }

    if let Some(file) = &args.file {
        return fs::read_to_string(file).map_err(|error| format!("{file}: {error}"));
    }

    let mut input = String::new();
    io::stdin()
        .read_to_string(&mut input)
        .map_err(|error| format!("stdin: {error}"))?;
    Ok(input)
}

fn parse_grid(input: &str) -> Result<Puzzle, String> {
    let trimmed = input.trim();

    if trimmed.is_empty() {
        return Err("Grid is empty".to_string());
    }

    let normalized = if trimmed.contains('\n') {
        trimmed.to_string()
    } else {
        trimmed
            .chars()
            .map(|cell| match cell {
                '/' | ',' | ';' => '\n',
                _ => cell,
            })
            .collect()
    };

    let rows: Vec<Vec<char>> = normalized
        .lines()
        .map(|line| line.chars().filter(|cell| !cell.is_whitespace()).collect())
        .filter(|row: &Vec<char>| !row.is_empty())
        .collect();

    if rows.is_empty() {
        return Err("Grid is empty".to_string());
    }

    let width = rows[0].len();
    if width == 0 {
        return Err("Grid has an empty first row".to_string());
    }

    let height = rows.len();
    let mut endpoints: HashMap<char, Vec<usize>> = HashMap::new();
    let mut label_order = Vec::new();

    for (y, row) in rows.iter().enumerate() {
        if row.len() != width {
            return Err(format!(
                "Grid must be rectangular. Row {} has {} cells, expected {}",
                y + 1,
                row.len(),
                width
            ));
        }

        for (x, cell) in row.iter().copied().enumerate() {
            if EMPTY_CELLS.contains(&cell) {
                continue;
            }

            if !endpoints.contains_key(&cell) {
                endpoints.insert(cell, Vec::new());
                label_order.push(cell);
            }

            endpoints
                .get_mut(&cell)
                .expect("endpoint was just inserted")
                .push(index_for(width, x, y));
        }
    }

    if label_order.is_empty() {
        return Err("Grid must contain at least one endpoint pair".to_string());
    }

    let mut pairs = Vec::with_capacity(label_order.len());

    for label in label_order {
        let positions = endpoints
            .remove(&label)
            .expect("label order should match endpoint map");

        if positions.len() != 2 {
            return Err(format!(
                "Endpoint {:?} appears {} times; expected exactly 2",
                label,
                positions.len()
            ));
        }

        pairs.push(Pair {
            label,
            start: positions[0],
            target: positions[1],
        });
    }

    Ok(Puzzle {
        width,
        height,
        size: width * height,
        pairs,
    })
}

fn solve_puzzle(puzzle: &Puzzle, timeout_ms: u64) -> Result<SolveResult, SolveError> {
    let solver = Solver::new(puzzle, timeout_ms).map_err(SolveError::Invalid)?;
    solver.solve().map_err(SolveError::Timeout)
}

fn generate_puzzle(args: &GenerateArgs) -> Result<GeneratedPuzzle, String> {
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

fn manhattan_distance(width: usize, a: usize, b: usize) -> usize {
    let ax = a % width;
    let ay = a / width;
    let bx = b % width;
    let by = b / width;

    ax.abs_diff(bx) + ay.abs_diff(by)
}

fn chebyshev_distance(width: usize, a: usize, b: usize) -> usize {
    let ax = a % width;
    let ay = a / width;
    let bx = b % width;
    let by = b / width;

    ax.abs_diff(bx).max(ay.abs_diff(by))
}

fn render_solution(puzzle: &Puzzle, paths: &[Vec<usize>]) -> Vec<String> {
    let mut cells = vec!['.'; puzzle.size];

    for (color, pair) in puzzle.pairs.iter().enumerate() {
        for pos in paths[color].iter().copied() {
            cells[pos] = pair.label;
        }
    }

    let mut rows = Vec::with_capacity(puzzle.height);

    for y in 0..puzzle.height {
        rows.push(
            cells[y * puzzle.width..(y + 1) * puzzle.width]
                .iter()
                .collect(),
        );
    }

    rows
}

fn index_for(width: usize, x: usize, y: usize) -> usize {
    y * width + x
}

fn run() -> i32 {
    let command = match parse_args(env::args().skip(1)) {
        ParsedCommand::Command(command) => command,
        ParsedCommand::Help(help) => {
            print!("{help}");
            return 0;
        }
        ParsedCommand::Error(error) => {
            eprint!("{error}");
            return 2;
        }
    };

    match command {
        Command::Solve(args) => run_solve(args),
        Command::Generate(args) => run_generate(args),
    }
}

fn run_solve(args: SolveArgs) -> i32 {
    let grid = match read_grid(&args) {
        Ok(grid) => grid,
        Err(error) => {
            eprintln!("{error}");
            return 2;
        }
    };

    let puzzle = match parse_grid(&grid) {
        Ok(puzzle) => puzzle,
        Err(error) => {
            eprintln!("{error}");
            return 2;
        }
    };

    let result = match solve_puzzle(&puzzle, args.timeout_ms) {
        Ok(result) => result,
        Err(SolveError::Timeout(error)) => {
            println!("unknown");
            eprintln!("Search exceeded {} milliseconds", error.timeout_ms);
            return 2;
        }
        Err(SolveError::Invalid(error)) => {
            eprintln!("{error}");
            return 2;
        }
    };

    if args.quiet {
        println!(
            "{}",
            if result.solved {
                "solvable"
            } else {
                "unsolvable"
            }
        );
    } else if let Some(solution) = &result.solution {
        println!("solvable");
        println!("{}", solution.join("\n"));
    } else {
        println!("unsolvable");
    }

    if args.stats {
        eprintln!(
            "nodes={} backtracks={} elapsedMs={}",
            result.stats.nodes, result.stats.backtracks, result.stats.elapsed_ms
        );
    }

    if result.solved {
        0
    } else {
        1
    }
}

fn run_generate(args: GenerateArgs) -> i32 {
    let generated = match generate_puzzle(&args) {
        Ok(generated) => generated,
        Err(error) => {
            eprintln!("{error}");
            return 2;
        }
    };

    println!("{}", generated.puzzle_rows.join("\n"));

    if args.show_solution {
        println!();
        println!("solution:");
        println!("{}", generated.solution_rows.join("\n"));
    }

    if args.stats {
        let lengths = generated
            .lengths
            .iter()
            .map(usize::to_string)
            .collect::<Vec<_>>()
            .join(",");
        eprintln!(
            "seed={} attempts={} template={} lengths={}",
            generated.seed, generated.attempts, generated.template, lengths
        );

        if let Some(stats) = generated.verification_stats {
            eprintln!(
                "verificationNodes={} verificationBacktracks={} verificationElapsedMs={}",
                stats.nodes, stats.backtracks, stats.elapsed_ms
            );
        }
    }

    0
}

fn main() {
    std::process::exit(run());
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn generated_puzzle_is_solver_verified() {
        let args = GenerateArgs {
            width: 5,
            height: 5,
            pairs: Some(5),
            seed: Some(5),
            attempts: 100,
            show_solution: false,
            stats: false,
            verify: true,
            timeout_ms: 30_000,
        };

        let generated = generate_puzzle(&args).expect("generated puzzle");
        let puzzle = parse_grid(&generated.puzzle_rows.join("\n")).expect("parse generated puzzle");
        let result = solve_puzzle(&puzzle, 30_000).expect("solve generated puzzle");

        assert!(result.solved);
    }

    #[test]
    fn generated_segments_respect_endpoint_spacing() {
        let args = GenerateArgs {
            width: 6,
            height: 6,
            pairs: Some(6),
            seed: Some(6),
            attempts: 100,
            show_solution: false,
            stats: false,
            verify: false,
            timeout_ms: 30_000,
        };

        let generated = generate_puzzle(&args).expect("generated puzzle");
        let puzzle = parse_grid(&generated.puzzle_rows.join("\n")).expect("parse generated puzzle");

        for pair in puzzle.pairs {
            assert!(chebyshev_distance(puzzle.width, pair.start, pair.target) > 1);
        }
    }
}

pub const EMPTY_CELLS: [char; 3] = ['.', '_', '-'];
pub const LABELS: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

#[derive(Clone, Copy)]
pub struct Pair {
    pub label: char,
    pub start: usize,
    pub target: usize,
}

pub struct Puzzle {
    pub width: usize,
    pub height: usize,
    pub size: usize,
    pub pairs: Vec<Pair>,
}

pub struct Stats {
    pub nodes: u64,
    pub backtracks: u64,
    pub elapsed_ms: u128,
}

pub struct SolveResult {
    pub solved: bool,
    pub solution: Option<Vec<String>>,
    pub stats: Stats,
}

pub struct SolutionCountResult {
    pub count: usize,
    pub first_solution: Option<Vec<String>>,
    pub stats: Stats,
}

#[derive(Debug)]
pub struct PuzzleTimeoutError {
    pub timeout_ms: u64,
}

#[derive(Debug)]
pub enum SolveError {
    Invalid(String),
    Timeout(PuzzleTimeoutError),
}

pub fn index_for(width: usize, x: usize, y: usize) -> usize {
    y * width + x
}

pub fn manhattan_distance(width: usize, a: usize, b: usize) -> usize {
    let ax = a % width;
    let ay = a / width;
    let bx = b % width;
    let by = b / width;

    ax.abs_diff(bx) + ay.abs_diff(by)
}

pub fn chebyshev_distance(width: usize, a: usize, b: usize) -> usize {
    let ax = a % width;
    let ay = a / width;
    let bx = b % width;
    let by = b / width;

    ax.abs_diff(bx).max(ay.abs_diff(by))
}

pub fn render_solution(puzzle: &Puzzle, paths: &[Vec<usize>]) -> Vec<String> {
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

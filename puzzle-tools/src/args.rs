#[derive(Clone)]
pub struct SolveArgs {
    pub grid: Option<String>,
    pub file: Option<String>,
    pub quiet: bool,
    pub stats: bool,
    pub timeout_ms: u64,
}

#[derive(Clone)]
pub struct GenerateArgs {
    pub width: usize,
    pub height: usize,
    pub pairs: Option<usize>,
    pub seed: Option<u64>,
    pub attempts: usize,
    pub show_solution: bool,
    pub stats: bool,
    pub verify: bool,
    pub timeout_ms: u64,
}

pub enum Command {
    Solve(SolveArgs),
    Generate(GenerateArgs),
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

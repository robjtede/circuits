use clap::{error::ErrorKind, Parser, Subcommand};

use crate::args::{Command, GenerateArgs, SolveArgs};

pub enum ParsedCommand {
    Command(Command),
    Help(String),
    Error(String),
}

#[derive(Parser)]
#[command(
    name = "puzzle-tools",
    about = "Solve and generate Flow-style endpoint puzzles.",
    subcommand_required = true,
    arg_required_else_help = true
)]
struct ToolsCli {
    #[command(subcommand)]
    command: ToolsCommand,
}

#[derive(Subcommand)]
enum ToolsCommand {
    #[command(about = "Solve a Flow-style endpoint puzzle.", after_help = GRID_FORMAT_HELP)]
    Solve(SolveCli),
    #[command(
        about = "Generate a solvable Flow-style endpoint puzzle.",
        after_help = GRID_FORMAT_HELP
    )]
    Generate(GenerateCli),
}

#[derive(Parser)]
#[command(
    name = "solve",
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
    name = "generate",
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
        default_value_t = 20_000,
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
  just generate -- 8 --pairs 8 --seed 42
  cargo run --manifest-path puzzle-tools/Cargo.toml -- solve --grid 'A...A/B...B/C...C/D...D/E...E'";

pub fn parse_args<I>(argv: I) -> ParsedCommand
where
    I: IntoIterator<Item = String>,
{
    let argv = argv.into_iter().filter(|arg| arg != "--");

    match ToolsCli::try_parse_from(std::iter::once("puzzle-tools".to_string()).chain(argv)) {
        Ok(cli) => ParsedCommand::Command(cli.into()),
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

impl From<ToolsCli> for Command {
    fn from(cli: ToolsCli) -> Self {
        cli.command.into()
    }
}

impl From<ToolsCommand> for Command {
    fn from(command: ToolsCommand) -> Self {
        match command {
            ToolsCommand::Solve(cli) => Command::Solve(cli.into()),
            ToolsCommand::Generate(cli) => Command::Generate(cli.into()),
        }
    }
}

mod args;
mod cli;
mod generator;
mod model;
mod parser;
mod solver;

use std::env;

use args::{Command, GenerateArgs, SolveArgs};
use cli::{parse_args, ParsedCommand};
use generator::generate_puzzle;
use model::SolveError;
use parser::{parse_grid, read_grid};
use solver::solve_puzzle;

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
    use crate::model::chebyshev_distance;

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

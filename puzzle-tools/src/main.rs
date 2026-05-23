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
            "seed={} attempts={} template={} lengths={} rewardScore={} longestLine={} totalBends={} averageBends={:.2}",
            generated.seed,
            generated.attempts,
            generated.template,
            lengths,
            generated.reward.score,
            generated.reward.longest_line,
            generated.reward.total_bends,
            generated.reward.average_bends()
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
    use crate::solver::count_puzzle_solutions;

    #[test]
    fn generated_puzzle_is_solver_verified() {
        let args = GenerateArgs {
            width: 5,
            height: 5,
            pairs: Some(5),
            seed: Some(5),
            attempts: 10_000,
            show_solution: false,
            stats: false,
            verify: true,
            timeout_ms: 30_000,
        };

        let generated = generate_puzzle(&args).expect("generated puzzle");
        let puzzle = parse_grid(&generated.puzzle_rows.join("\n")).expect("parse generated puzzle");
        let result = solve_puzzle(&puzzle, 30_000).expect("solve generated puzzle");
        let solution_count =
            count_puzzle_solutions(&puzzle, 2, 30_000).expect("count generated puzzle solutions");

        assert!(result.solved);
        assert_eq!(solution_count.count, 1);
    }

    #[test]
    fn generated_segments_respect_endpoint_spacing() {
        let args = GenerateArgs {
            width: 6,
            height: 6,
            pairs: Some(6),
            seed: Some(6),
            attempts: 10_000,
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

    #[test]
    fn default_square_generation_uses_balanced_path_tiling() {
        let args = GenerateArgs {
            width: 6,
            height: 6,
            pairs: None,
            seed: Some(606),
            attempts: 1_000,
            show_solution: false,
            stats: false,
            verify: false,
            timeout_ms: 30_000,
        };

        let generated = generate_puzzle(&args).expect("generated puzzle");

        assert_eq!(generated.template, "path-tiling");
        assert_eq!(generated.lengths, vec![6; 6]);
        assert_eq!(generated.reward.path_count, 6);
    }

    #[test]
    fn generated_solution_rejects_simple_artifacts() {
        let args = GenerateArgs {
            width: 10,
            height: 10,
            pairs: Some(14),
            seed: Some(42),
            attempts: 10_000,
            show_solution: false,
            stats: false,
            verify: true,
            timeout_ms: 30_000,
        };

        let generated = generate_puzzle(&args).expect("generated puzzle");

        assert!(!has_same_label_block(&generated.solution_rows));
        assert!(!is_band_heavy(&generated.solution_rows));
        assert!(generated.reward.longest_line <= 9);
        assert!(generated.reward.average_bends() >= 0.25);
    }

    fn has_same_label_block(rows: &[String]) -> bool {
        let grid = rows
            .iter()
            .map(|row| row.chars().collect::<Vec<_>>())
            .collect::<Vec<_>>();

        for y in 0..grid.len() - 1 {
            for x in 0..grid[y].len() - 1 {
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

    fn is_band_heavy(rows: &[String]) -> bool {
        let grid = rows
            .iter()
            .map(|row| row.chars().collect::<Vec<_>>())
            .collect::<Vec<_>>();
        let height = grid.len();
        let width = grid.first().map_or(0, Vec::len);
        let row_threshold = (width * 4).div_ceil(5);
        let column_threshold = (height * 4).div_ceil(5);
        let row_stripes = grid
            .iter()
            .filter(|row| max_label_count(row.iter().copied()) >= row_threshold)
            .count();
        let column_stripes = (0..width)
            .filter(|x| max_label_count((0..height).map(|y| grid[y][*x])) >= column_threshold)
            .count();

        row_stripes > height / 2 || column_stripes > width / 2
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
}

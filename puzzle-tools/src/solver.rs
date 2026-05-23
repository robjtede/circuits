use std::time::Instant;

use crate::model::{
    index_for, render_solution, Puzzle, PuzzleTimeoutError, SolutionCountResult, SolveError,
    SolveResult, Stats,
};

#[derive(Clone, Copy)]
struct Step {
    pos: usize,
    target: bool,
}

struct Choice {
    color: usize,
    moves: Vec<Step>,
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

    fn count_solutions(
        mut self,
        solution_limit: usize,
    ) -> Result<SolutionCountResult, PuzzleTimeoutError> {
        let empty_count = self.puzzle.size - self.puzzle.pairs.len() * 2;
        let started_at = Instant::now();
        let mut first_solution = None;
        let count = self.search_count(empty_count, solution_limit, &mut first_solution)?;
        self.stats.elapsed_ms = started_at.elapsed().as_millis();

        Ok(SolutionCountResult {
            count,
            first_solution,
            stats: self.stats,
        })
    }

    fn search(&mut self, current_empty_count: usize) -> Result<bool, PuzzleTimeoutError> {
        self.stats.nodes += 1;

        self.check_timeout()?;

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

    fn search_count(
        &mut self,
        current_empty_count: usize,
        solution_limit: usize,
        first_solution: &mut Option<Vec<String>>,
    ) -> Result<usize, PuzzleTimeoutError> {
        self.stats.nodes += 1;

        self.check_timeout()?;

        if self.incomplete_count == 0 {
            if current_empty_count == 0 {
                if first_solution.is_none() {
                    *first_solution = Some(render_solution(self.puzzle, &self.paths));
                }

                return Ok(1);
            }

            return Ok(0);
        }

        if !self.passes_pruning(current_empty_count) {
            return Ok(0);
        }

        let Some(choice) = self.choose_color(current_empty_count) else {
            return Ok(0);
        };

        let mut solution_count = 0;

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

            solution_count +=
                self.search_count(next_empty_count, solution_limit, first_solution)?;

            if step.target {
                self.complete[choice.color] = false;
                self.incomplete_count += 1;
            } else {
                self.board[step.pos] = -1;
            }

            self.paths[choice.color].pop();
            self.heads[choice.color] = previous_head;

            if solution_count >= solution_limit {
                return Ok(solution_count);
            }

            self.stats.backtracks += 1;
        }

        Ok(solution_count)
    }

    fn check_timeout(&self) -> Result<(), PuzzleTimeoutError> {
        if (self.stats.nodes & 1023) != 0 {
            return Ok(());
        }

        if let Some(deadline) = self.deadline {
            if Instant::now() > deadline {
                return Err(PuzzleTimeoutError {
                    timeout_ms: self.timeout_ms,
                });
            }
        }

        Ok(())
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

pub fn solve_puzzle(puzzle: &Puzzle, timeout_ms: u64) -> Result<SolveResult, SolveError> {
    let solver = Solver::new(puzzle, timeout_ms).map_err(SolveError::Invalid)?;
    solver.solve().map_err(SolveError::Timeout)
}

pub fn count_puzzle_solutions(
    puzzle: &Puzzle,
    solution_limit: usize,
    timeout_ms: u64,
) -> Result<SolutionCountResult, SolveError> {
    let solver = Solver::new(puzzle, timeout_ms).map_err(SolveError::Invalid)?;
    solver
        .count_solutions(solution_limit)
        .map_err(SolveError::Timeout)
}

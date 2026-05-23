use std::collections::HashMap;
use std::fs;
use std::io::{self, Read};

use crate::args::SolveArgs;
use crate::model::{index_for, Pair, Puzzle, EMPTY_CELLS};

pub fn read_grid(args: &SolveArgs) -> Result<String, String> {
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

pub fn parse_grid(input: &str) -> Result<Puzzle, String> {
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

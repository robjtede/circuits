## Circuits

A small canvas-based Circuits game.

### Development

Install dependencies:

```sh
npm install
```

Start the local dev server:

```sh
npm run dev
```

Create a production build:

```sh
npm run build
```

### Puzzle Tools

Check whether a potential grid is solvable:

```sh
just solve -- --grid 'A...A/B...B/C...C/D...D/E...E'
```

Generate a solvable grid:

```sh
just generate -- 8 --pairs 8 --seed 42
```

The solver/generator is a Rust Cargo project in `puzzle-tools/`.
The `just solve` and `just generate` recipes run it with `cargo run --release`,
so Cargo handles
rebuilds and caches the optimized binary under `puzzle-tools/target/`.

Grid rules:

- Each endpoint label must appear exactly twice.
- Empty cells are `.`, `_`, or `-`.
- Rows can be separated by newlines, `/`, commas, or semicolons.
- Whitespace is ignored.

You can also pass a file or pipe a grid through stdin:

```sh
just solve -- puzzles/candidate.txt
just solve -- --quiet < puzzles/candidate.txt
```

Exit code `0` means solvable, `1` means unsolvable, and `2` means invalid input or
the search timed out. Use `--timeout-ms 0` to disable the default 30 second timeout.

Generated puzzles are built from complete solution paths, enforce non-adjacent
endpoints, and are solver-verified by default. Use `--solution` to print the
generated full solution, or `--no-verify` to skip the solver check.

Build the container image:

```sh
docker build -t circuits .
```

Run the container locally:

```sh
docker run --rm -p 8080:80 circuits
```

### Known Issues

- Mouse/touch events need re-factoring

### To start

- Modularization
- Handle window resize
- Level design/creator tool
- Database system
- Check amount of circuits completed
- Assume straight line behavior

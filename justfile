_list:
    @just --list

fmt:
    just --unstable --fmt
    npm run format
    cargo fmt --manifest-path puzzle-solver/Cargo.toml

solve *args:
    cargo run --quiet --release --manifest-path puzzle-solver/Cargo.toml -- {{ args }}

generate *args:
    cargo run --quiet --release --manifest-path puzzle-solver/Cargo.toml -- generate {{ args }}

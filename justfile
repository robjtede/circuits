_list:
    @just --list

fmt:
    just --unstable --fmt
    npm run format
    cargo fmt --manifest-path puzzle-tools/Cargo.toml

solve *args:
    cargo run --quiet --release --manifest-path puzzle-tools/Cargo.toml -- solve {{ args }}

generate *args:
    cargo run --quiet --release --manifest-path puzzle-tools/Cargo.toml -- generate {{ args }}

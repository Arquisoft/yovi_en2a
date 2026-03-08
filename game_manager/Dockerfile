# Use a Rust base image for compilation
FROM rust:bookworm AS builder

# Trabajamos en una carpeta genérica primero
WORKDIR /app/game_manager


# Copiamos el código de 'game_manager'
COPY Cargo.toml Cargo.lock ./
COPY .secrets/ ./.secrets/
COPY src/ ./src/

RUN cargo build --release

# --- Stage final ---
FROM debian:trixie-slim

WORKDIR /app/game_manager

RUN apt-get update && \
    apt-get install -y ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Copy the compiled binary from the builder stage
COPY --from=builder /app/game_manager/target/release/game_manager .

EXPOSE 5000

CMD ["./game_manager", "--mode", "server", "--port", "5000"]

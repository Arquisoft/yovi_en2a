# Use a Rust base image for compilation
FROM rust:bookworm AS builder

# Nos ponemos en una carpeta de trabajo general
WORKDIR /app

# 1. Copiamos la dependencia 'gamey' desde la raíz hacia adentro
COPY gamey ./gamey

# 2. Copiamos todo el código de 'game_manager' desde la raíz hacia adentro
COPY game_manager ./game_manager

# 3. Entramos específicamente a la carpeta del game_manager para compilar
WORKDIR /app/game_manager

# Build the application (ahora encontrará ../gamey sin problema)
RUN cargo build --release

# Use a minimal image for the final stage
FROM debian:bookworm-slim

WORKDIR /app/game_manager

RUN apt-get update && \
    apt-get install -y ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Copy the compiled binary from the builder stage
COPY --from=builder /app/game_manager/target/release/game_manager .

# Expose the port game_manager will listen on
EXPOSE 5000

# Run the game_manager server
CMD ["./game_manager"]
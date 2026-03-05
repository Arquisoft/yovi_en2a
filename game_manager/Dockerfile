FROM rust:latest AS builder

WORKDIR /app/game_manager

# Copy Cargo.toml and Cargo.lock
COPY Cargo.toml Cargo.lock ./
COPY src/ ./src/

# Build the application
RUN cargo build --release

# Use a minimal image for the final stage
FROM debian:bookworm-slim

WORKDIR /app/game_manager

# Copy the compiled binary from the builder stage
COPY --from=builder /app/game_manager/target/release/game_manager .

# Expose the port game_manager will listen on
EXPOSE 5000

# Run the game_manager server on port 5000
CMD ["./game_manager", "--mode", "server", "--port", "5000"]
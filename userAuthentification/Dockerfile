# Use a Rust base image for compilation
FROM rust:latest AS builder

WORKDIR /app/userAuthentification

# Copy Cargo.toml and Cargo.lock
COPY Cargo.toml Cargo.lock ./
COPY src/ ./src/

# Build the application
RUN cargo build --release

# Use a minimal image for the final stage
FROM debian:bookworm-slim

WORKDIR /app/userAuthentification

# Copy the compiled binary from the builder stage
COPY --from=builder /app/userAuthentification/target/release/userAuthentification .

# Expose the port userAuthentification will listen on
EXPOSE 4001

# Run the userAuthentification server on port 4000
CMD ["./userAuthentification", "--mode", "server", "--port", "4001"]

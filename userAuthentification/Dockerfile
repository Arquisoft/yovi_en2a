# Cambiamos rust:latest por rust:bookworm para emparejar la versión de GLIBC
FROM rust:bookworm AS builder

WORKDIR /app/userAuthentification

# Copy Cargo.toml and Cargo.lock
COPY Cargo.toml Cargo.lock ./
COPY src/ ./src/

# Build the application
RUN cargo build --release

# Use a minimal image for the final stage (misma familia que el builder)
# Use a minimal image for the final stage
FROM debian:bookworm-slim

WORKDIR /app/userAuthentification

# ---> LA SOLUCIÓN: Instalamos los certificados raíz y limpiamos la caché <---
RUN apt-get update && \
    apt-get install -y ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Copy the compiled binary from the builder stage
COPY --from=builder /app/userAuthentification/target/release/userAuthentification .

# Copy the entrypoint script that decodes Firebase credentials from env var
COPY entrypoint.sh /entrypoint.sh
RUN sed -i 's/\r$//' /entrypoint.sh && chmod +x /entrypoint.sh

# Expose the port userAuthentification will listen on
EXPOSE 4001

ENTRYPOINT ["/entrypoint.sh"]
# Run the userAuthentification server
CMD ["./userAuthentification", "--mode", "server", "--port", "4001"]
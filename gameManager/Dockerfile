# ---------- Build stage ----------
FROM rust:1.76 as builder

WORKDIR /app
COPY . .

RUN cargo build --release

# ---------- Runtime ----------
FROM debian:bookworm-slim

WORKDIR /app

COPY --from=builder /app/target/release/gameManager /usr/local/bin/gameManager

EXPOSE 5000

CMD ["gameManager"]
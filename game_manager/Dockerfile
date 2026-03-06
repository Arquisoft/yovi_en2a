FROM rust:latest AS builder

# Trabajamos en una carpeta genérica primero
WORKDIR /app

# Copiamos la dependencia local 'gamey' al contenedor
COPY gamey ./gamey

# Copiamos el código de 'game_manager'
COPY game_manager ./game_manager

# Nos movemos a la carpeta de game_manager para compilar
WORKDIR /app/game_manager

# Ahora Cargo podrá encontrar ../gamey porque lo acabamos de copiar
RUN cargo build --release

# --- Stage final ---
FROM debian:trixie-slim

WORKDIR /app/game_manager

# Copiamos el binario desde la fase builder
COPY --from=builder /app/game_manager/target/release/game_manager .

EXPOSE 5000

CMD ["./game_manager", "--mode", "server", "--port", "5000"]
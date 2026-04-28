# yovi_en2a — GameY at UniOvi

[Deployment Link](https://20-250-221-153.sslip.io)

[![Release — Test, Build, Publish, Deploy](https://github.com/arquisoft/yovi_en2a/actions/workflows/release-deploy.yml/badge.svg)](https://github.com/arquisoft/yovi_en2a/actions/workflows/release-deploy.yml)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=Arquisoft_yovi_en2a&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=Arquisoft_yovi_en2a)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=Arquisoft_yovi_en2a&metric=coverage)](https://sonarcloud.io/summary/new_code?id=Arquisoft_yovi_en2a)

A full-stack web implementation of the **Game of Y**, a connection game played on a triangular board. The system supports human vs. human play, three different AI opponents (Random, Greedy and Minimax with iterative deepening), the standard variant and the misère variant ("Why Not"), persistent match history, ELO-based global rankings and per-user statistics.

## 👥 Group Members

| Name | 🌐 GitHub Profile | 📧 Contact Email |
|--------------|--------|-----------|
| Jaime Alonso Fernández | <a href="https://github.com/megastacks13"><img src="https://img.shields.io/badge/Jaime%20Alonso-blue"></a> | UO294024@uniovi.es |
| Pelayo Pérez Cueto | <a href="https://github.com/PelayoPerez"><img src="https://img.shields.io/badge/Pelayo%20Pérez-yellow"></a> | UO295426@uniovi.es |
| Ana Calleja Ramón | <a href="https://github.com/AnaCR22"><img src="https://img.shields.io/badge/Ana%20Calleja-purple"></a> | UO300568@uniovi.es |
| Matías Valle Trapiella | <a href="https://github.com/uo300652"><img src="https://img.shields.io/badge/Matías%20Valle-darkgreen"></a> | UO300652@uniovi.es |

## Project Structure

| Directory | Stack | Responsibility |
|-----------|-------|----------------|
| `webapp/` | React 18 + Vite + TypeScript | Single-page app: lobby, board, rankings, settings, e2e tests |
| `users/` | Node.js + Express | API gateway: sessions in Redis, CSRF, auth proxy, game proxy, Prometheus metrics |
| `userAuthentification/` | Rust + Axum | Auth engine: register / login / username update with Argon2 hashes in Firestore |
| `game_manager/` | Rust + Axum | Match orchestrator: creates matches, validates moves through `gamey`, persists results to Firestore, serves rankings |
| `gamey/` | Rust + Axum | Pure game engine: rules, three bots, YEN notation, CLI and HTTP modes |
| `docs/` | AsciiDoc (Arc42) | Architecture documentation following the Arc42 template |
| `docker-compose.yml` | Docker Compose | One-command deploy of every service plus Redis, Prometheus and Grafana |

## Core Features

### Gameplay
- **Standard Y:** connect all three sides of the triangle to win.
- **Why Not (misère):** exact same mechanics, but the player who completes the connection **loses**.
- **Local multiplayer:** two humans on the same screen.
- **vs Bot:** three AIs of increasing strength — `random_bot`, `greedy_bot`, `minimax_bot` (with iterative deepening / time-bounded auto mode).
- **Online public:** two humans on different screen not knowing each other
- **Online private:** two humans on different screen knowing each other

### Accounts and Persistence
- **Argon2-hashed passwords** stored in Firestore.
- **Server-side sessions** stored in Redis (30 min TTL, sliding expiry on `/api/me`).
- **CSRF protection** via the double-submit-cookie pattern on every mutating request.
- **Match history** persisted per user, replayable from the rankings menu.
- **Global rankings** by ELO, wins, fewest losses, and fastest game; fed by `update_score` after every finished match.

### Ops
- HTTPS with automatic Let's Encrypt certificate renewal in the production webapp image.
- Prometheus metrics on every gateway request via `express-prom-bundle`.
- Pre-provisioned Grafana dashboard included under `users/monitoring/grafana`.
- GitHub Actions release pipeline: lint → test → SonarCloud → Docker image build → push to GHCR → deploy.

## Running the Project

### With Docker (recommended)

You need [Docker](https://www.docker.com/) and Docker Compose. From the project root:

```bash
# Required for Firestore-backed services
export FIREBASE_PROJECT_ID="your-firebase-project"
export FIREBASE_CREDENTIALS_B64="$(base64 -w0 /path/to/serviceAccountKey.json)"
export DEPLOY_HOST="localhost"   # or your domain in production

docker-compose up --build
```

Once it boots:
- Webapp: <http://localhost> (port 80) / <https://localhost> (port 443)
- Users gateway / OpenAPI docs: <http://localhost:3000/api-docs>
- Game manager: internal only, exposed at `:5000` on the `monitor-net` network
- Gamey engine: internal only on `:4000`
- Auth engine: internal only on `:4001`
- Prometheus: <http://localhost:9090>
- Grafana: <http://localhost:9091>

### Without Docker

Each component is independent. You will need Node.js 22+ and a recent Rust toolchain.

```bash
# 1. Auth engine
cd userAuthentification && cargo run

# 2. Gamey engine (HTTP mode on :4000)
cd gamey && cargo run -- --mode server --port 4000

# 3. Game manager
cd game_manager && cargo run

# 4. Users API gateway (also needs a local Redis)
cd users && npm install && npm start

# 5. Webapp
cd webapp && npm install && npm run dev
# → http://localhost:5173
```

## Available Scripts

### Webapp (`webapp/package.json`)
- `npm run dev` — Vite dev server on `:5173`.
- `npm run build` — type-check then build the production bundle.
- `npm test` / `npm run test:coverage` — Vitest unit tests with coverage.
- `npm run test:e2e` — boots the webapp + the users service and runs the Cucumber/Playwright e2e suite.
- `npm run start:all` — dev convenience: starts both webapp and users service in parallel.

### Users (`users/package.json`)
- `npm start` — start the API gateway on `:3000`.
- `npm test` / `npm run test:coverage` — Vitest unit tests.

### Gamey (`gamey/Cargo.toml`)
- `cargo run -- --mode human` — two humans at the terminal.
- `cargo run -- --mode computer --bot minimax_bot` — play against a bot.
- `cargo run -- --mode server --port 4000` — start the HTTP API.
- `cargo test` — unit, integration and property-based tests (proptest).
- `cargo bench` — Criterion benchmarks for the game engine.
- `cargo doc --open` — render the API docs.

### Game Manager (`game_manager/Cargo.toml`)
- `cargo run` — start the orchestrator on `:5000`.
- `cargo test` — includes integration tests against a live Firestore project (`ranking_integration_tests.rs`).

### Auth Engine (`userAuthentification/Cargo.toml`)
- `cargo run` — start the auth REST API on `:4001`.
- `cargo test` — unit tests for hashing, login flow and Firestore wrappers.

## Deeper Documentation

For a granular walkthrough see the [official documentation](https://arquisoft.github.io/yovi_en2a/) or explore the 
interactive API reference at [https://20-250-221-153.sslip.io/api-docs/](https://20-250-221-153.sslip.io/api-docs/).

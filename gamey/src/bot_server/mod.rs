//! HTTP server for Y game bots.
//!
//! This module provides an Axum-based REST API for querying Y game bots.
//! The server exposes endpoints for checking bot status and requesting moves.
//!
//! # Endpoints
//! - `GET /status` - Health check endpoint
//! - `POST /{api_version}/ybot/choose/{bot_id}` - Request a move from a bot
//!
//! # Example
//! ```no_run
//! use gamey::run_bot_server;
//!
//! #[tokio::main]
//! async fn main() {
//!     if let Err(e) = run_bot_server(3000).await {
//!         eprintln!("Server error: {}", e);
//!     }
//! }
//! ```

pub mod choose;
pub mod error;
pub mod state;
pub mod version;
mod req_res_formats;
mod play;

use axum::response::IntoResponse;
use std::sync::Arc;
pub use choose::MoveResponse;
pub use error::ErrorResponse;
pub use version::*;
use axum::{Json, http::StatusCode};

use crate::{GameYError, RandomBot, GreedyBot, MinimaxBot, YBotRegistry, state::AppState, YEN, Coordinates, Movement, PlayerId, GameY};
use crate::bot_server::req_res_formats::{ProcessMoveRequest, ProcessMoveResponse};

/// Creates the Axum router with the given state.
///
/// This is useful for testing the API without binding to a network port.
pub fn create_router(state: AppState) -> axum::Router {
    axum::Router::new()
        .route("/status", axum::routing::get(status))
        .route(
            "/{api_version}/ybot/choose/{bot_id}",
            axum::routing::post(choose::choose),
        )
        .route(
            "/{api_version}/ybot/player_play/{bot_id}",
            axum::routing::post(play::player_play),
        )
        .route("/engine/move", axum::routing::post(process_move))
        .route(
            "/play/{bot_id}",
            axum::routing::get(play::play_get),
        )
        .with_state(state)
}

/// Creates the default application state with the standard bot registry.
///
/// The default state includes the `RandomBot` which selects moves randomly.
pub fn create_default_state() -> AppState {
    let bots = YBotRegistry::new()
    .with_bot(Arc::new(RandomBot))
    .with_bot(Arc::new(GreedyBot))
    .with_bot(Arc::new(MinimaxBot::new(-1)));
    AppState::new(bots)
}

/// Starts the bot server on the specified port.
///
/// This function blocks until the server is shut down.
///
/// # Arguments
/// * `port` - The TCP port to listen on
///
/// # Errors
/// Returns `GameYError::ServerError` if:
/// - The TCP port cannot be bound (e.g., port already in use, permission denied)
/// - The server encounters an error while running
pub async fn run_bot_server(port: u16) -> Result<(), GameYError> {
    let state = create_default_state();
    let app = create_router(state);

    let addr = format!("0.0.0.0:{}", port);
    let listener = tokio::net::TcpListener::bind(&addr)
        .await
        .map_err(|e| GameYError::ServerError {
            message: format!("Failed to bind to {}: {}", addr, e),
        })?;

    println!("Server mode: Listening on http://{}", addr);
    axum::serve(listener, app)
        .await
        .map_err(|e| GameYError::ServerError {
            message: format!("Server error: {}", e),
        })?;

    Ok(())
}

/// Health check endpoint handler.
///
/// Returns "OK" to indicate the server is running.
pub async fn status() -> impl IntoResponse {
    "OK"
}


pub async fn process_move(
    Json(payload): Json<ProcessMoveRequest>,
) -> Result<Json<ProcessMoveResponse>, (StatusCode, String)> {

    // 1. Rehidratar el motor desde el YEN recibido
    let mut game = GameY::try_from(payload.state.clone())
        .map_err(|e| (StatusCode::BAD_REQUEST, format!("Estado inválido: {:?}", e)))?;

    game.force_turn(PlayerId::new(payload.state.turn()));

    // 2. Construir el movimiento
    let coords = Coordinates::new(payload.x, payload.y, payload.z);
    let mv = Movement::Placement {
        player: game.next_player().unwrap(),
        coords,
    };

    // 3. Validar turno y añadir movimiento
    game.check_player_turn(&mv)
        .map_err(|e| (StatusCode::FORBIDDEN, format!("{}", e)))?;

    game.add_move(mv)
        .map_err(|e| (StatusCode::BAD_REQUEST, format!("Movimiento ilegal: {:?}", e)))?;

    // 4. Comprobar si terminó y preparar respuesta
    let game_over = game.check_game_over();
    let new_yen: YEN = (&game).into();

    Ok(Json(ProcessMoveResponse {
        new_yen_json: new_yen,
        game_over
    }))
}



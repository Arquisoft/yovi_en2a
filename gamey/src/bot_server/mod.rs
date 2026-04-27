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
pub mod play;

use axum::response::IntoResponse;
use std::sync::Arc;
pub use choose::MoveResponse;
pub use error::ErrorResponse;
pub use version::*;
use axum::{Json, http::StatusCode};

use crate::{GameYError, GameVariant, RandomBot, GreedyBot, MinimaxBot, YBotRegistry, state::AppState, YEN, Coordinates, Movement, PlayerId, GameY};
use crate::bot_server::req_res_formats::{ProcessMoveRequest, ProcessMoveResponse, InitGameRequest, InitGameResponse};

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
        .route("/play", axum::routing::get(play::play_get))
        .route("/engine/init", axum::routing::post(init_game))
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


pub async fn init_game(
    Json(payload): Json<InitGameRequest>,
) -> Result<Json<InitGameResponse>, (StatusCode, String)> {
    let game = match payload.variant.as_deref() {
        Some("holey_y") => {
            let count = payload.hole_count.unwrap_or((payload.size / 3).max(1));
            GameY::new_holey(payload.size, count)
                .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?
        }
        v => {
            let variant = match v.unwrap_or("") {
                "why_not"   => GameVariant::WhyNot,
                "master_y"  => GameVariant::MasterY,
                "fortune_y" => GameVariant::FortuneY,
                "tabu_y"    => GameVariant::TabuY,
                _           => GameVariant::Standard,
            };
            GameY::new_with_variant(payload.size, variant)
        }
    };
    let hole_cells = game.hole_indices();
    let yen: YEN = (&game).into();
    Ok(Json(InitGameResponse { yen, hole_cells }))
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
    let hole_cells = game.hole_indices();
    let blocked_cells = if game.variant() == GameVariant::TabuY {
        GameY::neighbor_indices(coords, game.board_size())
    } else {
        Vec::new()
    };
    let new_yen: YEN = (&game).into();

    Ok(Json(ProcessMoveResponse {
        new_yen_json: new_yen,
        game_over,
        hole_cells,
        blocked_cells,
    }))
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::body::Body;
    use axum::http::{Method, Request, StatusCode};
    use http_body_util::BodyExt;
    use tower::ServiceExt;

    async fn call(app: axum::Router, method: Method, uri: &str, body: &str) -> (StatusCode, String) {
        let req = Request::builder()
            .method(method)
            .uri(uri)
            .header("content-type", "application/json")
            .body(Body::from(body.to_owned()))
            .unwrap();
        let resp = app.oneshot(req).await.unwrap();
        let status = resp.status();
        let bytes = resp.into_body().collect().await.unwrap().to_bytes();
        (status, String::from_utf8_lossy(&bytes).into_owned())
    }

    #[test]
    fn test_create_default_state_has_all_bots() {
        let state = create_default_state();
        let names = state.bots().names();
        assert!(names.iter().any(|n| n == "random_bot"));
        assert!(names.iter().any(|n| n == "greedy_bot"));
        assert!(names.iter().any(|n| n == "minimax_bot"));
    }

    #[tokio::test]
    async fn test_status_returns_ok() {
        let app = create_router(create_default_state());
        let (status, body) = call(app, Method::GET, "/status", "").await;
        assert_eq!(status, StatusCode::OK);
        assert_eq!(body, "OK");
    }

    #[tokio::test]
    async fn test_init_game_standard() {
        let app = create_router(create_default_state());
        let (status, body) = call(app, Method::POST, "/engine/init", r#"{"size": 3}"#).await;
        assert_eq!(status, StatusCode::OK);
        let json: serde_json::Value = serde_json::from_str(&body).unwrap();
        assert_eq!(json["yen"]["size"], 3);
        assert_eq!(json["hole_cells"], serde_json::json!([]));
    }

    #[tokio::test]
    async fn test_init_game_why_not_variant() {
        let app = create_router(create_default_state());
        let (status, body) = call(
            app, Method::POST, "/engine/init",
            r#"{"size": 3, "variant": "why_not"}"#,
        ).await;
        assert_eq!(status, StatusCode::OK);
        let json: serde_json::Value = serde_json::from_str(&body).unwrap();
        assert_eq!(json["yen"]["variant"], "why_not");
    }

    #[tokio::test]
    async fn test_init_game_holey_y_with_count() {
        let app = create_router(create_default_state());
        let (status, body) = call(
            app, Method::POST, "/engine/init",
            r#"{"size": 5, "variant": "holey_y", "hole_count": 2}"#,
        ).await;
        assert_eq!(status, StatusCode::OK);
        let json: serde_json::Value = serde_json::from_str(&body).unwrap();
        assert!(json["hole_cells"].is_array());
        assert!(json["hole_cells"].as_array().unwrap().len() <= 2);
    }

    #[tokio::test]
    async fn test_init_game_holey_y_default_count() {
        let app = create_router(create_default_state());
        let (status, _) = call(
            app, Method::POST, "/engine/init",
            r#"{"size": 6, "variant": "holey_y"}"#,
        ).await;
        assert_eq!(status, StatusCode::OK);
    }

    #[tokio::test]
    async fn test_process_move_valid_placement() {
        let app = create_router(create_default_state());
        // Empty size-3 board, P0 places at (0,0,2) – bottom-left corner
        let body = serde_json::json!({
            "state": {"size": 3, "turn": 0, "players": ["B","R"], "layout": "./../..."},
            "x": 0, "y": 0, "z": 2
        }).to_string();
        let (status, resp) = call(app, Method::POST, "/engine/move", &body).await;
        assert_eq!(status, StatusCode::OK);
        let json: serde_json::Value = serde_json::from_str(&resp).unwrap();
        assert!(json["new_yen_json"].is_object());
        assert!(json["game_over"].is_boolean());
        assert_eq!(json["hole_cells"], serde_json::json!([]));
        assert_eq!(json["blocked_cells"], serde_json::json!([]));
    }

    #[tokio::test]
    async fn test_process_move_occupied_cell_returns_400() {
        let app = create_router(create_default_state());
        // B already at (2,0,0) in "B/../..." layout; try to place there again
        let body = serde_json::json!({
            "state": {"size": 3, "turn": 0, "players": ["B","R"], "layout": "B/../..."},
            "x": 2, "y": 0, "z": 0
        }).to_string();
        let (status, _) = call(app, Method::POST, "/engine/move", &body).await;
        assert_eq!(status, StatusCode::BAD_REQUEST);
    }

    #[tokio::test]
    async fn test_process_move_invalid_yen_returns_400() {
        let app = create_router(create_default_state());
        // Only 2 rows for a size-3 board → invalid layout
        let body = serde_json::json!({
            "state": {"size": 3, "turn": 0, "players": ["B","R"], "layout": "./../.."},
            "x": 0, "y": 0, "z": 2
        }).to_string();
        let (status, _) = call(app, Method::POST, "/engine/move", &body).await;
        assert_eq!(status, StatusCode::BAD_REQUEST);
    }

    #[tokio::test]
    async fn test_process_move_tabu_y_returns_blocked_cells() {
        let app = create_router(create_default_state());
        // Empty size-3 board with tabu_y; place at (0,2,0)
        // Neighbors: (1,1,0) → idx 2, (0,1,1) → idx 4
        let body = serde_json::json!({
            "state": {"size": 3, "turn": 0, "players": ["B","R"], "layout": "./../...", "variant": "tabu_y"},
            "x": 0, "y": 2, "z": 0
        }).to_string();
        let (status, resp) = call(app, Method::POST, "/engine/move", &body).await;
        assert_eq!(status, StatusCode::OK);
        let json: serde_json::Value = serde_json::from_str(&resp).unwrap();
        let blocked = json["blocked_cells"].as_array().unwrap();
        assert!(!blocked.is_empty(), "tabu_y move must return non-empty blocked_cells");
    }
}



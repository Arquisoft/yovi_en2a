// tests/api_rest_tests.rs
//
// Integration tests for src/api_rest.rs
//
// Add to Cargo.toml:
// [dev-dependencies]
// axum-test = "15"
// tokio = { version = "1", features = ["full"] }
// serde_json = "1"
// mockito = "1"
// uuid = { version = "1", features = ["v4"] }

use axum::{
    http::{StatusCode},
};
use axum_test::{TestResponse, TestServer};
use serde_json::{json, Value};
use std::sync::Arc;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/// Spins up a test router wired to a real (local) Redis and a mock HTTP server
/// that stands in for the Gamey engine.
///
/// Requires:
///   - A Redis instance reachable at 127.0.0.1:6379  (or override via env vars
///     REDIS_HOST / REDIS_PORT before running the suite).
///   - The `mockito` crate to intercept outbound HTTP calls to Gamey.
async fn build_test_server(mock_gamey_url: &str) -> TestServer {
    use game_manager::api_rest::AppState;
    use game_manager::redis_client;
    use game_manager::api_rest::{
        create_match, execute_move, request_bot_move,
        get_local_rankings, get_best_times, update_user_score, save_match,
    };
    use axum::{routing::{post, get}, Router};

    let redis_host = std::env::var("REDIS_HOST").unwrap_or_else(|_| "127.0.0.1".to_string());
    let redis_port = std::env::var("REDIS_PORT").unwrap_or_else(|_| "6379".to_string());
    let redis_url  = format!("redis://{}:{}/", redis_host, redis_port);
    let pool       = redis_client::create_pool(&redis_url).await;

    let state = Arc::new(AppState {
        redis_pool: pool,
        gamey_url:  mock_gamey_url.to_string(),
    });

    let app = Router::new()
        .route("/new",          post(create_match))
        .route("/executeMove",  post(execute_move))
        .route("/reqBotMove",   post(request_bot_move))
        .route("/localRankings",post(get_local_rankings))
        .route("/bestTimes",    get(get_best_times))
        .route("/updateScore",  post(update_user_score))
        .route("/saveMatch",    post(save_match))
        .with_state(state);

    TestServer::new(app)
}

// ---------------------------------------------------------------------------
// /new  –  create_match
// ---------------------------------------------------------------------------

#[tokio::test]
async fn test_create_match_returns_uuid() {
    let server: TestServer = build_test_server("http://unused").await;

    let resp:TestResponse = server
        .post("/new")
        .json(&json!({
            "size": 5,
            "player1": "alice",
            "player2": "bob"
        }))
        .await;

    assert_eq!(resp.status_code(), StatusCode::OK);

    let body: Value = resp.json();
    let match_id = body["match_id"].as_str().expect("match_id missing");

    // Must be a valid UUID v4
    uuid::Uuid::parse_str(match_id).expect("match_id is not a valid UUID");
}

#[tokio::test]
async fn test_create_match_ids_are_unique() {
    let server:TestServer = build_test_server("http://unused").await;

    let payload = json!({ "size": 5, "player1": "alice", "player2": "bob" });

    let id1: Value = server.post("/new").json(&payload).await.json();
    let id2: Value = server.post("/new").json(&payload).await.json();

    assert_ne!(id1["match_id"], id2["match_id"]);
}

// ---------------------------------------------------------------------------
// /executeMove  –  execute_move
// ---------------------------------------------------------------------------

#[tokio::test]
async fn test_execute_move_unknown_match_returns_404() {
    let server:TestServer = build_test_server("http://unused").await;

    let resp = server
        .post("/executeMove")
        .json(&json!({
            "match_id": "non-existent-id",
            "coord_x": 0,
            "coord_y": 0,
            "coord_z": 0
        }))
        .await;

    assert_eq!(resp.status_code(), StatusCode::NOT_FOUND);
}

// ---------------------------------------------------------------------------
// /updateScore  –  update_user_score
// ---------------------------------------------------------------------------

/// This test calls the real Firebase helper.  Mark it `#[ignore]` if you do
/// not want live Firebase calls in CI.
#[tokio::test]
#[ignore = "requires live Firebase credentials"]
async fn test_update_score_success() {
    let server:TestServer = build_test_server("http://unused").await;

    let resp = server
        .post("/updateScore")
        .json(&json!({
            "playerid":  "test-player-123",
            "username":  "TestUser",
            "is_win":    true,
            "time":      42
        }))
        .await;

    assert_eq!(resp.status_code(), StatusCode::OK);

    let body: Value = resp.json();
    assert!(body["message"]
        .as_str()
        .unwrap_or("")
        .to_lowercase()
        .contains("updated"));
}

// ---------------------------------------------------------------------------
// /saveMatch  –  save_match
// ---------------------------------------------------------------------------

#[tokio::test]
async fn test_save_match_unknown_match_returns_404() {
    let server:TestServer = build_test_server("http://unused").await;

    let resp = server
        .post("/saveMatch")
        .json(&json!({
            "match_id":  "ghost-match",
            "player1id": "alice",
            "player2id": "bot",
            "result":    "player1",
            "time":      120
        }))
        .await;

    assert_eq!(resp.status_code(), StatusCode::NOT_FOUND);
}

// ---------------------------------------------------------------------------
// get_gamey_url helper
// ---------------------------------------------------------------------------

#[test]
fn test_get_gamey_url_from_env() {
    unsafe { std::env::set_var("GAMEY", "engine-host"); }
    let url = game_manager::api_rest::get_gamey_url();
    assert_eq!(url, "http://engine-host:4000");
    unsafe { std::env::remove_var("GAMEY"); }
}
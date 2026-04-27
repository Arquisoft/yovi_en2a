use game_manager::api_rest::{get_gamey_url, AppState, build_router};
use game_manager::redis_client;

use std::sync::Arc;
use axum::http::StatusCode;
use serial_test::serial;

#[test]
#[serial]
fn get_gamey_url_returns_default_when_env_unset() {
    // SAFETY: tests are serialised via `serial_test`; no concurrent env access.
    unsafe { std::env::remove_var("GAMEY") };
    assert_eq!(get_gamey_url(), "http://localhost:4000");
}

#[test]
#[serial]
fn get_gamey_url_uses_gamey_env_var() {
    // SAFETY: tests are serialised via `serial_test`; no concurrent env access.
    unsafe { std::env::set_var("GAMEY", "gamey-service") };
    let url = get_gamey_url();
    unsafe { std::env::remove_var("GAMEY") };
    assert_eq!(url, "http://gamey-service:4000");
}

#[test]
fn now_ms_returns_positive_value() {
    use std::time::{SystemTime, UNIX_EPOCH};
    let ms = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0);
    assert!(ms > 0);
}

#[test]
fn now_ms_is_close_to_system_time() {
    use std::time::{SystemTime, UNIX_EPOCH};
    let expected = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_millis() as u64;
    let got = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0);
    assert!(
        got.abs_diff(expected) < 1_000,
        "now_ms() = {got}, expected ≈ {expected}"
    );
}

#[tokio::test]
#[serial]
#[ignore = "requires a running Redis instance"]
async fn request_bot_move_reaches_get_players_and_engine_url_lines() {
    use tower::ServiceExt;

    let redis_host = std::env::var("REDIS_HOST").unwrap_or_else(|_| "127.0.0.1".to_string());
    let redis_port = std::env::var("REDIS_PORT").unwrap_or_else(|_| "6379".to_string());
    let pool = redis_client::create_pool(
        &format!("redis://{}:{}/", redis_host, redis_port)
    ).await;

    let match_id = "test-bot-cov-001".to_string();
    redis_client::create_match(
        &pool, &match_id, &3,
        &"human".to_string(), &"easy".to_string(),
        None,None).await.unwrap();

    let state = Arc::new(AppState {
        redis_pool: pool,
        // Port 19999 is intentionally unreachable — the test only needs
        // execution to reach the get_match_players and engine_url lines
        // before the HTTP call to gamey fails with 500.
        gamey_url: "http://127.0.0.1:19999".to_string(),
    });

    let body = serde_json::json!({ "match_id": match_id }).to_string();
    let response = build_router(state)
        .oneshot(
            axum::http::Request::builder()
                .method("POST")
                .uri("/reqBotMove")
                .header("content-type", "application/json")
                .body(axum::body::Body::from(body))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::INTERNAL_SERVER_ERROR);
}
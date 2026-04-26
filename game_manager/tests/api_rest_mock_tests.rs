// tests/api_rest_mock_tests.rs
//
// Mock-based tests for `api_rest.rs`. SCOPE BY DESIGN:
//
//   * NO real Redis is used.
//   * NO real Firebase is used.
//   * The Engine ("gamey") is mocked with `wiremock` where useful.
//
// Because almost every handler hits Redis at the FIRST await, the realistic
// coverage we can get without a live Redis is:
//
//   * pure helpers that are `pub` (`get_gamey_url`)
//   * Axum/serde rejections that fire BEFORE the handler runs
//     (bad JSON, missing fields, wrong content-type, wrong HTTP method,
//      unknown route, malformed path params)
//   * branches that validate the body BEFORE touching Redis
//     (e.g. `/claimForfeit` rejects a missing `claimant_id` with 400)
//   * the "infrastructure unreachable" path: we point AppState at a Redis
//     pool whose URL resolves to a closed port. Every handler that needs
//     Redis at all should bubble up a 500 (or another non-success code) and
//     NOT panic. This is a legitimate negative-path mock — we are not
//     asserting business logic, only that the error mapping does not crash.
//
// What is intentionally NOT tested here:
//
//   * Happy paths of `/executeMove`, `/executeMoveOnline`, `/reqBotMove`,
//     `/saveMatch`, `/updateScore`, `/localRankings`, `/bestTimes`,
//     `/createMatch`, `/joinMatch`, `/matchStatus`, `/matchTurnInfo`,
//     `/cancelMatch`, `/claimForfeit` (settle path), `/debug/redis`,
//     `/requestOnlineGameUpdate`. Those need a real Redis or a real
//     Firestore and are covered (or scoped out) by other test files.
//
// To add this file, depend on the following dev-dependencies in Cargo.toml:
//
//   [dev-dependencies]
//   axum         = "0.7"            # already in main deps
//   tokio        = { version = "1", features = ["macros", "rt-multi-thread", "time"] }
//   tower        = { version = "0.5", features = ["util"] }
//   serde_json   = "1"
//   serial_test  = "3"
//   wiremock     = "0.6"
//
// (Versions match what `api_online_tests.rs` already uses.)

use std::sync::Arc;

use axum::body::{to_bytes, Body};
use axum::http::{Request, StatusCode};
use serde_json::{json, Value};
use serial_test::serial;
use tower::ServiceExt;

use game_manager::api_rest::{build_router, get_gamey_url, AppState};
use game_manager::redis_client;

use wiremock::matchers::{method, path};
use wiremock::{Mock, MockServer, ResponseTemplate};

// ---------------------------------------------------------------------------
//  Test scaffolding
// ---------------------------------------------------------------------------

/// Build a router whose Redis pool points at a closed port. Any handler that
/// reaches Redis will fail at the very first await — which is exactly what we
/// want when verifying error mapping without spinning up a real Redis.
///
/// `gamey_url` is overridable so individual tests can point it at a wiremock
/// server.
async fn router_with_dead_redis(gamey_url: String) -> axum::Router {
    // Port 1 is reserved/unassigned on every reasonable host. Connection
    // attempts will fail fast.
    let dead_url = "redis://127.0.0.1:1/";
    let pool = redis_client::create_pool(dead_url).await;

    let state = Arc::new(AppState {
        redis_pool: pool,
        gamey_url,
    });

    build_router(state)
}

/// Convenience: dead Redis + a placeholder engine URL that nobody should
/// reach in these tests.
async fn router_with_dead_redis_default_engine() -> axum::Router {
    router_with_dead_redis("http://127.0.0.1:1".to_string()).await
}

async fn post_json(app: axum::Router, uri: &str, body: Value) -> (StatusCode, Vec<u8>) {
    let req = Request::builder()
        .method("POST")
        .uri(uri)
        .header("content-type", "application/json")
        .body(Body::from(body.to_string()))
        .expect("build request");
    let res = app.oneshot(req).await.expect("oneshot");
    let status = res.status();
    let bytes = to_bytes(res.into_body(), 1_000_000)
        .await
        .expect("read body")
        .to_vec();
    (status, bytes)
}

async fn post_raw(
    app: axum::Router,
    uri: &str,
    content_type: &str,
    body: &str,
) -> (StatusCode, Vec<u8>) {
    let req = Request::builder()
        .method("POST")
        .uri(uri)
        .header("content-type", content_type)
        .body(Body::from(body.to_string()))
        .expect("build request");
    let res = app.oneshot(req).await.expect("oneshot");
    let status = res.status();
    let bytes = to_bytes(res.into_body(), 1_000_000)
        .await
        .expect("read body")
        .to_vec();
    (status, bytes)
}

async fn raw_request(app: axum::Router, method: &str, uri: &str) -> StatusCode {
    let req = Request::builder()
        .method(method)
        .uri(uri)
        .body(Body::empty())
        .expect("build request");
    app.oneshot(req).await.expect("oneshot").status()
}

fn body_text(bytes: &[u8]) -> String {
    String::from_utf8_lossy(bytes).to_string()
}

// ---------------------------------------------------------------------------
//  Pure helpers — `get_gamey_url`
// ---------------------------------------------------------------------------
//
// `api_rest.rs` already covers the env-set / env-unset paths in its own
// `#[cfg(test)] mod tests`. We add a few extra cases here that exercise
// edge-case values — IPv4, hostname with dashes, empty string. These are
// pure-CPU and don't need any infrastructure.

#[test]
#[serial]
fn get_gamey_url_handles_ipv4() {
    unsafe { std::env::set_var("GAMEY", "10.0.0.5") };
    let url = get_gamey_url();
    unsafe { std::env::remove_var("GAMEY") };
    assert_eq!(url, "http://10.0.0.5:4000");
}

#[test]
#[serial]
fn get_gamey_url_handles_hostname_with_dashes() {
    unsafe { std::env::set_var("GAMEY", "gamey-prod-01") };
    let url = get_gamey_url();
    unsafe { std::env::remove_var("GAMEY") };
    assert_eq!(url, "http://gamey-prod-01:4000");
}

#[test]
#[serial]
fn get_gamey_url_with_empty_env_falls_through_to_empty_host() {
    // The current implementation uses `unwrap_or_else` only for the
    // `VarError::NotPresent` case, so an empty string is a valid value.
    // Document that behaviour: empty produces "http://:4000".
    unsafe { std::env::set_var("GAMEY", "") };
    let url = get_gamey_url();
    unsafe { std::env::remove_var("GAMEY") };
    assert_eq!(url, "http://:4000");
}

// ---------------------------------------------------------------------------
//  Routing — unknown routes & wrong methods
// ---------------------------------------------------------------------------

#[tokio::test]
#[serial]
async fn unknown_route_returns_404() {
    let app = router_with_dead_redis_default_engine().await;
    let status = raw_request(app, "GET", "/this/route/does/not/exist").await;
    assert_eq!(status, StatusCode::NOT_FOUND);
}

#[tokio::test]
#[serial]
async fn get_on_post_only_route_is_405() {
    // `/new` is POST-only.
    let app = router_with_dead_redis_default_engine().await;
    let status = raw_request(app, "GET", "/new").await;
    assert_eq!(status, StatusCode::METHOD_NOT_ALLOWED);
}

#[tokio::test]
#[serial]
async fn post_on_get_only_route_is_405() {
    // `/bestTimes` is GET-only.
    let app = router_with_dead_redis_default_engine().await;
    let (status, _) = post_json(app, "/bestTimes", json!({})).await;
    assert_eq!(status, StatusCode::METHOD_NOT_ALLOWED);
}

#[tokio::test]
#[serial]
async fn put_on_delete_only_route_is_405() {
    // `/cancelMatch/:id` is DELETE-only.
    let app = router_with_dead_redis_default_engine().await;
    let req = Request::builder()
        .method("PUT")
        .uri("/cancelMatch/whatever")
        .body(Body::empty())
        .expect("build");
    let res = app.oneshot(req).await.expect("oneshot");
    assert_eq!(res.status(), StatusCode::METHOD_NOT_ALLOWED);
}

// ---------------------------------------------------------------------------
//  Body parsing — malformed JSON / missing fields / wrong types
// ---------------------------------------------------------------------------
//
// Axum's `Json<T>` extractor rejects requests with 400 (or 415) BEFORE the
// handler runs. None of these tests should reach Redis.

#[tokio::test]
#[serial]
async fn new_match_with_missing_field_is_rejected() {
    // `NewMatchRequest` requires player1, player2, size. Send only player1.
    let app = router_with_dead_redis_default_engine().await;
    let (status, _) = post_json(app, "/new", json!({ "player1": "alice" })).await;
    // Axum returns 422 UNPROCESSABLE_ENTITY for serde decoding failures.
    assert!(
        status == StatusCode::UNPROCESSABLE_ENTITY || status == StatusCode::BAD_REQUEST,
        "expected 4xx body-parse rejection, got {}",
        status
    );
}

#[tokio::test]
#[serial]
async fn new_match_with_wrong_type_for_size_is_rejected() {
    let app = router_with_dead_redis_default_engine().await;
    let (status, _) = post_json(
        app,
        "/new",
        json!({ "player1": "a", "player2": "b", "size": "not-a-number" }),
    )
    .await;
    assert!(
        status == StatusCode::UNPROCESSABLE_ENTITY || status == StatusCode::BAD_REQUEST,
        "expected 4xx, got {}",
        status
    );
}

#[tokio::test]
#[serial]
async fn execute_move_with_malformed_json_is_rejected() {
    let app = router_with_dead_redis_default_engine().await;
    let (status, _) = post_raw(app, "/executeMove", "application/json", "{not valid json").await;
    assert!(
        status == StatusCode::BAD_REQUEST || status == StatusCode::UNPROCESSABLE_ENTITY,
        "expected 4xx, got {}",
        status
    );
}

#[tokio::test]
#[serial]
async fn execute_move_without_content_type_is_rejected() {
    // No content-type header → axum's Json extractor rejects with 415.
    let app = router_with_dead_redis_default_engine().await;
    let req = Request::builder()
        .method("POST")
        .uri("/executeMove")
        .body(Body::from(
            json!({ "match_id": "x", "coord_x": 0, "coord_y": 0, "coord_z": 0 }).to_string(),
        ))
        .expect("build");
    let res = app.oneshot(req).await.expect("oneshot");
    assert_eq!(res.status(), StatusCode::UNSUPPORTED_MEDIA_TYPE);
}

#[tokio::test]
#[serial]
async fn execute_move_online_missing_player_id_is_rejected() {
    // `MoveRequestOnline` requires `player_id`. Without it, serde rejects.
    let app = router_with_dead_redis_default_engine().await;
    let (status, _) = post_json(
        app,
        "/executeMoveOnline",
        json!({ "match_id": "x", "coord_x": 0, "coord_y": 0, "coord_z": 0 }),
    )
    .await;
    assert!(
        status == StatusCode::UNPROCESSABLE_ENTITY || status == StatusCode::BAD_REQUEST,
        "expected 4xx body-parse rejection, got {}",
        status
    );
}

#[tokio::test]
#[serial]
async fn req_bot_move_with_empty_body_is_rejected() {
    let app = router_with_dead_redis_default_engine().await;
    let (status, _) = post_json(app, "/reqBotMove", json!({})).await;
    assert!(
        status == StatusCode::UNPROCESSABLE_ENTITY || status == StatusCode::BAD_REQUEST,
        "expected 4xx body-parse rejection, got {}",
        status
    );
}

#[tokio::test]
#[serial]
async fn local_rankings_with_missing_user_id_is_rejected() {
    let app = router_with_dead_redis_default_engine().await;
    let (status, _) = post_json(app, "/localRankings", json!({})).await;
    assert!(
        status == StatusCode::UNPROCESSABLE_ENTITY || status == StatusCode::BAD_REQUEST,
        "got {}",
        status
    );
}

#[tokio::test]
#[serial]
async fn update_score_with_wrong_field_type_is_rejected() {
    // `is_win` must be bool.
    let app = router_with_dead_redis_default_engine().await;
    let (status, _) = post_json(
        app,
        "/updateScore",
        json!({
            "playerid": "p",
            "username": "u",
            "is_win": "yes",
            "time": 10.0,
        }),
    )
    .await;
    assert!(
        status == StatusCode::UNPROCESSABLE_ENTITY || status == StatusCode::BAD_REQUEST,
        "got {}",
        status
    );
}

#[tokio::test]
#[serial]
async fn save_match_with_missing_match_id_is_rejected() {
    let app = router_with_dead_redis_default_engine().await;
    let (status, _) = post_json(
        app,
        "/saveMatch",
        json!({
            "player1id": "a",
            "player2id": "b",
            "result": "WIN",
            "time": 10.0,
        }),
    )
    .await;
    assert!(
        status == StatusCode::UNPROCESSABLE_ENTITY || status == StatusCode::BAD_REQUEST,
        "got {}",
        status
    );
}

#[tokio::test]
#[serial]
async fn create_online_match_missing_player1id_is_rejected() {
    let app = router_with_dead_redis_default_engine().await;
    let (status, _) = post_json(
        app,
        "/createMatch",
        json!({
            "match_id": "",
            "match_password": "",
            "size": 5,
        }),
    )
    .await;
    assert!(
        status == StatusCode::UNPROCESSABLE_ENTITY || status == StatusCode::BAD_REQUEST,
        "got {}",
        status
    );
}

#[tokio::test]
#[serial]
async fn join_online_match_missing_player2id_is_rejected() {
    let app = router_with_dead_redis_default_engine().await;
    let (status, _) = post_json(
        app,
        "/joinMatch",
        json!({
            "match_id": "",
            "match_password": "",
        }),
    )
    .await;
    assert!(
        status == StatusCode::UNPROCESSABLE_ENTITY || status == StatusCode::BAD_REQUEST,
        "got {}",
        status
    );
}

#[tokio::test]
#[serial]
async fn request_online_update_missing_turn_number_is_rejected() {
    let app = router_with_dead_redis_default_engine().await;
    let (status, _) = post_json(
        app,
        "/requestOnlineGameUpdate",
        json!({ "match_id": "x" }),
    )
    .await;
    assert!(
        status == StatusCode::UNPROCESSABLE_ENTITY || status == StatusCode::BAD_REQUEST,
        "got {}",
        status
    );
}

// ---------------------------------------------------------------------------
//  `/claimForfeit/:id` — body-level validation BEFORE Redis
// ---------------------------------------------------------------------------
//
// The handler calls `payload.get("claimant_id")` and returns 400 BEFORE
// touching Redis. This is the only branch we can verify for this endpoint
// without a real Redis.

#[tokio::test]
#[serial]
async fn claim_forfeit_missing_claimant_id_returns_400() {
    let app = router_with_dead_redis_default_engine().await;
    let (status, body) = post_json(app, "/claimForfeit/some_match", json!({})).await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
    assert!(
        body_text(&body).to_lowercase().contains("claimant_id"),
        "error text should mention claimant_id, got: {}",
        body_text(&body)
    );
}

#[tokio::test]
#[serial]
async fn claim_forfeit_claimant_id_wrong_type_returns_400() {
    // `claimant_id` is read with `as_str()`, so a number fails the same way
    // as a missing field.
    let app = router_with_dead_redis_default_engine().await;
    let (status, _) = post_json(
        app,
        "/claimForfeit/some_match",
        json!({ "claimant_id": 42 }),
    )
    .await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
}

// ---------------------------------------------------------------------------
//  Infrastructure unreachable — Redis pool points at a closed port
// ---------------------------------------------------------------------------
//
// We do not assert exact status codes here because the pool error from a
// closed-port connection can surface as either 500 or 404 (the handler maps
// `get_match_state` errors to 404). What we DO assert is:
//
//   * the handler does not panic
//   * the response is some 4xx/5xx (not a 2xx success)
//
// This guards against accidental refactors that swallow infrastructure
// errors and return 200 anyway.

fn is_error_status(s: StatusCode) -> bool {
    s.is_client_error() || s.is_server_error()
}

#[tokio::test]
#[serial]
async fn execute_move_with_unreachable_redis_returns_error_status() {
    let app = router_with_dead_redis_default_engine().await;
    let (status, _) = post_json(
        app,
        "/executeMove",
        json!({
            "match_id": "x",
            "coord_x": 0,
            "coord_y": 0,
            "coord_z": 0,
        }),
    )
    .await;
    assert!(is_error_status(status), "expected error status, got {}", status);
}

#[tokio::test]
#[serial]
async fn execute_move_online_with_unreachable_redis_returns_error_status() {
    let app = router_with_dead_redis_default_engine().await;
    let (status, _) = post_json(
        app,
        "/executeMoveOnline",
        json!({
            "match_id": "x",
            "coord_x": 0,
            "coord_y": 0,
            "coord_z": 0,
            "player_id": 0,
        }),
    )
    .await;
    assert!(is_error_status(status), "got {}", status);
}

#[tokio::test]
#[serial]
async fn match_status_with_unreachable_redis_returns_error_status() {
    let app = router_with_dead_redis_default_engine().await;
    let status = raw_request(app, "GET", "/matchStatus/whatever").await;
    assert!(is_error_status(status), "got {}", status);
}

#[tokio::test]
#[serial]
async fn match_turn_info_with_unreachable_redis_returns_error_status() {
    let app = router_with_dead_redis_default_engine().await;
    let status = raw_request(app, "GET", "/matchTurnInfo/whatever").await;
    assert!(is_error_status(status), "got {}", status);
}

#[tokio::test]
#[serial]
async fn cancel_match_with_unreachable_redis_returns_error_status() {
    let app = router_with_dead_redis_default_engine().await;
    let status = raw_request(app, "DELETE", "/cancelMatch/whatever").await;
    assert!(is_error_status(status), "got {}", status);
}

#[tokio::test]
#[serial]
async fn claim_forfeit_with_unreachable_redis_returns_error_status() {
    // The 400 path needs `claimant_id` to be missing. Here we provide it,
    // so the handler will try to hit Redis and bubble up an error.
    let app = router_with_dead_redis_default_engine().await;
    let (status, _) = post_json(
        app,
        "/claimForfeit/whatever",
        json!({ "claimant_id": "someone" }),
    )
    .await;
    assert!(is_error_status(status), "got {}", status);
}

// ---------------------------------------------------------------------------
//  Engine mock — `/executeMove` and `/reqBotMove` payload contract
// ---------------------------------------------------------------------------
//
// These tests exercise the handler far enough to confirm that:
//
//   1. The handler's first failure is the Redis-state lookup (returning
//      404), since we have no Redis.
//   2. Pointing `gamey_url` at a wiremock server does not change that
//      outcome — i.e. the handler does NOT call the engine until after it
//      has the YEN from Redis.
//
// This is a *contract* test for the order of side effects: we want to
// ensure the engine is never called speculatively without state.

#[tokio::test]
#[serial]
async fn execute_move_does_not_call_engine_when_state_missing() {
    let mock_server: MockServer = MockServer::start().await;

    // If the handler calls the engine, this mock will record a hit.
    Mock::given(method("POST"))
        .and(path("/engine/move"))
        .respond_with(ResponseTemplate::new(200).set_body_json(json!({
            "new_yen_json": {
                "size": 4,
                "turn": 1,
                "players": ["B", "R"],
                "layout": "B/../.../...."
            },
            "game_over": false,
        })))
        .expect(0)
        .mount(&mock_server)
        .await;

    let app = router_with_dead_redis(mock_server.uri()).await;
    let (status, _) = post_json(
        app,
        "/executeMove",
        json!({
            "match_id": "missing_match",
            "coord_x": 0,
            "coord_y": 0,
            "coord_z": 0,
        }),
    )
    .await;

    assert!(is_error_status(status), "got {}", status);
    // Wiremock will fail on drop if the mock was hit (expect(0)).
}

#[tokio::test]
#[serial]
async fn req_bot_move_does_not_call_engine_when_state_missing() {
    let mock_server:MockServer = MockServer::start().await;

    Mock::given(method("POST"))
        .and(path("/v1/ybot/player_play/some_bot"))
        .respond_with(ResponseTemplate::new(200))
        .expect(0)
        .mount(&mock_server)
        .await;

    let app = router_with_dead_redis(mock_server.uri()).await;
    let (status, _) = post_json(
        app,
        "/reqBotMove",
        json!({ "match_id": "missing_match" }),
    )
    .await;

    assert!(is_error_status(status), "got {}", status);
}

// ---------------------------------------------------------------------------
//  Path param edge cases on routes with `:match_id`
// ---------------------------------------------------------------------------

#[tokio::test]
#[serial]
async fn match_status_with_url_encoded_id_does_not_panic() {
    // Spaces and slashes in the id should be url-encoded by the client. We
    // just want to make sure axum's `Path<String>` extractor handles a
    // pre-encoded value without crashing the handler.
    let app = router_with_dead_redis_default_engine().await;
    let status = raw_request(app, "GET", "/matchStatus/foo%20bar").await;
    assert!(is_error_status(status), "got {}", status);
}

#[tokio::test]
#[serial]
async fn cancel_match_with_long_id_does_not_panic() {
    let id = "a".repeat(500);
    let app = router_with_dead_redis_default_engine().await;
    let status = raw_request(app, "DELETE", &format!("/cancelMatch/{}", id)).await;
    assert!(is_error_status(status), "got {}", status);
}

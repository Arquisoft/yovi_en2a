// tests/api_online_tests.rs
//
// Integration tests that exercise the Axum router end-to-end. Requires Redis
// (same env as redis_tests.rs). Does NOT cover endpoints that forward to the
// Engine (`/executeMove`, `/reqBotMove`) — those are skipped per scope.
//
// We use `axum::http::Request` + `tower::ServiceExt::oneshot` to hit the app
// in-process, so no real port is bound.

mod common;

use axum::body::{Body, to_bytes};
use axum::http::{Request, StatusCode};
use serde_json::{json, Value};
use serial_test::serial;
use tower::ServiceExt;

use common::{build_test_router, cleanup_match, random_id, test_pool};

/// Issue a POST with a JSON body and return (status, json).
async fn post_json(
    app: axum::Router,
    path: &str,
    body: Value,
) -> (StatusCode, Value) {
    let req = Request::builder()
        .method("POST")
        .uri(path)
        .header("content-type", "application/json")
        .body(Body::from(body.to_string()))
        .expect("build request");

    let res = app.oneshot(req).await.expect("router oneshot");
    let status = res.status();
    let bytes = to_bytes(res.into_body(), 1_000_000).await.expect("read body");
    let value: Value = serde_json::from_slice(&bytes).unwrap_or(Value::Null);
    (status, value)
}

/// Issue a POST and return the body as plain text. Use this for endpoints
/// whose error branch returns text/plain instead of JSON.
async fn post_text(
    app: axum::Router,
    path: &str,
    body: Value,
) -> (StatusCode, String) {
    let req = Request::builder()
        .method("POST")
        .uri(path)
        .header("content-type", "application/json")
        .body(Body::from(body.to_string()))
        .expect("build request");

    let res = app.oneshot(req).await.expect("router oneshot");
    let status = res.status();
    let bytes = to_bytes(res.into_body(), 1_000_000).await.expect("read body");
    let text = String::from_utf8_lossy(&bytes).to_string();
    (status, text)
}

async fn get_json(app: axum::Router, path: &str) -> (StatusCode, Value) {
    let req = Request::builder()
        .method("GET")
        .uri(path)
        .body(Body::empty())
        .expect("build request");

    let res = app.oneshot(req).await.expect("router oneshot");
    let status = res.status();
    let bytes = to_bytes(res.into_body(), 1_000_000).await.expect("read body");
    let value: Value = serde_json::from_slice(&bytes).unwrap_or(Value::Null);
    (status, value)
}

async fn delete_json(app: axum::Router, path: &str) -> (StatusCode, Value) {
    let req = Request::builder()
        .method("DELETE")
        .uri(path)
        .body(Body::empty())
        .expect("build request");

    let res = app.oneshot(req).await.expect("router oneshot");
    let status = res.status();
    let bytes = to_bytes(res.into_body(), 1_000_000).await.expect("read body");
    let value: Value = serde_json::from_slice(&bytes).unwrap_or(Value::Null);
    (status, value)
}

// ---------------------------------------------------------------------------
//  /createMatch + /joinMatch — random pool
// ---------------------------------------------------------------------------

#[tokio::test]
#[serial]
async fn test_http_create_random_then_join() {
    let pool = test_pool().await;
    let app = build_test_router().await;

    // Create (random, empty match_id).
    let (status, body) = post_json(
        app.clone(),
        "/createMatch",
        json!({
            "match_id": "",
            "match_password": "",
            "player1id": "alice_http",
            "size": 5,
        }),
    ).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["turn_number"], 0);
    let match_id = body["match_id"].as_str().expect("match_id").to_string();
    assert!(!match_id.is_empty());

    // Join (also random).
    let (status, body) = post_json(
        app.clone(),
        "/joinMatch",
        json!({
            "match_id": "",
            "match_password": "",
            "player2id": "bob_http",
        }),
    ).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["match_id"], match_id);
    assert_eq!(body["turn_number"], 1);

    cleanup_match(&pool, &match_id).await;
}

#[tokio::test]
#[serial]
async fn test_http_join_random_when_empty_returns_500_with_no_match_msg() {
    // The Rust handler maps MatchError::NoMatchesAvailable to 500 with the
    // Display text. The frontend uses /no match/i to detect it.
    let app = build_test_router().await;
    let (status, body) = post_text(
        app.clone(),
        "/joinMatch",
        json!({
            "match_id": "",
            "match_password": "",
            "player2id": "lonely_player",
        }),
    ).await;

    assert_eq!(status, StatusCode::INTERNAL_SERVER_ERROR);
    assert!(
        body.to_lowercase().contains("no match"),
        "expected 'No match' in error body, got {}", body
    );
}

// ---------------------------------------------------------------------------
//  /createMatch + /joinMatch — private room + password
// ---------------------------------------------------------------------------

#[tokio::test]
#[serial]
async fn test_http_private_match_correct_password_joins() {
    let pool = test_pool().await;
    let id = random_id();
    let app = build_test_router().await;

    let (status, _) = post_json(
        app.clone(),
        "/createMatch",
        json!({
            "match_id": id,
            "match_password": "hunter2",
            "player1id": "host_http",
            "size": 5,
        }),
    ).await;
    assert_eq!(status, StatusCode::OK);

    let (status, body) = post_json(
        app.clone(),
        "/joinMatch",
        json!({
            "match_id": id,
            "match_password": "hunter2",
            "player2id": "guest_http",
        }),
    ).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["match_id"], id);
    assert_eq!(body["turn_number"], 1);

    cleanup_match(&pool, &id).await;
}

#[tokio::test]
#[serial]
async fn test_http_private_match_wrong_password_rejected() {
    let pool = test_pool().await;
    let id = random_id();
    let app = build_test_router().await;

    post_json(
        app.clone(),
        "/createMatch",
        json!({
            "match_id": id,
            "match_password": "correct",
            "player1id": "host_http",
            "size": 5,
        }),
    ).await;

    let (status, _) = post_json(
        app.clone(),
        "/joinMatch",
        json!({
            "match_id": id,
            "match_password": "wrong",
            "player2id": "guest_http",
        }),
    ).await;

    assert_eq!(status, StatusCode::INTERNAL_SERVER_ERROR,
               "wrong password should yield 500 from the handler");

    cleanup_match(&pool, &id).await;
}

#[tokio::test]
#[serial]
async fn test_http_private_match_empty_password_rejected() {
    // Regression for the bug we fixed: joining a password-protected match
    // with "" as password must not pass through.
    let pool = test_pool().await;
    let id = random_id();
    let app = build_test_router().await;

    post_json(
        app.clone(),
        "/createMatch",
        json!({
            "match_id": id,
            "match_password": "abc",
            "player1id": "host_http",
            "size": 5,
        }),
    ).await;

    let (status, _) = post_json(
        app.clone(),
        "/joinMatch",
        json!({
            "match_id": id,
            "match_password": "",
            "player2id": "sneaky",
        }),
    ).await;

    assert_eq!(status, StatusCode::INTERNAL_SERVER_ERROR,
               "empty password against a protected match must not succeed");

    cleanup_match(&pool, &id).await;
}

// ---------------------------------------------------------------------------
//  /matchStatus/:id
// ---------------------------------------------------------------------------

#[tokio::test]
#[serial]
async fn test_http_match_status_waiting_then_ready() {
    let pool = test_pool().await;
    let id = random_id();
    let app = build_test_router().await;

    // Create private.
    post_json(
        app.clone(),
        "/createMatch",
        json!({
            "match_id": id,
            "match_password": "pw",
            "player1id": "host_st",
            "size": 4,
        }),
    ).await;

    // Before anyone joins: waiting.
    let (status, body) = get_json(
        app.clone(),
        &format!("/matchStatus/{}", id),
    ).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["status"], "waiting");
    assert_eq!(body["ready"], false);
    assert_eq!(body["player1id"], "host_st");
    assert_eq!(body["player2id"], "waiting");

    // Join.
    post_json(
        app.clone(),
        "/joinMatch",
        json!({
            "match_id": id,
            "match_password": "pw",
            "player2id": "guest_st",
        }),
    ).await;

    // After join: active and ready.
    let (status, body) = get_json(
        app.clone(),
        &format!("/matchStatus/{}", id),
    ).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["status"], "active");
    assert_eq!(body["ready"], true);
    assert_eq!(body["player1id"], "host_st");
    assert_eq!(body["player2id"], "guest_st");

    cleanup_match(&pool, &id).await;
}

#[tokio::test]
#[serial]
async fn test_http_match_status_nonexistent_is_404() {
    let app = build_test_router().await;
    let (status, _) = get_json(
        app.clone(),
        "/matchStatus/definitely_not_a_real_match_xyz",
    ).await;
    assert_eq!(status, StatusCode::NOT_FOUND);
}

// ---------------------------------------------------------------------------
//  /matchTurnInfo/:id
// ---------------------------------------------------------------------------

#[tokio::test]
#[serial]
async fn test_http_match_turn_info_stamps_on_join() {
    let pool = test_pool().await;
    let id = random_id();
    let app = build_test_router().await;

    post_json(
        app.clone(),
        "/createMatch",
        json!({
            "match_id": id,
            "match_password": "pw",
            "player1id": "host_ti",
            "size": 4,
        }),
    ).await;

    post_json(
        app.clone(),
        "/joinMatch",
        json!({
            "match_id": id,
            "match_password": "pw",
            "player2id": "guest_ti",
        }),
    ).await;

    let (status, body) = get_json(
        app.clone(),
        &format!("/matchTurnInfo/{}", id),
    ).await;
    assert_eq!(status, StatusCode::OK);

    assert_eq!(body["turn"], 0, "fresh match should be on turn 0");
    assert_eq!(body["turn_duration_ms"], 10_000);

    let turn_started = body["turn_started_at"].as_u64().expect("turn_started_at");
    let now_server = body["now_server"].as_u64().expect("now_server");
    assert!(turn_started > 0);

    // Tolerate small clock skew between the join stamp and the read. We only
    // care that they're in roughly the same ballpark — within ~10 s.
    let diff = now_server.abs_diff(turn_started);
    assert!(diff < 10_000,
            "turn_started_at and now_server differ by {}ms (turn_started_at={}, now_server={})",
            diff, turn_started, now_server);

    cleanup_match(&pool, &id).await;
}

#[tokio::test]
#[serial]
async fn test_http_match_turn_info_nonexistent_is_404() {
    let app = build_test_router().await;
    let (status, _) = get_json(
        app.clone(),
        "/matchTurnInfo/nonexistent_match_zzz",
    ).await;
    assert_eq!(status, StatusCode::NOT_FOUND);
}

// ---------------------------------------------------------------------------
//  /requestOnlineGameUpdate
// ---------------------------------------------------------------------------

#[tokio::test]
#[serial]
async fn test_http_request_online_update_returns_board_on_match() {
    // P2 asking on turn 0 should immediately get the board (because the YEN
    // starts with turn == 0 and the backend returns as soon as yen.turn ==
    // payload.turn_number). We use this rather than turn_number: 1 because
    // that would block up to ~20 s waiting for P1 to move.
    let pool = test_pool().await;
    let id = random_id();
    let app = build_test_router().await;

    post_json(
        app.clone(),
        "/createMatch",
        json!({
            "match_id": id,
            "match_password": "pw",
            "player1id": "host_ru",
            "size": 4,
        }),
    ).await;
    post_json(
        app.clone(),
        "/joinMatch",
        json!({
            "match_id": id,
            "match_password": "pw",
            "player2id": "guest_ru",
        }),
    ).await;

    let (status, body) = post_json(
        app.clone(),
        "/requestOnlineGameUpdate",
        json!({
            "match_id": id,
            "turn_number": 0,
        }),
    ).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["match_id"], id);
    assert!(body["board_status"].is_object());
    assert_eq!(body["board_status"]["turn"], 0);

    cleanup_match(&pool, &id).await;
}

#[tokio::test]
#[serial]
async fn test_http_request_online_update_nonexistent_is_404() {
    let app = build_test_router().await;
    let (status, _) = post_json(
        app.clone(),
        "/requestOnlineGameUpdate",
        json!({
            "match_id": "nonexistent_ru_zzz",
            "turn_number": 0,
        }),
    ).await;
    assert_eq!(status, StatusCode::NOT_FOUND);
}

// ---------------------------------------------------------------------------
//  /cancelMatch/:id
// ---------------------------------------------------------------------------

#[tokio::test]
#[serial]
async fn test_http_cancel_waiting_match_succeeds() {
    let pool = test_pool().await;
    let id = random_id();
    let app = build_test_router().await;

    // Create but don't join — match stays in "waiting" state.
    post_json(
        app.clone(),
        "/createMatch",
        json!({
            "match_id": id,
            "match_password": "pw",
            "player1id": "host_cancel",
            "size": 4,
        }),
    ).await;

    let (status, body) = delete_json(
        app.clone(),
        &format!("/cancelMatch/{}", id),
    ).await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["cancelled"], true);
    assert_eq!(body["match_id"], id);

    // Cancel already removed the keys; cleanup is a no-op but harmless.
    cleanup_match(&pool, &id).await;
}

#[tokio::test]
#[serial]
async fn test_http_cancel_active_match_returns_409() {
    let pool = test_pool().await;
    let id = random_id();
    let app = build_test_router().await;

    post_json(
        app.clone(),
        "/createMatch",
        json!({
            "match_id": id,
            "match_password": "pw",
            "player1id": "host_canc409",
            "size": 4,
        }),
    ).await;

    post_json(
        app.clone(),
        "/joinMatch",
        json!({
            "match_id": id,
            "match_password": "pw",
            "player2id": "guest_canc409",
        }),
    ).await;

    let (status, _) = delete_json(
        app.clone(),
        &format!("/cancelMatch/{}", id),
    ).await;

    assert_eq!(status, StatusCode::CONFLICT);

    cleanup_match(&pool, &id).await;
}

#[tokio::test]
#[serial]
async fn test_http_cancel_nonexistent_match_is_idempotent() {
    let app = build_test_router().await;

    let (status, body) = delete_json(
        app.clone(),
        "/cancelMatch/does_not_exist_cancel_xyz",
    ).await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["cancelled"], true);
}

// ---------------------------------------------------------------------------
//  /claimForfeit/:id
// ---------------------------------------------------------------------------

#[tokio::test]
#[serial]
async fn test_http_claim_forfeit_by_player1_succeeds() {
    let pool = test_pool().await;
    let id = random_id();
    let app = build_test_router().await;

    post_json(
        app.clone(),
        "/createMatch",
        json!({
            "match_id": id,
            "match_password": "pw",
            "player1id": "host_forf1",
            "size": 4,
        }),
    ).await;

    post_json(
        app.clone(),
        "/joinMatch",
        json!({
            "match_id": id,
            "match_password": "pw",
            "player2id": "guest_forf1",
        }),
    ).await;

    let (status, body) = post_json(
        app.clone(),
        &format!("/claimForfeit/{}", id),
        json!({ "claimant_id": "host_forf1" }),
    ).await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["accepted"], true);
    assert_eq!(body["winner"], "host_forf1");
    assert_eq!(body["end_reason"], "forfeit");

    cleanup_match(&pool, &id).await;
}

#[tokio::test]
#[serial]
async fn test_http_claim_forfeit_by_player2_succeeds() {
    let pool = test_pool().await;
    let id = random_id();
    let app = build_test_router().await;

    post_json(
        app.clone(),
        "/createMatch",
        json!({
            "match_id": id,
            "match_password": "pw",
            "player1id": "host_forf2",
            "size": 4,
        }),
    ).await;

    post_json(
        app.clone(),
        "/joinMatch",
        json!({
            "match_id": id,
            "match_password": "pw",
            "player2id": "guest_forf2",
        }),
    ).await;

    let (status, body) = post_json(
        app.clone(),
        &format!("/claimForfeit/{}", id),
        json!({ "claimant_id": "guest_forf2" }),
    ).await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["winner"], "guest_forf2");

    cleanup_match(&pool, &id).await;
}

#[tokio::test]
#[serial]
async fn test_http_claim_forfeit_by_outsider_returns_403() {
    let pool = test_pool().await;
    let id = random_id();
    let app = build_test_router().await;

    post_json(
        app.clone(),
        "/createMatch",
        json!({
            "match_id": id,
            "match_password": "pw",
            "player1id": "host_forf3",
            "size": 4,
        }),
    ).await;

    post_json(
        app.clone(),
        "/joinMatch",
        json!({
            "match_id": id,
            "match_password": "pw",
            "player2id": "guest_forf3",
        }),
    ).await;

    let (status, _) = post_json(
        app.clone(),
        &format!("/claimForfeit/{}", id),
        json!({ "claimant_id": "outsider" }),
    ).await;

    assert_eq!(status, StatusCode::FORBIDDEN);

    cleanup_match(&pool, &id).await;
}

#[tokio::test]
#[serial]
async fn test_http_claim_forfeit_missing_claimant_returns_400() {
    let id = random_id();
    let app = build_test_router().await;

    let (status, _) = post_json(
        app.clone(),
        &format!("/claimForfeit/{}", id),
        json!({}),
    ).await;

    assert_eq!(status, StatusCode::BAD_REQUEST);
}

#[tokio::test]
#[serial]
async fn test_http_claim_forfeit_nonexistent_match_returns_404() {
    let app = build_test_router().await;

    let (status, _) = post_json(
        app.clone(),
        "/claimForfeit/no_such_match_forfeit_zzz",
        json!({ "claimant_id": "anyone" }),
    ).await;

    assert_eq!(status, StatusCode::NOT_FOUND);
}
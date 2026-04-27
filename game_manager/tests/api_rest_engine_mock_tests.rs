// tests/api_rest_engine_mock_tests.rs
//
// Coverage-driven tests for `api_rest.rs` that run in CI WITHOUT a Redis
// daemon or a real Firebase project.
//
// Strategy
// --------
// CI does not provide Redis. Anything that needs Redis is gated behind
// `#[ignore]` with a clear reason — it can be run locally with
// `cargo test -- --ignored` if the developer has Redis running, but the
// default run never touches it.
//
// Tests that DO contribute coverage in CI (no infra needed):
//
//   * `/executeMove`           — match not in Redis -> 404 path (Redis pool
//                                points at a closed port; the `get_match_state`
//                                error is mapped to 404).
//   * `/executeMoveOnline`     — match not in Redis -> 404.
//   * `/reqBotMove`            — match not in Redis -> 404 (lock-loop bails
//                                early because Redis is unreachable, then the
//                                state lookup fails).
//   * `/requestOnlineGameUpdate` — match not in Redis -> 404.
//   * `/saveMatch`             — match not in Redis -> 404 (the YEN parse
//                                branch is also exercised on the failure side).
//   * `/matchTurnInfo/:id`     — Redis unreachable -> 4xx/5xx.
//   * `/localRankings`         — Firebase broken -> 200 with empty `matches`.
//   * `/bestTimes`             — Firebase broken -> 200 with empty `rankings`.
//   * `/updateScore`           — Firebase broken -> 500 (error mapping line).
//
// `wiremock` is only used for the engine in tests that we know will short-
// circuit before reaching it, with `expect(0)` to assert no engine call —
// this proves the order of side effects (state lookup happens before any
// outbound HTTP).
//
// Required dev-dependency:
//
//   wiremock = "0.6"

use std::sync::Arc;

use axum::body::{to_bytes, Body};
use axum::http::{Request, StatusCode};
use serde_json::{json, Value};
use serial_test::serial;
use tower::ServiceExt;

use game_manager::api_rest::{build_router, AppState};
use game_manager::redis_client;

use wiremock::matchers::{method, path, path_regex};
use wiremock::{Mock, MockServer, ResponseTemplate};

// ---------------------------------------------------------------------------
//  Scaffolding
// ---------------------------------------------------------------------------

/// Build a router whose Redis pool points at a closed port. Any handler
/// that reaches Redis will fail at the very first `pool.get()` or query —
/// which is the documented behaviour we want to verify.
async fn router_with_dead_redis(gamey_url: String) -> axum::Router {
    // Port 1 is reserved/unassigned; connection attempts fail fast.
    let pool = redis_client::create_pool("redis://127.0.0.1:1/").await;
    let state = Arc::new(AppState {
        redis_pool: pool,
        gamey_url,
    });
    build_router(state)
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

async fn get_status(app: axum::Router, uri: &str) -> (StatusCode, Vec<u8>) {
    let req = Request::builder()
        .method("GET")
        .uri(uri)
        .body(Body::empty())
        .expect("build request");
    let res = app.oneshot(req).await.expect("oneshot");
    let status = res.status();
    let bytes = to_bytes(res.into_body(), 1_000_000)
        .await
        .expect("read body")
        .to_vec();
    (status, bytes)
}

fn parse_json(bytes: &[u8]) -> Value {
    serde_json::from_slice(bytes).unwrap_or(Value::Null)
}

fn is_error_status(s: StatusCode) -> bool {
    s.is_client_error() || s.is_server_error()
}

// ---------------------------------------------------------------------------
//  FirebaseGuard — break Firestore for the duration of a test
// ---------------------------------------------------------------------------
//
// `firebase.rs` calls `dotenvy::dotenv()` at every connection, so a plain
// `remove_var` would be undone by `.env`. We instead write an invalid
// project id, then restore the original on Drop so other serialised tests
// see a working config.

struct FirebaseGuard {
    previous: Option<String>,
}

impl FirebaseGuard {
    fn break_firebase() -> Self {
        let previous = std::env::var("FIREBASE_PROJECT_ID").ok();
        // SAFETY: tests that mutate env are serialised via `#[serial]`.
        unsafe {
            std::env::set_var(
                "FIREBASE_PROJECT_ID",
                "__nonexistent_project_for_tests_xyz__",
            );
        }
        Self { previous }
    }
}

impl Drop for FirebaseGuard {
    fn drop(&mut self) {
        unsafe {
            match &self.previous {
                Some(v) => std::env::set_var("FIREBASE_PROJECT_ID", v),
                None => std::env::remove_var("FIREBASE_PROJECT_ID"),
            }
        }
    }
}

// ===========================================================================
//  RUNS IN CI — no Redis, no Firebase
// ===========================================================================

// ---------------------------------------------------------------------------
//  /executeMove — error mapping
// ---------------------------------------------------------------------------

#[tokio::test]
#[serial]
async fn execute_move_match_not_found_returns_4xx() {
    let mock = MockServer::start().await;
    // Engine must NOT be called when there is no state. With dead Redis
    // the state lookup fails first, so the engine mock should never see a
    // request. We assert that with `expect(0)`.
    Mock::given(method("POST"))
        .and(path("/engine/move"))
        .respond_with(ResponseTemplate::new(200))
        .expect(0)
        .mount(&mock)
        .await;

    let app = router_with_dead_redis(mock.uri()).await;
    let (status, _) = post_json(
        app,
        "/executeMove",
        json!({ "match_id": "x", "coord_x": 0, "coord_y": 0, "coord_z": 0 }),
    )
        .await;

    assert!(is_error_status(status), "expected error, got {}", status);
}

// ---------------------------------------------------------------------------
//  /executeMoveOnline — error mapping
// ---------------------------------------------------------------------------

#[tokio::test]
#[serial]
async fn execute_move_online_match_not_found_returns_4xx() {
    let mock = MockServer::start().await;
    Mock::given(method("POST"))
        .and(path("/engine/move"))
        .respond_with(ResponseTemplate::new(200))
        .expect(0)
        .mount(&mock)
        .await;

    let app = router_with_dead_redis(mock.uri()).await;
    let (status, _) = post_json(
        app,
        "/executeMoveOnline",
        json!({
            "match_id": "missing_emo",
            "coord_x": 0, "coord_y": 0, "coord_z": 0,
            "player_id": 0,
        }),
    )
        .await;

    assert!(is_error_status(status), "got {}", status);
}

// ---------------------------------------------------------------------------
//  /reqBotMove — error mapping
// ---------------------------------------------------------------------------

#[tokio::test]
#[serial]
async fn req_bot_move_match_not_found_returns_4xx() {
    let mock = MockServer::start().await;
    Mock::given(method("POST"))
        .and(path_regex(r"^/v1/ybot/player_play/.+$"))
        .respond_with(ResponseTemplate::new(200))
        .expect(0)
        .mount(&mock)
        .await;

    let app = router_with_dead_redis(mock.uri()).await;
    let (status, _) = post_json(app, "/reqBotMove", json!({ "match_id": "missing" })).await;
    assert!(is_error_status(status), "got {}", status);
}

// ---------------------------------------------------------------------------
//  /requestOnlineGameUpdate — error mapping
// ---------------------------------------------------------------------------

#[tokio::test]
#[serial]
async fn request_online_update_match_not_found_returns_4xx() {
    let app = router_with_dead_redis("http://127.0.0.1:1".to_string()).await;
    let (status, _) = post_json(
        app,
        "/requestOnlineGameUpdate",
        json!({ "match_id": "no_such_ru", "turn_number": 0 }),
    )
        .await;
    assert!(is_error_status(status), "got {}", status);
}

// ---------------------------------------------------------------------------
//  /matchTurnInfo — error mapping
// ---------------------------------------------------------------------------

#[tokio::test]
#[serial]
async fn match_turn_info_unreachable_redis_returns_4xx() {
    let app = router_with_dead_redis("http://127.0.0.1:1".to_string()).await;
    let (status, _) = get_status(app, "/matchTurnInfo/whatever").await;
    assert!(is_error_status(status), "got {}", status);
}

// ---------------------------------------------------------------------------
//  /saveMatch — Redis missing -> 404
// ---------------------------------------------------------------------------

#[tokio::test]
#[serial]
async fn save_match_missing_in_redis_returns_4xx() {
    let app = router_with_dead_redis("http://127.0.0.1:1".to_string()).await;
    let (status, _) = post_json(
        app,
        "/saveMatch",
        json!({
            "match_id": "no_such_save_match",
            "player1id": "p1",
            "player2id": "p2",
            "result": "WIN",
            "time": 10.0,
        }),
    )
        .await;
    assert!(is_error_status(status), "got {}", status);
}

// ---------------------------------------------------------------------------
//  /localRankings — Firebase broken -> 200 with empty `matches`
// ---------------------------------------------------------------------------
//
// `get_local_rankings` swallows Firestore errors and returns `vec![]`. We
// break Firebase so the error arm executes and the line gets covered.

#[tokio::test]
#[serial]
async fn local_rankings_with_broken_firebase_returns_200_empty() {
    let _guard = FirebaseGuard::break_firebase();

    let app = router_with_dead_redis("http://127.0.0.1:1".to_string()).await;
    let (status, body) = post_json(
        app,
        "/localRankings",
        json!({ "user_id": "no_such_user_for_lr" }),
    )
        .await;

    assert_eq!(status, StatusCode::OK);
    let v = parse_json(&body);
    assert!(v["matches"].is_array(), "matches must be an array, got {}", v);
    assert_eq!(v["matches"].as_array().map(|a| a.len()), Some(0));
}

// ---------------------------------------------------------------------------
//  /bestTimes — Firebase broken -> 200 with empty `rankings`
// ---------------------------------------------------------------------------

#[tokio::test]
#[serial]
async fn best_times_with_broken_firebase_returns_200_empty() {
    let _guard = FirebaseGuard::break_firebase();

    let app = router_with_dead_redis("http://127.0.0.1:1".to_string()).await;
    let (status, body) = get_status(app, "/bestTimes").await;

    assert_eq!(status, StatusCode::OK);
    let v = parse_json(&body);
    assert!(v["rankings"].is_array(), "rankings must be an array, got {}", v);
    assert_eq!(v["rankings"].as_array().map(|a| a.len()), Some(0));
}

// ---------------------------------------------------------------------------
//  /updateScore — Firebase broken -> 500 (error-mapping line)
// ---------------------------------------------------------------------------

#[tokio::test]
#[serial]
async fn update_score_with_broken_firebase_returns_500() {
    let _guard = FirebaseGuard::break_firebase();

    let app = router_with_dead_redis("http://127.0.0.1:1".to_string()).await;
    let (status, _) = post_json(
        app,
        "/updateScore",
        json!({
            "playerid": "no_fb_player",
            "username": "NoFb",
            "is_win": true,
            "time": 42.0,
        }),
    )
        .await;
    assert_eq!(status, StatusCode::INTERNAL_SERVER_ERROR);
}

// ---------------------------------------------------------------------------
//  Engine mock contract — confirm the order of side effects
// ---------------------------------------------------------------------------

#[tokio::test]
#[serial]
async fn execute_move_does_not_call_engine_before_redis_lookup() {
    let mock = MockServer::start().await;
    Mock::given(method("POST"))
        .and(path("/engine/move"))
        .respond_with(ResponseTemplate::new(200))
        .expect(0) // Wiremock fails the test on drop if this fires.
        .mount(&mock)
        .await;

    let app = router_with_dead_redis(mock.uri()).await;
    let (_status, _) = post_json(
        app,
        "/executeMove",
        json!({ "match_id": "x", "coord_x": 0, "coord_y": 0, "coord_z": 0 }),
    )
        .await;
    // No assertion needed beyond the wiremock expectation.
}

#[tokio::test]
#[serial]
async fn req_bot_move_does_not_call_engine_before_redis_lookup() {
    let mock = MockServer::start().await;
    Mock::given(method("POST"))
        .and(path_regex(r"^/v1/ybot/player_play/.+$"))
        .respond_with(ResponseTemplate::new(200))
        .expect(0)
        .mount(&mock)
        .await;

    let app = router_with_dead_redis(mock.uri()).await;
    let (_status, _) = post_json(app, "/reqBotMove", json!({ "match_id": "x" })).await;
}

// ===========================================================================
//  REQUIRES INFRASTRUCTURE — gated behind #[ignore]
// ===========================================================================
//
// These tests cover happy paths that need a real Redis (and sometimes a
// mocked engine). They are NOT run by default in CI. Run locally with:
//
//   cargo test --test api_rest_engine_mock_tests -- --ignored
//
// Each test bootstraps a Redis pool from REDIS_HOST/REDIS_PORT (defaulting
// to 127.0.0.1:6379) and seeds match state directly with redis::cmd to
// avoid coupling to `redis_client::create_match` semantics.

#[allow(dead_code)]
async fn pool_from_env() -> redis_client::RedisPool {
    let host = std::env::var("REDIS_HOST").unwrap_or_else(|_| "127.0.0.1".to_string());
    let port = std::env::var("REDIS_PORT").unwrap_or_else(|_| "6379".to_string());
    redis_client::create_pool(&format!("redis://{}:{}/", host, port)).await
}

#[allow(dead_code)]
fn yen_value(turn: u32, layout: &str) -> Value {
    json!({
        "size": 3,
        "turn": turn,
        "players": ["B", "R"],
        "layout": layout,
    })
}

#[allow(dead_code)]
async fn seed_match_in_redis(
    pool: &redis_client::RedisPool,
    match_id: &str,
    p1: &str,
    p2: &str,
    yen: &Value,
) {
    let mut conn = pool.get().await.expect("redis conn");

    let _: () = redis::cmd("SET")
        .arg(format!("match:{}", match_id))
        .arg(yen.to_string())
        .arg("EX").arg(3600u64)
        .query_async(&mut *conn).await.expect("seed match state");

    let _: () = redis::cmd("SET")
        .arg(format!("match:{}:players", match_id))
        .arg(format!("{}:{}", p1, p2))
        .arg("EX").arg(3600u64)
        .query_async(&mut *conn).await.expect("seed players");

    let _: () = redis::cmd("SET")
        .arg(format!("match:{}:status", match_id))
        .arg("active")
        .arg("EX").arg(3600u64)
        .query_async(&mut *conn).await.expect("seed status");
}

#[allow(dead_code)]
async fn cleanup_match(pool: &redis_client::RedisPool, match_id: &str) {
    if let Ok(mut conn) = pool.get().await {
        for suffix in ["", ":players", ":status", ":password",
            ":turn_started_at", ":winner", ":end_reason"] {
            let _: Result<(), _> = redis::cmd("DEL")
                .arg(format!("match:{}{}", match_id, suffix))
                .query_async(&mut *conn).await;
        }
        let _: Result<(), _> = redis::cmd("DEL")
            .arg(format!("lock:match:{}", match_id))
            .query_async(&mut *conn).await;
    }
}

#[allow(dead_code)]
fn random_id() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_nanos();
    format!("test_{}", nanos)
}

#[tokio::test]
#[serial]
#[ignore = "requires a running Redis instance"]
async fn execute_move_happy_path_not_game_over() {
    let mock = MockServer::start().await;
    let new_yen = yen_value(1, "B/../...");
    Mock::given(method("POST"))
        .and(path("/engine/move"))
        .respond_with(ResponseTemplate::new(200).set_body_json(json!({
            "new_yen_json": new_yen,
            "game_over": false,
        })))
        .expect(1)
        .mount(&mock)
        .await;

    let pool = pool_from_env().await;
    let id = random_id();
    seed_match_in_redis(&pool, &id, "alice", "bob", &yen_value(0, "./../...")).await;

    let state = Arc::new(AppState { redis_pool: pool.clone(), gamey_url: mock.uri() });
    let app = build_router(state);

    let (status, body) = post_json(
        app,
        "/executeMove",
        json!({ "match_id": id, "coord_x": 0, "coord_y": 0, "coord_z": 2 }),
    )
        .await;

    assert_eq!(status, StatusCode::OK);
    let v = parse_json(&body);
    assert_eq!(v["match_id"], id);
    assert_eq!(v["game_over"], false);

    cleanup_match(&pool, &id).await;
}

#[tokio::test]
#[serial]
#[ignore = "requires a running Redis instance"]
async fn execute_move_happy_path_game_over_settles_winner() {
    let mock = MockServer::start().await;
    let new_yen = yen_value(0, "B/BB/BBB");
    Mock::given(method("POST"))
        .and(path("/engine/move"))
        .respond_with(ResponseTemplate::new(200).set_body_json(json!({
            "new_yen_json": new_yen,
            "game_over": true,
        })))
        .expect(1)
        .mount(&mock)
        .await;

    let pool = pool_from_env().await;
    let id = random_id();
    seed_match_in_redis(&pool, &id, "p1_win", "p2_win", &yen_value(1, "B/BB/.B.")).await;

    let state = Arc::new(AppState { redis_pool: pool.clone(), gamey_url: mock.uri() });
    let app = build_router(state);

    let (status, body) = post_json(
        app,
        "/executeMove",
        json!({ "match_id": id, "coord_x": 0, "coord_y": 0, "coord_z": 2 }),
    )
        .await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(parse_json(&body)["game_over"], true);

    let mut conn = pool.get().await.unwrap();
    let winner: Option<String> = redis::cmd("GET")
        .arg(format!("match:{}:winner", id))
        .query_async(&mut *conn).await.unwrap_or(None);
    assert_eq!(winner.as_deref(), Some("p2_win"));

    cleanup_match(&pool, &id).await;
}

#[tokio::test]
#[serial]
#[ignore = "requires a running Redis instance"]
async fn execute_move_engine_4xx_returns_bad_request() {
    let mock = MockServer::start().await;
    Mock::given(method("POST"))
        .and(path("/engine/move"))
        .respond_with(ResponseTemplate::new(400).set_body_string("Illegal move"))
        .expect(1)
        .mount(&mock)
        .await;

    let pool = pool_from_env().await;
    let id = random_id();
    seed_match_in_redis(&pool, &id, "alice", "bob", &yen_value(0, "./../...")).await;

    let state = Arc::new(AppState { redis_pool: pool.clone(), gamey_url: mock.uri() });
    let app = build_router(state);

    let (status, _) = post_json(
        app,
        "/executeMove",
        json!({ "match_id": id, "coord_x": 0, "coord_y": 0, "coord_z": 2 }),
    )
        .await;
    assert_eq!(status, StatusCode::BAD_REQUEST);

    cleanup_match(&pool, &id).await;
}

#[tokio::test]
#[serial]
#[ignore = "requires a running Redis instance"]
async fn execute_move_online_wrong_turn_returns_403() {
    let mock = MockServer::start().await;
    Mock::given(method("POST"))
        .and(path("/engine/move"))
        .respond_with(ResponseTemplate::new(200))
        .expect(0)
        .mount(&mock)
        .await;

    let pool = pool_from_env().await;
    let id = random_id();
    // YEN says it is turn 0; client claims to be player 1 -> 403.
    seed_match_in_redis(&pool, &id, "p1_emo", "p2_emo", &yen_value(0, "./../...")).await;

    let state = Arc::new(AppState { redis_pool: pool.clone(), gamey_url: mock.uri() });
    let app = build_router(state);

    let (status, _) = post_json(
        app,
        "/executeMoveOnline",
        json!({
            "match_id": id,
            "coord_x": 0, "coord_y": 0, "coord_z": 2,
            "player_id": 1,
        }),
    )
        .await;
    assert_eq!(status, StatusCode::FORBIDDEN);

    cleanup_match(&pool, &id).await;
}

#[tokio::test]
#[serial]
#[ignore = "requires a running Redis instance"]
async fn execute_move_online_correct_turn_delegates_to_engine() {
    let mock = MockServer::start().await;
    let new_yen = yen_value(1, "B/../...");
    Mock::given(method("POST"))
        .and(path("/engine/move"))
        .respond_with(ResponseTemplate::new(200).set_body_json(json!({
            "new_yen_json": new_yen,
            "game_over": false,
        })))
        .expect(1)
        .mount(&mock)
        .await;

    let pool = pool_from_env().await;
    let id = random_id();
    seed_match_in_redis(&pool, &id, "p1_emo_ok", "p2_emo_ok", &yen_value(0, "./../...")).await;

    let state = Arc::new(AppState { redis_pool: pool.clone(), gamey_url: mock.uri() });
    let app = build_router(state);

    let (status, _) = post_json(
        app,
        "/executeMoveOnline",
        json!({
            "match_id": id,
            "coord_x": 0, "coord_y": 0, "coord_z": 2,
            "player_id": 0,
        }),
    )
        .await;
    assert_eq!(status, StatusCode::OK);

    cleanup_match(&pool, &id).await;
}

#[tokio::test]
#[serial]
#[ignore = "requires a running Redis instance"]
async fn req_bot_move_happy_path() {
    let mock = MockServer::start().await;
    let new_yen = yen_value(1, "B/../...");
    Mock::given(method("POST"))
        .and(path_regex(r"^/v1/ybot/player_play/.+$"))
        .respond_with(ResponseTemplate::new(200).set_body_json(json!({
            "api_version": "v1",
            "bot_id": "easy",
            "coords": { "x": 0, "y": 0, "z": 2 },
            "position": new_yen,
            "game_over": false,
            "winner": null,
        })))
        .expect(1)
        .mount(&mock)
        .await;

    let pool = pool_from_env().await;
    let id = random_id();
    seed_match_in_redis(&pool, &id, "human_bot", "easy", &yen_value(0, "./../...")).await;

    let state = Arc::new(AppState { redis_pool: pool.clone(), gamey_url: mock.uri() });
    let app = build_router(state);

    let (status, _) = post_json(app, "/reqBotMove", json!({ "match_id": id })).await;
    assert_eq!(status, StatusCode::OK);

    cleanup_match(&pool, &id).await;
}

#[tokio::test]
#[serial]
#[ignore = "requires a running Redis instance"]
async fn req_bot_move_engine_5xx_returns_bad_request() {
    let mock = MockServer::start().await;
    Mock::given(method("POST"))
        .and(path_regex(r"^/v1/ybot/player_play/.+$"))
        .respond_with(ResponseTemplate::new(500).set_body_string("internal"))
        .expect(1)
        .mount(&mock)
        .await;

    let pool = pool_from_env().await;
    let id = random_id();
    seed_match_in_redis(&pool, &id, "human_bot_err", "easy", &yen_value(0, "./../...")).await;

    let state = Arc::new(AppState { redis_pool: pool.clone(), gamey_url: mock.uri() });
    let app = build_router(state);

    let (status, _) = post_json(app, "/reqBotMove", json!({ "match_id": id })).await;
    assert_eq!(status, StatusCode::BAD_REQUEST);

    cleanup_match(&pool, &id).await;
}

#[tokio::test]
#[serial]
#[ignore = "requires a running Redis instance"]
async fn request_online_update_first_poll_matches() {
    let pool = pool_from_env().await;
    let id = random_id();
    seed_match_in_redis(&pool, &id, "p1_ru", "p2_ru", &yen_value(0, "./../...")).await;

    let state = Arc::new(AppState {
        redis_pool: pool.clone(),
        gamey_url: "http://127.0.0.1:1".to_string(),
    });
    let app = build_router(state);

    let (status, body) = post_json(
        app,
        "/requestOnlineGameUpdate",
        json!({ "match_id": id, "turn_number": 0 }),
    )
        .await;
    assert_eq!(status, StatusCode::OK);
    let v = parse_json(&body);
    assert_eq!(v["board_status"]["turn"], 0);

    cleanup_match(&pool, &id).await;
}

#[tokio::test]
#[serial]
#[ignore = "requires a running Redis instance + slow (~20s polling)"]
async fn request_online_update_times_out_when_turn_never_matches() {
    let pool = pool_from_env().await;
    let id = random_id();
    seed_match_in_redis(&pool, &id, "p1_to", "p2_to", &yen_value(0, "./../...")).await;

    let state = Arc::new(AppState {
        redis_pool: pool.clone(),
        gamey_url: "http://127.0.0.1:1".to_string(),
    });
    let app = build_router(state);

    let fut = post_json(
        app,
        "/requestOnlineGameUpdate",
        json!({ "match_id": id, "turn_number": 7 }),
    );

    let (status, _) =
        tokio::time::timeout(std::time::Duration::from_secs(25), fut)
            .await
            .expect("handler should return within 25s");

    assert_eq!(status, StatusCode::REQUEST_TIMEOUT);

    cleanup_match(&pool, &id).await;
}

#[tokio::test]
#[serial]
#[ignore = "requires a running Redis instance"]
async fn match_turn_info_returns_payload_for_existing_match() {
    let pool = pool_from_env().await;
    let id = random_id();
    seed_match_in_redis(&pool, &id, "p1_ti", "p2_ti", &yen_value(2, "B/BR/...")).await;

    let state = Arc::new(AppState {
        redis_pool: pool.clone(),
        gamey_url: "http://127.0.0.1:1".to_string(),
    });
    let app = build_router(state);

    let (status, body) = get_status(app, &format!("/matchTurnInfo/{}", id)).await;
    assert_eq!(status, StatusCode::OK);
    let v = parse_json(&body);
    assert_eq!(v["turn"], 2);
    assert_eq!(v["turn_duration_ms"], 10_000);

    cleanup_match(&pool, &id).await;
}

#[tokio::test]
#[serial]
#[ignore = "requires a running Redis instance + broken Firebase"]
async fn save_match_with_redis_state_and_broken_firebase_returns_500() {
    let _guard = FirebaseGuard::break_firebase();

    let pool = pool_from_env().await;
    let id = random_id();
    seed_match_in_redis(&pool, &id, "p1_sm", "p2_sm", &yen_value(1, "B/../...")).await;

    let state = Arc::new(AppState {
        redis_pool: pool.clone(),
        gamey_url: "http://127.0.0.1:1".to_string(),
    });
    let app = build_router(state);

    let (status, _) = post_json(
        app,
        "/saveMatch",
        json!({
            "match_id": id,
            "player1id": "p1_sm",
            "player2id": "p2_sm",
            "result": "WIN",
            "time": 10.5,
        }),
    )
        .await;
    assert_eq!(status, StatusCode::INTERNAL_SERVER_ERROR);

    cleanup_match(&pool, &id).await;
}
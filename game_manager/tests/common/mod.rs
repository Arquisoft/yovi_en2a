// tests/common/mod.rs
//
// Shared helpers for integration tests.
//
// Every test should:
//   - Use `random_id()` to generate fresh identifiers so parallel runs don't
//     fight over the same Redis keys.
//   - Call `cleanup_match` at the end to avoid polluting the shared Redis
//     between runs.
//
// `test_pool()` reads REDIS_HOST / REDIS_PORT exactly like `api_rest::run`, so
// you can drive tests against the same docker-compose Redis the GameManager
// talks to.
//
// `build_test_router()` constructs the Axum router wrapped with an AppState
// that points at the test Redis and a dummy gamey URL. It is enough for every
// online endpoint EXCEPT the ones that actually POST to the Engine
// (`/executeMove`, `/reqBotMove`). Those are skipped per user request.

#![allow(dead_code)]  // individual test files won't use every helper

use std::sync::Arc;

use axum::Router;
use game_manager::api_rest::{build_router, AppState};
use game_manager::redis_client::{create_pool, RedisPool};
use rand::Rng;

/// How fast connections time out when Redis isn't reachable.
/// Keeps tests from hanging the CI forever when the service is down.
const POOL_CONNECT_TIMEOUT_SECS: u64 = 3;

pub fn redis_url() -> String {
    let host = std::env::var("REDIS_HOST").unwrap_or_else(|_| "127.0.0.1".to_string());
    let port = std::env::var("REDIS_PORT").unwrap_or_else(|_| "6379".to_string());
    format!("redis://{}:{}/", host, port)
}

/// Build a test pool pointing at REDIS_HOST/REDIS_PORT.
///
/// Panics if Redis is unreachable — these tests are gated behind "Redis
/// required" per the project's test policy, so a missing Redis means the
/// developer forgot to start the stack, not that the test should pass.
pub async fn test_pool() -> RedisPool {
    create_pool(&redis_url()).await
}

/// Router wired to a real Redis pool and a bogus Engine URL. Fine for every
/// online endpoint that does NOT forward to the Engine.
///
pub async fn build_test_router() -> Router {
    let pool = test_pool().await;

    // Verify Redis is actually reachable before handing the router to a test.
    {
        let mut conn = pool.get().await
            .expect("Redis pool: failed to get connection — is Redis running?");
        let pong: String = redis::cmd("PING")
            .query_async(&mut *conn)
            .await
            .expect("Redis PING failed — is Redis running?");
        assert_eq!(pong, "PONG");
    }

    let state = Arc::new(AppState {
        redis_pool: pool,
        gamey_url: "http://engine.invalid:4000".to_string(),
    });
    build_router(state)
}

/// Short random id, safe for Redis keys and JSON.
pub fn random_id() -> String {
    let n: u32 = rand::thread_rng().gen_range(100_000..999_999);
    format!("it_{}", n)
}

/// Delete every key owned by a match so tests don't leak state into each other
/// or into the dev Redis. Silently ignores missing keys.
pub async fn cleanup_match(pool: &RedisPool, match_id: &str) {
    let Ok(mut conn) = pool.get().await else { return; };

    let keys = [
        format!("match:{}", match_id),
        format!("match:{}:players", match_id),
        format!("match:{}:status", match_id),
        format!("match:{}:password", match_id),
        format!("match:{}:turn_started_at", match_id),
        format!("lock:match:{}", match_id),
    ];

    for k in keys {
        let _: Result<(), _> = redis::cmd("DEL")
            .arg(k)
            .query_async(&mut *conn)
            .await;
    }

    // Also yank the id from the random pool in case a test aborted.
    let _: Result<(), _> = redis::cmd("LREM")
        .arg("pool:random")
        .arg(0i64)
        .arg(match_id)
        .query_async(&mut *conn)
        .await;
}
// tests/redis_tests.rs
//
// Integration tests for the Redis layer. Requires a reachable Redis at
// REDIS_HOST:REDIS_PORT (defaults 127.0.0.1:6379). Each test uses fresh
// random IDs and cleans up after itself.

mod common;

use game_manager::redis_client::{
    acquire_lock,
    create_match,
    create_private_online_match,
    create_random_online_match,
    get_match_players,
    get_match_state,
    join_private_online_match,
    join_random_online_match,
    release_lock,
    save_match_players,
    save_match_state,
    MatchError,
};
use serial_test::serial;

use common::{cleanup_match, random_id, test_pool};

// ---------------------------------------------------------------------------
//  Locks
// ---------------------------------------------------------------------------

#[tokio::test]
#[serial]
async fn test_lock_acquire_is_exclusive() {
    let pool = test_pool().await;
    let id = random_id();

    let first = acquire_lock(&pool, &id, 5).await.expect("first acquire");
    let second = acquire_lock(&pool, &id, 5).await.expect("second acquire");
    assert!(first, "first acquire should succeed");
    assert!(!second, "second acquire should fail while lock is held");

    release_lock(&pool, &id).await.expect("release");
    let third = acquire_lock(&pool, &id, 5).await.expect("third acquire");
    assert!(third, "after release the lock should be grabbable again");

    release_lock(&pool, &id).await.ok();
    cleanup_match(&pool, &id).await;
}

// ---------------------------------------------------------------------------
//  Match state + players (round-trip)
// ---------------------------------------------------------------------------

#[tokio::test]
#[serial]
async fn test_create_match_persists_initial_state() {
    let pool = test_pool().await;
    let id = random_id();

    create_match(&pool, &id, &4, &"p1".to_string(), &"p2".to_string(), None, None)
        .await
        .expect("create_match");

    let raw = get_match_state(&pool, &id).await.expect("get_match_state");
    let state: serde_json::Value = serde_json::from_str(&raw).expect("yen json");

    assert_eq!(state["size"], 4);
    assert_eq!(state["turn"], 0);
    assert_eq!(state["players"], serde_json::json!(["B", "R"]));
    // Triangular layout: rows of lengths 1, 2, 3, 4 separated by '/'.
    assert_eq!(state["layout"], "./../.../....");

    let (p1, p2) = get_match_players(&pool, &id).await.expect("players");
    assert_eq!(p1, "p1");
    assert_eq!(p2, "p2");

    cleanup_match(&pool, &id).await;
}

#[tokio::test]
#[serial]
async fn test_save_match_state_overwrites_previous() {
    let pool = test_pool().await;
    let id = random_id();

    create_match(&pool, &id, &3, &"alice".to_string(), &"bob".to_string(), None, None)
        .await
        .expect("create");

    save_match_state(&pool, &id, r#"{"hello":"world"}"#.to_string())
        .await
        .expect("overwrite");

    let stored = get_match_state(&pool, &id).await.expect("read back");
    assert_eq!(stored, r#"{"hello":"world"}"#);

    cleanup_match(&pool, &id).await;
}

#[tokio::test]
#[serial]
async fn test_save_match_players_updates_record() {
    let pool = test_pool().await;
    let id = random_id();

    create_match(&pool, &id, &3, &"p1".to_string(), &"waiting".to_string(), None, None)
        .await
        .expect("create");

    save_match_players(&pool, &id, "p1", "p2_replacement").await.expect("update");

    let (a, b) = get_match_players(&pool, &id).await.expect("read");
    assert_eq!(a, "p1");
    assert_eq!(b, "p2_replacement");

    cleanup_match(&pool, &id).await;
}

// ---------------------------------------------------------------------------
//  Random matchmaking
// ---------------------------------------------------------------------------

#[tokio::test]
#[serial]
async fn test_join_random_returns_error_when_empty() {
    let pool = test_pool().await;
    let err = join_random_online_match(&pool, "solo_player").await.err();
    assert!(matches!(err, Some(MatchError::NoMatchesAvailable)),
            "expected NoMatchesAvailable, got {:?}", err);
}

#[tokio::test]
#[serial]
async fn test_create_then_join_random_match() {
    let pool = test_pool().await;

    let id = create_random_online_match(&pool, &"creator_X".to_string(), 5)
        .await
        .expect("create");

    let joined_id = join_random_online_match(&pool, "joiner_Y")
        .await
        .expect("join");

    assert_eq!(id, joined_id, "joiner should pick up the exact match we created");

    // Players should now be creator / joiner.
    let (p1, p2) = get_match_players(&pool, &id).await.expect("players");
    assert_eq!(p1, "creator_X");
    assert_eq!(p2, "joiner_Y");

    // Status must flip to "active" after the join.
    let mut conn = pool.get().await.expect("pool");
    let status: String = redis::cmd("GET")
        .arg(format!("match:{}:status", id))
        .query_async(&mut *conn)
        .await
        .expect("status get");
    assert_eq!(status, "active");

    cleanup_match(&pool, &id).await;
}

#[tokio::test]
#[serial]
async fn test_random_pool_is_fifo() {
    let pool = test_pool().await;

    let first = create_random_online_match(&pool, &"first_creator".to_string(), 4)
        .await.expect("create first");
    let second = create_random_online_match(&pool, &"second_creator".to_string(), 4)
        .await.expect("create second");

    let first_joiner = join_random_online_match(&pool, "joiner_1").await.expect("join 1");
    let second_joiner = join_random_online_match(&pool, "joiner_2").await.expect("join 2");

    assert_eq!(first_joiner, first, "FIFO ordering broken for first slot");
    assert_eq!(second_joiner, second, "FIFO ordering broken for second slot");

    cleanup_match(&pool, &first).await;
    cleanup_match(&pool, &second).await;
}

// ---------------------------------------------------------------------------
//  Private matches & passwords
// ---------------------------------------------------------------------------

#[tokio::test]
#[serial]
async fn test_private_match_duplicate_id_rejected() {
    let pool = test_pool().await;
    let id = random_id();

    create_private_online_match(&pool, &"p1".to_string(), 5, &id, "pw")
        .await
        .expect("first create");

    let second = create_private_online_match(&pool, &"p1_again".to_string(), 5, &id, "pw")
        .await;
    assert!(matches!(second, Err(MatchError::MatchIdAlreadyExists)),
            "second create with same id should fail, got {:?}", second);

    cleanup_match(&pool, &id).await;
}

#[tokio::test]
#[serial]
async fn test_private_join_with_correct_password() {
    let pool = test_pool().await;
    let id = random_id();

    create_private_online_match(&pool, &"host".to_string(), 5, &id, "secret")
        .await
        .expect("create private");

    let joined = join_private_online_match(&pool, "guest", &id, "secret")
        .await
        .expect("join with correct password");
    assert_eq!(joined, id);

    let (p1, p2) = get_match_players(&pool, &id).await.expect("players");
    assert_eq!(p1, "host");
    assert_eq!(p2, "guest");

    cleanup_match(&pool, &id).await;
}

#[tokio::test]
#[serial]
async fn test_private_join_with_empty_password_is_rejected() {
    // Regression test: joining a password-protected match without supplying
    // a password must fail (historical bug where an absent Redis key could
    // make the comparison succeed).
    let pool = test_pool().await;
    let id = random_id();

    create_private_online_match(&pool, &"host".to_string(), 5, &id, "abc")
        .await
        .expect("create private");

    let err = join_private_online_match(&pool, "sneaky", &id, "")
        .await
        .err();
    assert!(matches!(err, Some(MatchError::WrongPassword)),
            "empty password should be rejected, got {:?}", err);

    cleanup_match(&pool, &id).await;
}

#[tokio::test]
#[serial]
async fn test_private_join_with_wrong_password_is_rejected() {
    let pool = test_pool().await;
    let id = random_id();

    create_private_online_match(&pool, &"host".to_string(), 5, &id, "correct")
        .await
        .expect("create private");

    let err = join_private_online_match(&pool, "guest", &id, "wrong")
        .await
        .err();
    assert!(matches!(err, Some(MatchError::WrongPassword)),
            "wrong password should be rejected, got {:?}", err);

    cleanup_match(&pool, &id).await;
}

#[tokio::test]
#[serial]
async fn test_private_join_nonexistent_match_is_rejected() {
    let pool = test_pool().await;
    let err = join_private_online_match(&pool, "guest", "does_not_exist_zzz", "pw")
        .await
        .err();
    assert!(matches!(err, Some(MatchError::MatchNotAvailable)),
            "joining nonexistent match should fail, got {:?}", err);
}

#[tokio::test]
#[serial]
async fn test_private_double_join_is_rejected() {
    // After the first join, status flips to "active". A second join must be
    // rejected with MatchNotAvailable.
    let pool = test_pool().await;
    let id = random_id();

    create_private_online_match(&pool, &"host".to_string(), 5, &id, "pw")
        .await
        .expect("create");
    join_private_online_match(&pool, "first_guest", &id, "pw")
        .await
        .expect("first join");

    let err = join_private_online_match(&pool, "second_guest", &id, "pw")
        .await
        .err();
    assert!(matches!(err, Some(MatchError::MatchNotAvailable)),
            "joining an already-active match should fail, got {:?}", err);

    cleanup_match(&pool, &id).await;
}
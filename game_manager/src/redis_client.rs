use bb8_redis::{bb8, RedisConnectionManager};
use rand::Rng;
use redis::AsyncCommands;
use thiserror::Error;
use crate::data::{YEN};

pub type RedisPool = bb8::Pool<RedisConnectionManager>;

#[derive(Error, Debug)]
pub enum MatchError {
    #[error("Error de Redis: {0}")]
    Redis(#[from] redis::RedisError),

    #[error("Error de Serialización: {0}")]
    Serialization(#[from] serde_json::Error),

    #[error("Error del pool de conexiones")]
    Pool,

    #[error("Error del Timeout de Lock de Redis")]
    LockTimeout,
    #[error("No match available")]
    NoMatchesAvailable,
    #[error("Match ID already exists")]
    MatchIdAlreadyExists,
    #[error("Invalid matchID or Password")]
    WrongPassword,
    #[error("Match not found")]
    MatchNotAvailable,
}

pub async fn acquire_lock(
    pool: &RedisPool,
    match_id: &str,
    ttl_secs: u64,
) -> Result<bool, MatchError> {
    let mut conn = pool.get().await.map_err(|_| MatchError::Pool)?;
    let lock_key = format!("lock:match:{}", match_id);

    let result: Option<String> = redis::cmd("SET")
        .arg(&lock_key)
        .arg("locked")
        .arg("NX")
        .arg("EX")
        .arg(ttl_secs)
        .query_async(&mut *conn)
        .await
        .map_err(MatchError::Redis)?;

    Ok(result.is_some())
}

pub async fn release_lock(pool: &RedisPool, match_id: &str) -> Result<(), MatchError> {
    let mut conn = pool.get().await.map_err(|_| MatchError::Pool)?;
    let lock_key = format!("lock:match:{}", match_id);
    let _: () = conn.del(lock_key).await.map_err(MatchError::Redis)?;
    Ok(())
}
pub async fn create_pool(redis_url: &str) -> RedisPool {
    let manager = RedisConnectionManager::new(redis_url)
        .expect("Error al crear el manager de Redis");
    bb8::Pool::builder()
        .build(manager)
        .await
        .expect("No se pudo crear el pool de Redis")
}

pub async fn save_match_state(
    pool: &RedisPool,
    match_id: &str,
    state_json: String
) -> Result<(), MatchError> {
    for _ in 0..10 {
        if acquire_lock(pool, match_id, 5).await? {
            let mut conn = pool.get().await.map_err(|_| MatchError::Pool)?;
            let key = format!("match:{}", match_id);

            let result: Result<(), MatchError> = conn
                .set_ex(key, state_json, 3600)
                .await
                .map_err(MatchError::Redis);

            release_lock(pool, match_id).await?;
            return result;
        }
        tokio::time::sleep(std::time::Duration::from_millis(50)).await;
    }

    Err(MatchError::LockTimeout)
}

pub async fn get_match_state(pool: &RedisPool, match_id: &str) -> Result<String, MatchError> {
    let mut conn = pool.get().await.map_err(|_| MatchError::Pool)?;

    let val: String = conn.get(format!("match:{}", match_id))
        .await
        .map_err(MatchError::Redis)?;

    Ok(val)
}

pub async fn save_match_players(pool: &RedisPool, match_id: &str, player1: &str, player2: &str) -> Result<(), MatchError> {
    let mut conn = pool.get().await.map_err(|_| MatchError::Pool)?;
    let value = format!("{}:{}", player1, player2);
    let _: () = conn.set_ex(format!("match:{}:players", match_id), value, 3600)
        .await
        .map_err(MatchError::Redis)?;
    Ok(())
}

pub async fn get_match_players(pool: &RedisPool, match_id: &str) -> Result<(String, String), MatchError> {
    let mut conn = pool.get().await.map_err(|_| MatchError::Pool)?;
    let value: String = conn.get(format!("match:{}:players", match_id))
        .await
        .map_err(MatchError::Redis)?;
    let parts: Vec<&str> = value.splitn(2, ':').collect();
    Ok((
        parts.get(0).unwrap_or(&"unknown").to_string(),
        parts.get(1).unwrap_or(&"unknown").to_string(),
    ))
}

pub async fn create_match(
    pool: &RedisPool,
    match_id: &String,
    size: &u32,
    player1: &String,
    player2: &String
) -> Result<(), MatchError> {

    let layout: String = (1u32..=*size)
        .map(|row| ".".repeat(row as usize))
        .collect::<Vec<_>>()
        .join("/");

    let initial_state = YEN::new(
        *size,
        0,
        vec!['B', 'R'],
        layout
    );

    let state_json = serde_json::to_string(&initial_state)?;

    save_match_players(pool, match_id, player1, player2).await?;

    save_match_state(pool, match_id, state_json).await?;

    Ok(())
}

pub async fn create_random_online_match(
    pool: &RedisPool,
    player1: &String,
    size: u32,
) -> Result<String, MatchError> {

    let match_id = loop {
        let id: String = rand::thread_rng()
            .sample_iter(&rand::distributions::Alphanumeric)
            .take(8)
            .map(char::from)
            .collect();

        let mut conn = pool.get().await.map_err(|_| MatchError::Pool)?;
        let exists: bool = conn.exists(format!("match:{}", id))
            .await
            .map_err(MatchError::Redis)?;

        if !exists { break id; }
    };

    create_match(pool, &match_id, &size, player1, &"waiting".to_string()).await?;

    let mut conn = pool.get().await.map_err(|_| MatchError::Pool)?;
    let _: () = conn
        .set_ex(format!("match:{}:status", &match_id), "waiting", 300)
        .await
        .map_err(MatchError::Redis)?;

    let _: () = conn.rpush("pool:random", &match_id)
        .await
        .map_err(MatchError::Redis)?;

    Ok(match_id)
}

pub async fn create_private_online_match(
    pool: &RedisPool,
    player1: &String,
    size: u32,
    match_id: &str,
    password: &str,
) -> Result<String, MatchError> {
    let mut conn = pool.get().await.map_err(|_| MatchError::Pool)?;

    let exists: bool = conn.exists(format!("match:{}", match_id))
        .await
        .map_err(MatchError::Redis)?;
    if exists {
        return Err(MatchError::MatchIdAlreadyExists);
    }

    create_match(pool, &match_id.to_string(), &size, player1, &"waiting".to_string()).await?;

    // Always store a password entry (even if empty) so joiners can distinguish
    // "no password set" from "key missing because of TTL expiry".
    let _: () = conn.set_ex(format!("match:{}:password", match_id), password, 3600)
        .await
        .map_err(MatchError::Redis)?;
    let _: () = conn.set_ex(format!("match:{}:status", match_id), "waiting", 3600)
        .await
        .map_err(MatchError::Redis)?;

    Ok(match_id.to_string())
}


pub async fn join_random_online_match(
    pool: &RedisPool,
    player2: &str,
) -> Result<String, MatchError> {
    let mut conn = pool.get().await.map_err(|_| MatchError::Pool)?;

    let match_id: Option<String> = conn.lpop("pool:random", None)
        .await
        .map_err(MatchError::Redis)?;

    let match_id = match_id.ok_or(MatchError::NoMatchesAvailable)?;

    let (player1, _) = get_match_players(pool, &match_id).await?;
    save_match_players(pool, &match_id, &player1, player2).await?;

    let _: () = conn.set_ex(format!("match:{}:status", &match_id), "active", 3600)
        .await
        .map_err(MatchError::Redis)?;

    Ok(match_id)
}

// Private join — BUG FIX: the previous version read the stored password with
// `let stored: String = conn.get(...)?;`. If the key doesn't exist, redis-rs
// deserialises the nil reply as the empty string, which made `stored != ""`
// return false and a no-password join against a password-protected match pass
// verification silently.
//
// We now:
//   1. Check the match exists BEFORE touching the password.
//   2. Read the password as Option<String>, treating "missing" as "no password
//      was ever set" (legacy matches) rather than as "empty password".
//   3. Keep a strict equality check: an empty submitted password against any
//      non-empty stored one (and vice-versa) is rejected.
pub async fn join_private_online_match(
    pool: &RedisPool,
    player2: &str,
    match_id: &str,
    password: &str,
) -> Result<String, MatchError> {
    let mut conn = pool.get().await.map_err(|_| MatchError::Pool)?;

    // 1) The match itself must exist. Guards against probing random IDs and
    // against the "key vanished" scenario that would otherwise make the check
    // below read an empty stored password.
    let match_exists: bool = conn.exists(format!("match:{}", match_id))
        .await
        .map_err(MatchError::Redis)?;
    if !match_exists {
        return Err(MatchError::MatchNotAvailable);
    }

    // 2) Password must be in waiting state.
    let status: Option<String> = conn.get(format!("match:{}:status", match_id))
        .await
        .map_err(MatchError::Redis)?;
    let status = status.unwrap_or_default();
    if status != "waiting" {
        return Err(MatchError::MatchNotAvailable);
    }

    // 3) Strict password verification. Option<String> lets us tell a missing
    // key from a key whose value is "".
    let stored_password: Option<String> = conn.get(format!("match:{}:password", match_id))
        .await
        .map_err(MatchError::Redis)?;
    let stored_password = stored_password.unwrap_or_default();

    if stored_password != password {
        return Err(MatchError::WrongPassword);
    }

    // 4) Actually join.
    let (player1, _) = get_match_players(pool, match_id).await?;
    save_match_players(pool, match_id, &player1, player2).await?;

    let _: () = conn.set_ex(format!("match:{}:status", match_id), "active", 3600)
        .await
        .map_err(MatchError::Redis)?;

    Ok(match_id.to_string())
}
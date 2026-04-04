use bb8_redis::{bb8, RedisConnectionManager};
use redis::AsyncCommands;
use thiserror::Error;
use crate::data::{YEN};

pub type RedisPool = bb8::Pool<RedisConnectionManager>;

#[derive(Error, Debug)]
pub enum MatchError {
    #[error("Redis error: {0}")]
    Redis(#[from] redis::RedisError),
    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),
    #[error("Connection pool error: {0}")]
    Pool,
    #[error("Redis lock timeout error")]
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

    // SET key value NX EX ttl → solo se setea si NO existe
    let result: Option<String> = redis::cmd("SET")
        .arg(&lock_key)
        .arg("locked")
        .arg("NX")
        .arg("EX")
        .arg(ttl_secs)
        .query_async(&mut *conn)
        .await
        .map_err(MatchError::Redis)?;

    Ok(result.is_some()) // true = adquirió el lock
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
    // Intentar adquirir el lock (máx ~500ms, 10 intentos cada 50ms)
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

    // Redis nos devuelve un String con el JSON que guardamos en create_match
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

    // 1. Crear el layout inicial (puntos '.')
    // El tamaño del layout para un tablero triangular es (n * (n + 1)) / 2
    let layout: String = (1u32..=*size)
        .map(|row| ".".repeat(row as usize))
        .collect::<Vec<_>>()
        .join("/");

    // 2. Crear el objeto YEN inicial
    let initial_state = YEN::new(
        *size,
        0,
        vec!['B', 'R'],
        layout
    );

    // 3. Convertir a JSON String
    let state_json = serde_json::to_string(&initial_state)?;

    // 4. Guardar los jugadores (usando tu lógica de separador ':')
    save_match_players(pool, match_id, player1, player2).await?;

    // 5. Guardar el estado inicial en Redis
    save_match_state(pool, match_id, state_json).await?;

    Ok(())
}

pub async fn create_random_online_match(
    pool: &RedisPool,
    player1: &str,
    size: u32,
) -> Result<String, MatchError> {

    // Generate match_id random
    let match_id = loop {
        let id: String = rand::thread_rng()
            .sample_iter(&rand::distributions::Alphanumeric)
            .take(8)
            .map(char::from)
            .collect();

        // Verification of none-existance
        let mut conn = pool.get().await.map_err(|_| MatchError::Pool)?;
        let exists: bool = conn.exists(format!("match:{}", id))
            .await
            .map_err(MatchError::Redis)?;

        if !exists { break id; }
    };

    // Crete match with 2nd player empty
    create_match(pool, &match_id, &size, player1, "waiting").await?;

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
    player1: &str,
    size: u32,
    match_id: &str,
    password: &str,
) -> Result<String, MatchError> {
    let mut conn = pool.get().await.map_err(|_| MatchError::Pool)?;

    // Verify that id is not in use
    let exists: bool = conn.exists(format!("match:{}", match_id))
        .await
        .map_err(MatchError::Redis)?;
    if exists {
        return Err(MatchError::MatchIdAlreadyExists);
    }

    create_match(pool, &match_id.to_string(), &size, player1, "waiting").await?;

    // Save password and status
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

    // Get oldest match in pool
    let match_id: Option<String> = conn.lpop("pool:random")
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

// Private join
pub async fn join_private_online_match(
    pool: &RedisPool,
    player2: &str,
    match_id: &str,
    password: &str,
) -> Result<(), MatchError> {
    let mut conn = pool.get().await.map_err(|_| MatchError::Pool)?;

    // Verificar contraseña
    let stored_password: String = conn.get(format!("match:{}:password", match_id))
        .await
        .map_err(MatchError::Redis)?;
    if stored_password != password {
        return Err(MatchError::WrongPassword);
    }

    // Verificar estado waiting
    let status: String = conn.get(format!("match:{}:status", match_id))
        .await
        .map_err(MatchError::Redis)?;
    if status != "waiting" {
        return Err(MatchError::MatchNotAvailable);
    }

    let (player1, _) = get_match_players(pool, match_id).await?;
    save_match_players(pool, match_id, &player1, player2).await?;

    let _: () = conn.set_ex(format!("match:{}:status", match_id), "active", 3600)
        .await
        .map_err(MatchError::Redis)?;

    Ok(())
}


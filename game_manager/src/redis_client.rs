use bb8_redis::{bb8, RedisConnectionManager};
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
    let mut conn = pool.get().await.map_err(|_| MatchError::Pool)?;

    let key = format!("match:{}", match_id);

    let _: () = conn.set_ex(key, state_json, 3600)
        .await
        .map_err(MatchError::Redis)?;

    Ok(())
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
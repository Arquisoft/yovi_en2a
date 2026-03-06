use bb8_redis::{bb8, RedisConnectionManager};
use redis::AsyncCommands;
use thiserror::Error;


pub type RedisPool = bb8::Pool<RedisConnectionManager>;

#[derive(Error, Debug)]
pub enum MatchError {
    #[error("Error de Redis: {0}")]
    Redis(#[from] redis::RedisError),
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

pub async fn save_match_state(pool: &RedisPool, match_id: &str, coordinate: i32) -> Result<(), MatchError> {
    let mut conn = pool.get().await.map_err(|_| MatchError::Pool)?;
    let _: () = conn.set_ex(format!("match:{}", match_id), coordinate, 3600)
        .await
        .map_err(MatchError::Redis)?;
    Ok(())
}

pub async fn get_match_state(pool: &RedisPool, match_id: &str) -> Result<i32, MatchError> {
    let mut conn = pool.get().await.map_err(|_| MatchError::Pool)?;
    let val: i32 = conn.get(format!("match:{}", match_id))
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
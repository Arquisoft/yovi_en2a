use bb8_redis::{bb8, RedisConnectionManager};
use redis::AsyncCommands;


pub type RedisPool = bb8::Pool<RedisConnectionManager>;

pub async fn create_pool(redis_url: &str) -> RedisPool {
    let manager = RedisConnectionManager::new(redis_url)
        .expect("Error al crear el manager de Redis");
    bb8::Pool::builder()
        .build(manager)
        .await
        .expect("No se pudo crear el pool de Redis")
}

pub async fn save_match_state(pool: &RedisPool, match_id: &str, coordinate: i32) -> Result<(), redis::RedisError> {
    let mut conn = pool.get().await.map_err(|_| {
        redis::RedisError::from((redis::ErrorKind::IoError, "Error al obtener conexión del pool"))
    })?;

    // Guardamos con un TTL (tiempo de vida) de 1 hora para no llenar la RAM
    let _: () = conn.set_ex(format!("match:{}", match_id), coordinate, 3600).await?;
    Ok(())
}

pub async fn get_match_state(pool: &RedisPool, match_id: &str) -> Result<i32, redis::RedisError> {
    let mut conn = pool.get().await.map_err(|_| {
        redis::RedisError::from((redis::ErrorKind::IoError, "Error al obtener conexión del pool"))
    })?;

    let val: i32 = conn.get(format!("match:{}", match_id)).await?;
    Ok(val)
}
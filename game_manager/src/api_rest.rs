use crate::redis_client;
use crate::data::{NewMatchRequest, NewMatchResponse, MoveRequest, MoveResponse, ValidRequest, ValidResponse, CheckMatchRequest, CheckMatchResponse};

use std::net::SocketAddr;
use std::sync::Arc;
use tokio::net::TcpListener;
use uuid::Uuid;
use axum::extract::FromRef;
use serde_json;

use axum::{
    extract::State,
    routing::{post, get},
    Json, Router,
};

pub fn get_gamey_url() -> String {
    let host = std::env::var("GAMEY").unwrap_or_else(|_| "localhost".to_string());
    format!("http://{}:4000", host)
}

#[derive(Clone)]
pub struct AppState {
    pub redis_pool: redis_client::RedisPool,
    pub gamey_url: String,
}

async fn create_match(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<NewMatchRequest>
) -> Json<NewMatchResponse> {
    let new_id = Uuid::new_v4().to_string();
    let _ = redis_client::save_match_state(&state.redis_pool, &new_id, 0).await;
    let _ = redis_client::save_match_players(&state.redis_pool, &new_id, &payload.player1, &payload.player2).await;
    Json(NewMatchResponse { match_id: new_id })
}

async fn check_match(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<CheckMatchRequest>
) -> Json<CheckMatchResponse> {
    let (player1, player2) = redis_client::get_match_players(&state.redis_pool, &payload.match_id)
        .await
        .unwrap_or_else(|_| ("unknown".to_string(), "unknown".to_string()));

    Json(CheckMatchResponse {
        match_id: payload.match_id,
        player1,
        player2,
    })
}

async fn request_move(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<MoveRequest>
) -> Json<MoveResponse> {
    let current_coord = redis_client::get_match_state(&state.redis_pool, &payload.match_id)
        .await
        .unwrap_or(0);

    Json(MoveResponse {
        yen_coordinate: current_coord,
        is_end: false,
    })
}

async fn check_valid(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<ValidRequest>
    ) -> Json<ValidResponse> {

    let _ = redis_client::save_match_state(
        &state.redis_pool,
        &payload.match_id,
        payload.yen_coordinate
    ).await;

    Json(ValidResponse {
        valid: true,
        is_end: false,
    })
}

async fn dump_redis(
    State(state): State<Arc<AppState>>,
) -> Json<serde_json::Value> {
    let mut conn = state.redis_pool.get().await.unwrap();

    let keys: Vec<String> = redis::cmd("KEYS")
        .arg("*")
        .query_async(&mut *conn)
        .await
        .unwrap_or_default();

    let mut result = serde_json::Map::new();

    for key in keys {
        let value: String = redis::cmd("GET")
            .arg(&key)
            .query_async(&mut *conn)
            .await
            .unwrap_or_else(|_| "null".to_string());

        result.insert(key, serde_json::Value::String(value));
    }

    Json(serde_json::Value::Object(result))
}


impl FromRef<Arc<AppState>> for AppState {
    fn from_ref(state: &Arc<AppState>) -> Self {
        state.as_ref().clone()
    }
}

pub async fn run() {
    // 1. Obtener config de REDIS
    let redis_host = std::env::var("REDIS_HOST").unwrap_or_else(|_| "127.0.0.1".to_string());
    let redis_port = std::env::var("REDIS_PORT").unwrap_or_else(|_| "6379".to_string());
    let redis_url = format!("redis://{}:{}/", redis_host, redis_port);
    let pool = redis_client::create_pool(&redis_url).await;

    // 2. Obtener config de GAMEY (En Docker será "gamey")
    let gamey_url = get_gamey_url();

    // Usamos Arc para que el estado sea compartido eficientemente
    let state = Arc::new(AppState {
        redis_pool: pool,
        gamey_url,
    });

    let app = Router::new()
        .route("/new", post(create_match))
        .route("/checkMatch", post(check_match))
        .route("/reqMove", post(request_move))
        .route("/isValid", post(check_valid))
        .route("/debug/redis", get(dump_redis))
        .with_state(state);

    let addr = SocketAddr::from(([0, 0, 0, 0], 5000));

    let listener = TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}


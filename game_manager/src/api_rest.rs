use crate::redis_client;
use crate::data::{NewMatchRequest, NewMatchResponse, MoveRequest, MoveResponse, ValidRequest, ValidResponse};

use std::net::SocketAddr;
use tokio::net::TcpListener;
use uuid::Uuid;

use axum::{
    extract::State,
    routing::post,
    Json, Router,
};


#[derive(Clone)]
struct AppState {
    redis_pool: redis_client::RedisPool,
}

async fn create_match(
    State(state): State<AppState>,
    Json(payload): Json<NewMatchRequest>
) -> Json<NewMatchResponse> {
    let new_id = Uuid::new_v4().to_string();
    let _ = crate::redis_client::save_match_state(&state.redis_pool, &new_id, 0).await;
    Json(NewMatchResponse { match_id: new_id })
}

async fn request_move(
    State(state): State<AppState>,
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
    State(state): State<AppState>,
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


pub async fn run() {
    let redis_host = std::env::var("REDIS_HOST").unwrap_or_else(|_| "127.0.0.1".to_string());
    let redis_port = std::env::var("REDIS_PORT").unwrap_or_else(|_| "6379".to_string());
    let redis_url = format!("redis://{}:{}/", redis_host, redis_port);
    let pool = redis_client::create_pool(&redis_url).await;

    let state = AppState { redis_pool: pool };

    let app: Router = Router::new()
        .route("/new", post(create_match))
        .route("/reqMove", post(request_move))
        .route("/isValid", post(check_valid))
        .with_state(state);

    let addr = SocketAddr::from(([127, 0, 0, 1], 5000));
    println!("🚀 GameManager escuchando en http://{}", addr);

    let listener = TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
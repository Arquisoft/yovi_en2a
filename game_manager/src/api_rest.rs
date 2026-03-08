use crate::redis_client;

use crate::data::{BotMoveResponse, Coordinates, EngineMoveRequest, EngineMoveResponse, EngineResponse, LocalRankingsRequest, LocalRankingsResponse, MoveRequest, MoveResponse, NewMatchRequest, NewMatchResponse, PlayResponse, RankingTimeResponse, ValidResponse, YEN};

use std::net::SocketAddr;
use std::sync::Arc;
use tokio::net::TcpListener;
use uuid::Uuid;
use axum::extract::FromRef;
use serde_json;
use reqwest::Client;

use axum::{
    extract::State,
    routing::{post, get},
    Json, Router,
};
use axum::http::StatusCode;

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
    let _ = redis_client::create_match(&state.redis_pool, &new_id,  &payload.size, &payload.player1, &payload.player2).await;
    Json(NewMatchResponse { match_id: new_id })
}

async fn execute_move(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<MoveRequest>,
) -> Result<Json<MoveResponse>, (StatusCode, String)> {

    // 1. Recoger el estado actual de Redis (el string JSON)
    let current_yen_json = redis_client::get_match_state(&state.redis_pool, &payload.match_id)
        .await
        .map_err(|_| (StatusCode::NOT_FOUND, "Partida no encontrada".to_string()))?;

    // 2. Enviar al Engine (Contenedor en puerto 4000)
    // Preparamos el cuerpo que el microservicio del Engine espera
    let engine_url = format!("{}/engine/move", state.gamey_url);
    let client = Client::new();

    let current_yen: serde_json::Value = serde_json::from_str(&current_yen_json)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let engine_payload = serde_json::json!({
        "state": current_yen,
        "x": payload.coord_x,
        "y": payload.coord_y,
        "z": payload.coord_z
    });

    let response = client.post(engine_url)
        .json(&engine_payload)
        .send()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Engine inalcanzable: {}, {}", e, current_yen)))?;

    let status = response.status();
    let body = response.text().await
        .unwrap_or_else(|_| "No response body".to_string());

    if !status.is_success() {
        return Err((StatusCode::BAD_REQUEST, format!("Movimiento ilegal según el Engine: {}", body)));
    }

    let engine_result: EngineResponse = serde_json::from_str(&body)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Error al leer respuesta del Engine {}: {}", &body,e)))?;

    // 3. Actualizar Redis con el nuevo estado devuelto por el Engine
    redis_client::save_match_state(
        &state.redis_pool,
        &payload.match_id,
        serde_json::to_string(&engine_result.new_yen_json)
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    ).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // 4. Responder al Frontend
    Ok(Json(MoveResponse {
        match_id: payload.match_id,
        game_over: engine_result.game_over,
    }))
}

#[axum::debug_handler]
async fn request_bot_move(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<EngineMoveRequest>
    ) -> Result<Json<EngineMoveResponse>, (StatusCode, String)> {

    let current_yen_json = redis_client::get_match_state(&state.redis_pool, &payload.match_id)
        .await
        .map_err(|_| (StatusCode::NOT_FOUND, "Partida no encontrada".to_string()))?;

    let current_yen: serde_json::Value = serde_json::from_str(&current_yen_json)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let (player1, bot_id) = redis_client::get_match_players(&state.redis_pool, &payload.match_id).await.unwrap();

    // 2. Enviar al Engine (Contenedor en puerto 4000)
    // Preparamos el cuerpo que el microservicio del Engine espera
    let engine_url = format!("{}/{}/ybot/play/{}", state.gamey_url, "v1", bot_id);
    let client = Client::new();

    let engine_payload = current_yen;

    let response = client.post(engine_url)
        .json(&engine_payload)
        .send()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Engine inalcanzable: {}", e)))?;


    let status = response.status();
    let body = response.text().await
        .unwrap_or_else(|_| "No response body".to_string());

    if !status.is_success() {
        return Err((StatusCode::BAD_REQUEST, format!("Error al generar un movimiento: {}", body)));
    }

    let engine_result: PlayResponse = serde_json::from_str(&body)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Error al leer respuesta del Engine {}: {}", &body,e)))?;

    redis_client::save_match_state(
        &state.redis_pool,
        &payload.match_id,
        serde_json::to_string(&engine_result.position)
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    ).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(EngineMoveResponse {
        coordinates: engine_result.coords,
        game_over: engine_result.game_over,
    }))
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

async fn get_local_rankings(
    Json(payload): Json<LocalRankingsRequest>
) -> Json<LocalRankingsResponse> {
    
    // Usamos 'match' para evaluar el Result de forma explícita y segura
    let matches = match crate::firebase::get_user_matches(&payload.user_id).await {
        
        // CASO 1: La base de datos responde correctamente y los tipos coinciden
        Ok(partidas_encontradas) => {
            partidas_encontradas
        },
        
        // CASO 2: Falla la conexión, no existe el documento, o los tipos del struct no coinciden
        Err(error) => {
            // Imprimimos el error real en los logs de Docker para poder solucionarlo
            eprintln!("🚨 ERROR LEYENDO FIRESTORE (Usuario: {}): {:?}", payload.user_id, error);
            
            // Devolvemos un vector vacío para que la app (el frontend) no crashee
            vec![]
        }
    };

    Json(LocalRankingsResponse { matches })
}

async fn get_best_times() -> Json<RankingTimeResponse> {

    let scores = crate::firebase::get_ranking_time()
        .await
        .unwrap_or_else(|_| vec![]); 

    Json(RankingTimeResponse { rankings: scores })
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
        .route("/executeMove", post(execute_move))
        .route("/reqBotMove", post(request_bot_move))
        .route("/debug/redis", get(dump_redis))
        .route("/localRankings", post(get_local_rankings))
        .route("/bestTimes", post(get_best_times))
        .with_state(state);

    let addr = SocketAddr::from(([0, 0, 0, 0], 5000));
    println!("🚀 GameManager escuchando en http://{}", addr);

    let listener = TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}


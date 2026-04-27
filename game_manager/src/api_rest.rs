use crate::redis_client;
use crate::data::{EngineMoveRequest, EngineMoveResponse, EngineResponse, LocalRankingsRequest, LocalRankingsResponse, Match, MoveRequest, MoveResponse, NewMatchRequest, NewMatchResponse, PlayResponse, RankingTimeResponse, SaveMatchRequest, SaveMatchResponse, UpdateScoreRequest, UpdateScoreResponse, ValidResponse, YEN, CreateOnlineMatchRequest, CreateOnlineMatchResponse,
                  JoinOnlineMatchRequest, JoinOnlineMatchResponse, UpdateOnlineMatchRequest, UpdateOnlineMatchResponse, MoveRequestOnline };

use std::net::SocketAddr;
use std::ops::Deref;
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};
use tokio::net::TcpListener;
use uuid::Uuid;
use axum::extract::{FromRef, Path};
use serde_json;
use reqwest::Client;

use axum::{
    extract::State,
    routing::{post, get, delete},
    Json, Router,
};
use axum::http::StatusCode;

/// How long after the 10s turn clock a player must be silent before the
/// opponent can claim the win by forfeit. Total wall-clock limit before a
const TURN_MS: u64 = 10_000;

pub fn get_gamey_url() -> String {
    let host = std::env::var("GAMEY").unwrap_or_else(|_| "localhost".to_string());
    format!("http://{}:4000", host)
}

#[derive(Clone)]
pub struct AppState {
    pub redis_pool: redis_client::RedisPool,
    pub gamey_url: String,
}

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

async fn stamp_turn_start(pool: &redis_client::RedisPool, match_id: &str) {
    if let Ok(mut conn) = pool.get().await {
        let _: Result<(), _> = redis::cmd("SET")
            .arg(format!("match:{}:turn_started_at", match_id))
            .arg(now_ms())
            .arg("EX")
            .arg(3600u64)
            .query_async(&mut *conn)
            .await;
    }
}

async fn create_match(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<NewMatchRequest>
) -> Json<NewMatchResponse> {
    let new_id = Uuid::new_v4().to_string();
    let _ = redis_client::create_match(&state.redis_pool, &new_id, &payload.size, &payload.player1, &payload.player2).await;
    Json(NewMatchResponse { match_id: new_id })
}

async fn execute_move(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<MoveRequest>,
) -> Result<Json<MoveResponse>, (StatusCode, String)> {

    let current_yen_json = redis_client::get_match_state(&state.redis_pool, &payload.match_id)
        .await
        .map_err(|_| (StatusCode::NOT_FOUND, "Match not found".to_string()))?;

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
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Unreachable engine: {}, {}", e, current_yen)))?;

    let status = response.status();
    let body = response.text().await
        .unwrap_or_else(|_| "No response body".to_string());

    if !status.is_success() {
        return Err((StatusCode::BAD_REQUEST, format!("Illegal movement: {}", body)));
    }

    let engine_result: EngineResponse = serde_json::from_str(&body)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Error reading engine response {}: {}", &body,e)))?;

    redis_client::save_match_state(
        &state.redis_pool,
        &payload.match_id,
        serde_json::to_string(&engine_result.new_yen_json)
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    ).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if engine_result.game_over {
        // Settle the match. The engine has flipped `turn` to the next
        // player, so whoever has the turn on the POST-move YEN is the
        // loser, and the winner is the other seat.
        if let Ok((p1, p2)) = redis_client::get_match_players(&state.redis_pool, &payload.match_id).await {
            let post_turn = engine_result.new_yen_json.turn();
            // If the engine says it's P1's (turn 0) turn now, then P1 is
            // the loser and P2 (who just moved) is the winner. Swap.
            let winner_id = if post_turn == 0 { p2.clone() } else { p1.clone() };

            if let Ok(mut conn) = state.redis_pool.get().await {
                let _: Result<(), _> = redis::cmd("SET")
                    .arg(format!("match:{}:winner", payload.match_id))
                    .arg(&winner_id)
                    .arg("EX").arg(3600u64)
                    .query_async(&mut *conn).await;
                let _: Result<(), _> = redis::cmd("SET")
                    .arg(format!("match:{}:end_reason", payload.match_id))
                    .arg("normal")
                    .arg("EX").arg(3600u64)
                    .query_async(&mut *conn).await;
                let _: Result<(), _> = redis::cmd("SET")
                    .arg(format!("match:{}:status", payload.match_id))
                    .arg("finished")
                    .arg("EX").arg(3600u64)
                    .query_async(&mut *conn).await;
            }
        }
    } else {
        stamp_turn_start(&state.redis_pool, &payload.match_id).await;
    }

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

    for _ in 0..20 {
        let lock_key = format!("lock:match:{}", payload.match_id);
        let mut conn = state.redis_pool.get().await
            .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "Pool error".to_string()))?;

        let exists: bool = redis::cmd("EXISTS")
            .arg(&lock_key)
            .query_async(&mut *conn)
            .await
            .unwrap_or(false);

        if !exists {
            break;
        }
        tokio::time::sleep(std::time::Duration::from_millis(50)).await;
    }

    let current_yen_json = redis_client::get_match_state(&state.redis_pool, &payload.match_id)
        .await
        .map_err(|_| (StatusCode::NOT_FOUND, "Match not found".to_string()))?;

    let current_yen: serde_json::Value = serde_json::from_str(&current_yen_json)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let (_player1, bot_id) = redis_client::get_match_players(&state.redis_pool, &payload.match_id).await.unwrap();

    let engine_url = format!("{}/{}/ybot/player_play/{}", state.gamey_url, "v1", bot_id);
    let client = Client::new();

    let engine_payload = current_yen;

    let response = client.post(engine_url)
        .json(&engine_payload)
        .send()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Unreachable engine: {}", e)))?;


    let status = response.status();
    let body = response.text().await
        .unwrap_or_else(|_| "No response body".to_string());

    if !status.is_success() {
        return Err((StatusCode::BAD_REQUEST, format!("Error generating a movement: {}", body)));
    }

    let engine_result: PlayResponse = serde_json::from_str(&body)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Error reading engine response {}: {}", &body,e)))?;

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
    let matches = match crate::firebase::get_user_matches(&payload.user_id).await {
        Ok(partidas_encontradas) => partidas_encontradas,
        Err(error) => {
            eprintln!("ERROR LEYENDO FIRESTORE (Usuario: {}): {:?}", payload.user_id, error);
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

async fn update_user_score(
    State(_state): State<Arc<AppState>>,
    Json(payload): Json<UpdateScoreRequest>
) -> Result<Json<UpdateScoreResponse>, (StatusCode, String)> {

    crate::firebase::update_score(
        &payload.playerid,
        &payload.username,
        payload.is_win,
        payload.time
    ).await.map_err(|e| {
        eprintln!("Error updating score: {:?}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, "Error updating data base".to_string())
    })?;

    Ok(Json(UpdateScoreResponse {
        message: "Score updated correctly".to_string()
    }))
}

async fn save_match(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<SaveMatchRequest>
) -> Result<Json<SaveMatchResponse>, (StatusCode, String)> {
    let current_yen_json = redis_client::get_match_state(&state.redis_pool, &payload.match_id)
        .await
        .map_err(|_| (StatusCode::NOT_FOUND, "Match not found in Redis".to_string()))?;

    let board_status: YEN = serde_json::from_str(&current_yen_json)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Error reading YEN: {}", e)))?;

    let created_at = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    let match_data = Match {
        player1id: payload.player1id,
        player2id: payload.player2id,
        result: payload.result,
        board_status,
        time: payload.time,
        moves: payload.moves,
        created_at,
    };

    crate::firebase::insert_match_by_id(&payload.match_id, match_data)
        .await
        .map_err(|e| {
            eprintln!("Error saving the match: {:?}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, "Error saving the match in Firebase".to_string())
        })?;

    Ok(Json(SaveMatchResponse {
        message: "Match saved correctly".to_string()
    }))
}

async fn create_online_match(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<CreateOnlineMatchRequest>
) -> Result<Json<CreateOnlineMatchResponse>, (StatusCode, String)> {

    let match_id = if payload.match_id.is_empty() {
        redis_client::create_random_online_match(&state.redis_pool, &payload.player1id, payload.size).await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    } else {
        redis_client::create_private_online_match(&state.redis_pool, &payload.player1id, payload.size, &payload.match_id, &payload.match_password).await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    };

    Ok(Json(CreateOnlineMatchResponse { match_id, turn_number: 0 }))
}

async fn join_online_match(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<JoinOnlineMatchRequest>)
    -> Result<Json<JoinOnlineMatchResponse>, (StatusCode, String)> {

    let match_id = if payload.match_id.is_empty() {
        redis_client::join_random_online_match(&state.redis_pool, &payload.player2id).await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    }else{
        redis_client::join_private_online_match(&state.redis_pool, &payload.player2id, &payload.match_id, &payload.match_password).await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    };

    // P2 is the one who just joined, so the "start now" moment is here plus
    // a 3s grace window so both clients have time to navigate in.
    if let Ok(mut conn) = state.redis_pool.get().await {
        let grace_start = now_ms() + 3_000;
        let _: Result<(), _> = redis::cmd("SET")
            .arg(format!("match:{}:turn_started_at", match_id))
            .arg(grace_start)
            .arg("EX")
            .arg(3600u64)
            .query_async(&mut *conn)
            .await;
    }

    Ok(Json(JoinOnlineMatchResponse { match_id, turn_number: 1 }))
}


async fn request_online_update(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<UpdateOnlineMatchRequest>
) -> Result<Json<UpdateOnlineMatchResponse>, (StatusCode, String)> {

    for _ in 0..40 {
        let yen_json = redis_client::get_match_state(&state.redis_pool, &payload.match_id)
            .await
            .map_err(|_| (StatusCode::NOT_FOUND, "Match not found".to_string()))?;

        let yen: YEN = serde_json::from_str(&yen_json)
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

        if yen.turn() == payload.turn_number {
            return Ok(Json(UpdateOnlineMatchResponse { match_id: payload.match_id.clone(), board_status: yen }));
        }

        tokio::time::sleep(std::time::Duration::from_millis(500)).await;
    }

    Err((StatusCode::REQUEST_TIMEOUT, "Timeout waiting for your turn".to_string()))
}

async fn match_status(
    State(state): State<Arc<AppState>>,
    Path(match_id): Path<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let mut conn = state.redis_pool.get().await
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "Pool error".to_string()))?;

    let status: Option<String> = redis::cmd("GET")
        .arg(format!("match:{}:status", match_id))
        .query_async(&mut *conn)
        .await
        .unwrap_or(None);

    let status = status.ok_or((StatusCode::NOT_FOUND, "Match not found".to_string()))?;

    let players: Option<String> = redis::cmd("GET")
        .arg(format!("match:{}:players", match_id))
        .query_async(&mut *conn)
        .await
        .unwrap_or(None);

    let (player1, player2) = match players {
        Some(raw) => {
            let mut parts = raw.splitn(2, ':');
            let p1 = parts.next().unwrap_or("").to_string();
            let p2 = parts.next().unwrap_or("").to_string();
            (p1, p2)
        }
        None => ("".to_string(), "".to_string()),
    };

    // Winner key is only set when the match has been settled (normal finish
    // OR forfeit). Absent otherwise.
    let winner: Option<String> = redis::cmd("GET")
        .arg(format!("match:{}:winner", match_id))
        .query_async(&mut *conn)
        .await
        .unwrap_or(None);

    let reason: Option<String> = redis::cmd("GET")
        .arg(format!("match:{}:end_reason", match_id))
        .query_async(&mut *conn)
        .await
        .unwrap_or(None);

    let ready = status == "active" && !player2.is_empty() && player2 != "waiting";

    Ok(Json(serde_json::json!({
        "match_id": match_id,
        "status": status,
        "player1id": player1,
        "player2id": player2,
        "ready": ready,
        "winner": winner,
        "end_reason": reason,
    })))
}

async fn match_turn_info(
    State(state): State<Arc<AppState>>,
    Path(match_id): Path<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let yen_json = redis_client::get_match_state(&state.redis_pool, &match_id)
        .await
        .map_err(|_| (StatusCode::NOT_FOUND, "Match not found".to_string()))?;

    let yen: YEN = serde_json::from_str(&yen_json)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let mut conn = state.redis_pool.get().await
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "Pool error".to_string()))?;

    let turn_started_at: Option<u64> = redis::cmd("GET")
        .arg(format!("match:{}:turn_started_at", match_id))
        .query_async(&mut *conn)
        .await
        .unwrap_or(None);

    let now = now_ms();
    let turn_started_at = turn_started_at.unwrap_or(now);

    Ok(Json(serde_json::json!({
        "match_id": match_id,
        "turn": yen.turn(),
        "turn_started_at": turn_started_at,
        "now_server": now,
        "turn_duration_ms": TURN_MS,
    })))
}

/// Remove every key associated with a waiting match so it vanishes from
/// Redis and the matchmaking pool. Idempotent: works on missing matches.
/// Rejects active matches to avoid nuking someone else's game silently.
async fn cancel_match(
    State(state): State<Arc<AppState>>,
    Path(match_id): Path<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let mut conn = state.redis_pool.get().await
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "Pool error".to_string()))?;

    let status: Option<String> = redis::cmd("GET")
        .arg(format!("match:{}:status", match_id))
        .query_async(&mut *conn)
        .await
        .unwrap_or(None);

    if let Some(s) = status.as_deref() {
        if s == "active" {
            return Err((
                StatusCode::CONFLICT,
                "Match is already active, cannot be cancelled".to_string(),
            ));
        }
    }

    let keys = [
        format!("match:{}", match_id),
        format!("match:{}:players", match_id),
        format!("match:{}:status", match_id),
        format!("match:{}:password", match_id),
        format!("match:{}:turn_started_at", match_id),
        format!("match:{}:winner", match_id),
        format!("match:{}:end_reason", match_id),
        format!("lock:match:{}", match_id),
    ];

    for k in keys {
        let _: Result<(), _> = redis::cmd("DEL")
            .arg(k)
            .query_async(&mut *conn)
            .await;
    }

    let _: Result<(), _> = redis::cmd("LREM")
        .arg("pool:random")
        .arg(0i64)
        .arg(&match_id)
        .query_async(&mut *conn)
        .await;

    Ok(Json(serde_json::json!({
        "match_id": match_id,
        "cancelled": true,
    })))
}

/// Server-side forfeit gate: the caller asks "my opponent has been silent
/// for too long, can I claim the win?" and we verify against the wall clock.
///
/// The request body is `{ "match_id": "...", "claimant_id": "<username>" }`.
/// `claimant_id` must match one of the two players, and must NOT be the one
/// whose turn it currently is — the player with the clock running can't
/// claim a forfeit on themselves.
async fn claim_forfeit(
    State(state): State<Arc<AppState>>,
    Path(match_id): Path<String>,
    Json(payload): Json<serde_json::Value>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let claimant_id = payload.get("claimant_id")
        .and_then(|v| v.as_str())
        .ok_or((StatusCode::BAD_REQUEST, "claimant_id is required".to_string()))?
        .to_string();

    let mut conn = state.redis_pool.get().await
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "Pool error".to_string()))?;

    // Load players and make sure the claimant is one of them.
    let players_raw: Option<String> = redis::cmd("GET")
        .arg(format!("match:{}:players", match_id))
        .query_async(&mut *conn)
        .await
        .unwrap_or(None);
    let players_raw = players_raw.ok_or((StatusCode::NOT_FOUND, "Match not found".to_string()))?;
    let mut parts = players_raw.splitn(2, ':');
    let player1 = parts.next().unwrap_or("").to_string();
    let player2 = parts.next().unwrap_or("").to_string();

    if claimant_id != player1 && claimant_id != player2 {
        return Err((StatusCode::FORBIDDEN, "Claimant is not part of this match".to_string()));
    }



    // Settle the match: claimant wins, opponent forfeits.
    let _: Result<(), _> = redis::cmd("SET")
        .arg(format!("match:{}:winner", match_id))
        .arg(&claimant_id)
        .arg("EX")
        .arg(3600u64)
        .query_async(&mut *conn)
        .await;
    let _: Result<(), _> = redis::cmd("SET")
        .arg(format!("match:{}:end_reason", match_id))
        .arg("forfeit")
        .arg("EX")
        .arg(3600u64)
        .query_async(&mut *conn)
        .await;
    let _: Result<(), _> = redis::cmd("SET")
        .arg(format!("match:{}:status", match_id))
        .arg("finished")
        .arg("EX")
        .arg(3600u64)
        .query_async(&mut *conn)
        .await;

    Ok(Json(serde_json::json!({
        "match_id": match_id,
        "accepted": true,
        "winner": claimant_id,
        "end_reason": "forfeit",
    })))
}

impl FromRef<Arc<AppState>> for AppState {
    fn from_ref(state: &Arc<AppState>) -> Self {
        state.as_ref().clone()
    }
}

pub fn build_router(state: Arc<AppState>) -> Router {
    Router::new()
        .route("/new", post(create_match))
        .route("/executeMove", post(execute_move))
        .route("/executeMoveOnline", post(execute_move_online))
        .route("/reqBotMove", post(request_bot_move))
        .route("/debug/redis", get(dump_redis))
        .route("/localRankings", post(get_local_rankings))
        .route("/bestTimes", get(get_best_times))
        .route("/updateScore", post(update_user_score))
        .route("/saveMatch", post(save_match))
        .route("/createMatch", post(create_online_match))
        .route("/joinMatch", post(join_online_match))
        .route("/requestOnlineGameUpdate", post(request_online_update))
        .route("/matchStatus/{match_id}", get(match_status))
        .route("/matchTurnInfo/{match_id}", get(match_turn_info))
        .route("/cancelMatch/{match_id}", delete(cancel_match))
        .route("/claimForfeit/{match_id}", post(claim_forfeit))
        .with_state(state)
}


async fn execute_move_online(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<MoveRequestOnline>,
) -> Result<Json<MoveResponse>, (StatusCode, String)> {

    let current_yen_json = redis_client::get_match_state(&state.redis_pool, &payload.match_id)
        .await
        .map_err(|_| (StatusCode::NOT_FOUND, "Match not found".to_string()))?;

    let current_yen: serde_json::Value = serde_json::from_str(&current_yen_json)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    
    let turn = current_yen
        .get("turn")
        .and_then(|v| v.as_u64())
        .ok_or((
            StatusCode::INTERNAL_SERVER_ERROR,
            "Invalid board state: missing 'turn' field".to_string(),
        ))?;

    if turn == payload.player_id as u64{
        execute_move(
            State(state),
            Json(MoveRequest {
                match_id: payload.match_id,
                coord_x: payload.coord_x,
                coord_y: payload.coord_y,
                coord_z: payload.coord_z,
            }),
        )
            .await
    } else {
        Err((
            StatusCode::FORBIDDEN,
            format!(
                "Not your turn. Current turn: {}, your player_id: {}",
                turn, payload.player_id
            ),
        ))
    }
}


#[cfg(test)]
mod tests {
    use super::*;
    use serial_test::serial;

    #[test]
    #[serial]
    fn get_gamey_url_returns_default_when_env_unset() {
        // SAFETY: tests are serialised via `serial_test`; no concurrent env access.
        unsafe { std::env::remove_var("GAMEY") };
        assert_eq!(get_gamey_url(), "http://localhost:4000");
    }

    #[test]
    #[serial]
    fn get_gamey_url_uses_gamey_env_var() {
        // SAFETY: tests are serialised via `serial_test`; no concurrent env access.
        unsafe { std::env::set_var("GAMEY", "gamey-service") };
        let url = get_gamey_url();
        unsafe { std::env::remove_var("GAMEY") };
        assert_eq!(url, "http://gamey-service:4000");
    }

    #[test]
    fn now_ms_returns_positive_value() {
        assert!(now_ms() > 0);
    }

    #[test]
    fn now_ms_is_close_to_system_time() {
        use std::time::{SystemTime, UNIX_EPOCH};
        let expected = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64;
        let got = now_ms();
        assert!(
            got.abs_diff(expected) < 1_000,
            "now_ms() = {got}, expected ≈ {expected}"
        );
    }
    #[tokio::test]
    #[serial]
    #[ignore = "requires a running Redis instance"]
    async fn request_bot_move_reaches_get_players_and_engine_url_lines() {
        use tower::ServiceExt;

        let redis_host = std::env::var("REDIS_HOST").unwrap_or_else(|_| "127.0.0.1".to_string());
        let redis_port = std::env::var("REDIS_PORT").unwrap_or_else(|_| "6379".to_string());
        let pool = crate::redis_client::create_pool(
            &format!("redis://{}:{}/", redis_host, redis_port)
        ).await;

        let match_id = "test-bot-cov-001".to_string();
        crate::redis_client::create_match(
            &pool, &match_id, &3,
            &"human".to_string(), &"easy".to_string(),
        ).await.unwrap();

        let state = Arc::new(AppState {
            redis_pool: pool,
            // Port 19999 is intentionally unreachable — the test only needs
            // execution to reach the get_match_players and engine_url lines
            // before the HTTP call to gamey fails with 500.
            gamey_url: "http://127.0.0.1:19999".to_string(),
        });

        let body = serde_json::json!({ "match_id": match_id }).to_string();
        let response = build_router(state)
            .oneshot(
                axum::http::Request::builder()
                    .method("POST")
                    .uri("/reqBotMove")
                    .header("content-type", "application/json")
                    .body(axum::body::Body::from(body))
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::INTERNAL_SERVER_ERROR);
    }
}

pub async fn run() {
    let redis_host = std::env::var("REDIS_HOST").unwrap_or_else(|_| "127.0.0.1".to_string());
    let redis_port = std::env::var("REDIS_PORT").unwrap_or_else(|_| "6379".to_string());
    let redis_url = format!("redis://{}:{}/", redis_host, redis_port);
    let pool = redis_client::create_pool(&redis_url).await;

    let gamey_url = get_gamey_url();

    let state = Arc::new(AppState {
        redis_pool: pool,
        gamey_url,
    });

    let app = build_router(state);

    let addr = SocketAddr::from(([0, 0, 0, 0], 5000));
    println!("GameManager listening in http://{}", addr);

    let listener = TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
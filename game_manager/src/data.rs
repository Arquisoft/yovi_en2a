use serde::{Deserialize, Serialize};
use gamey::notation::{YEN};

pub trait DBData: Serialize + for<'de> Deserialize<'de> + std::fmt::Debug  + Send + Sync {}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct Match{
    pub player1id: String,
    pub player2id: String,
    pub result: String,
    pub board_status:YEN
}
impl DBData for Match {}




// API Request/Response models
#[derive(Deserialize)]
pub struct NewMatchRequest {
    pub player1: String,
    pub player2: String,
}

#[derive(Serialize)]
pub struct NewMatchResponse {
    pub match_id: String,
}

#[derive(Deserialize)]
pub struct MoveRequest {
    pub match_id: String,
}

#[derive(Serialize)]
pub struct MoveResponse {
    pub yen_coordinate: i32,
    pub is_end: bool,
}

#[derive(Deserialize)]
pub struct ValidRequest {
    pub match_id: String,
    pub yen_coordinate: i32,
}

#[derive(Serialize)]
pub struct ValidResponse {
    pub valid: bool,
    pub is_end: bool,
}
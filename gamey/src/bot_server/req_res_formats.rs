use serde::{Deserialize, Serialize};
use crate::YEN;

#[derive(Deserialize)]
pub struct ProcessMoveRequest {
    pub state: YEN,              // El estado que viene de Redis (vía GameManager)
    pub x: u32,                  // Coordenadas del movimiento
    pub y: u32,
    pub z: u32,
}

#[derive(Serialize)]
pub struct ProcessMoveResponse {
    pub new_yen_json: YEN,
    pub game_over: bool,
    /// Permanent hole cell indices (non-empty only for holey_y).
    pub hole_cells: Vec<u32>,
    /// Temporarily blocked cell indices for the next turn (non-empty only for tabu_y).
    pub blocked_cells: Vec<u32>,
}

#[derive(Deserialize)]
pub struct InitGameRequest {
    pub size: u32,
    #[serde(default)]
    pub variant: Option<String>,
    #[serde(default)]
    pub hole_count: Option<u32>,
}

#[derive(Serialize)]
pub struct InitGameResponse {
    pub yen: YEN,
    pub hole_cells: Vec<u32>,
}
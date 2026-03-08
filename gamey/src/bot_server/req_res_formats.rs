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
    pub new_yen_json: YEN,          // El nuevo estado para guardar en Redis
    pub game_over: bool,         // Si alguien ganó
}
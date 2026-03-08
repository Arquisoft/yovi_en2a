use std::ffi::c_float;
use jsonwebtoken::signature::digest::typenum::Integer;
use serde::{Deserialize, Serialize};
use crate::api_rest::get_gamey_url;
pub trait DBData: Serialize + for<'de> Deserialize<'de> + std::fmt::Debug  + Send + Sync {}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct YEN {
    /// The board size (length of one side of the triangle).
    size: u32,
    /// The index of the player whose turn it is (0-indexed).
    turn: u32,
    /// Character symbols representing each player.
    players: Vec<char>,
    /// A compact string representation of the board.
    ///
    /// Rows are separated by '/', with cells represented by player symbols
    /// or '.' for empty cells. Example: "B/..R/.B.R"
    layout: String,
}

impl YEN {
    /// Creates a new YEN representation.
    ///
    /// # Arguments
    /// * `size` - The board size
    /// * `turn` - Index of the player to move (0 or 1)
    /// * `players` - Character symbols for each player
    /// * `layout` - The board layout string
    pub fn new(size: u32, turn: u32, players: Vec<char>, layout: String) -> Self {
        YEN {
            size,
            turn,
            players,
            layout,
        }
    }

    /// Returns the board layout string.
    pub fn layout(&self) -> &str {
        &self.layout
    }

    /// Returns the board size.
    pub fn size(&self) -> u32 {
        self.size
    }

    /// Returns the index of the player whose turn it is.
    pub fn turn(&self) -> u32 {
        self.turn
    }

    /// Returns the player symbols.
    pub fn players(&self) -> &[char] {
        &self.players
    }
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct Match{
    pub player1id: String,
    pub player2id: String,
    pub result: String,
    pub board_status:YEN,
}
impl DBData for Match {}


#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct Score{
    pub playerid: String,
    pub username: String,
    pub total_matches: i32,
    pub wins : i32,
    pub losses: i32,
    pub win_rate: c_float,
    pub elo: i32,
    pub best_time: i32
}
impl DBData for Score {}



// API Request/Response models
#[derive(Deserialize)]
pub struct NewMatchRequest {
    pub player1: String,
    pub player2: String,
    pub size: u32,
}

#[derive(Serialize)]
pub struct NewMatchResponse {
    pub match_id: String,
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

#[derive(Deserialize)]
pub struct LocalRankingsRequest {
    pub user_id: String, 
}

#[derive(Serialize)]
pub struct LocalRankingsResponse {
    pub matches: Vec<Match>, 
}

#[derive(Serialize)]
pub struct RankingTimeResponse {
    pub rankings: Vec<Score>,
}

#[derive(Deserialize)]
pub struct MoveRequest {
    pub match_id: String,
    pub coord_x: u32,
    pub coord_y: u32,
    pub coord_z: u32,
}

#[derive(Serialize)]
pub struct MoveResponse {
    pub match_id: String,
    pub game_over: bool,
}

#[derive(serde::Deserialize)]
pub struct EngineResponse {
    pub new_yen_json: serde_json::Value,
    pub game_over: bool,
}

#[derive(serde::Deserialize, serde::Serialize)]
pub struct EngineMoveRequest {
    pub match_id: String,
}

#[derive(serde::Deserialize, serde::Serialize)]
pub struct EngineMoveResponse {
    pub coordinates: Coordinates,
    pub game_over: bool,
}


#[derive(serde::Deserialize)]
pub struct BotMoveResponse {
    /// The API version used for this request.
    pub api_version: String,
    /// The bot that selected this move.
    pub bot_id: String,
    /// The coordinates where the bot chooses to place its piece.
    pub coords: Coordinates,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct Coordinates {
    pub x: u32,
    pub y: u32,
    pub z: u32,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct PlayResponse {
    /// The API version used for this request.
    pub api_version: String,
    /// The bot that selected this move.
    pub bot_id: String,
    /// The coordinates where the bot chose to place its piece.
    pub coords: Coordinates,
    /// The updated board state in YEN notation after the bot's move.
    pub position: YEN,
    /// Whether the game is finished after this move.
    pub game_over: bool,
    /// The winner's symbol ("B" or "R") if the game is over, otherwise null.
    pub winner: Option<String>,
}
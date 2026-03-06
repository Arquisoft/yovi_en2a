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

#[derive(Deserialize)]
pub struct CheckMatchRequest {
    pub match_id: String,
    pub player1: String,
    pub player2: String,
}

#[derive(Serialize)]
pub struct CheckMatchResponse {
    pub match_id: String,
    pub player1: String,
    pub player2: String,
}
use crate::{GameY, GameStatus, Movement, YEN, check_api_version, error::ErrorResponse, state::AppState};
use axum::{
    Json,
    extract::{Path, State},
};
use serde::{Deserialize, Serialize};

/// Path parameters extracted from the play endpoint URL.
#[derive(Deserialize)]
pub struct PlayParams {
    /// The API version (e.g., "v1").
    api_version: String,
    /// The identifier of the bot to use for move selection.
    bot_id: String,
}

/// Response returned by the play endpoint on success.
///
/// Contains the updated board state in YEN notation after the bot has played,
/// along with the coordinates of the move that was made.
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct PlayResponse {
    /// The API version used for this request.
    pub api_version: String,
    /// The bot that selected this move.
    pub bot_id: String,
    /// The coordinates where the bot chose to place its piece.
    pub coords: crate::Coordinates,
    /// The updated board state in YEN notation after the bot's move.
    pub position: YEN,
    /// Whether the game is finished after this move.
    pub game_over: bool,
    /// The winner's symbol ("B" or "R") if the game is over, otherwise null.
    pub winner: Option<String>,
}

/// Handler for the bot play endpoint.
///
/// This endpoint accepts a game state in YEN format and returns the updated
/// board state in YEN format after the bot has played its move, along with
/// game status information.
///
/// # Route
/// `POST /{api_version}/ybot/play/{bot_id}`
///
/// # Request Body
/// A JSON object in YEN format representing the current game state.
///
/// # Response
/// On success, returns a `PlayResponse` with the updated YEN position.
/// On failure, returns an `ErrorResponse` with details about what went wrong.
#[axum::debug_handler]
pub async fn play(
    State(state): State<AppState>,
    Path(params): Path<PlayParams>,
    Json(yen): Json<YEN>,
) -> Result<Json<PlayResponse>, Json<ErrorResponse>> {
    check_api_version(&params.api_version)?;

    let mut game = match GameY::try_from(yen) {
        Ok(g) => g,
        Err(err) => return Err(Json(ErrorResponse::error(
            &format!("Invalid YEN position: {}", err),
            Some(params.api_version),
            Some(params.bot_id),
        ))),
    };

    let bot = match state.bots().find(&params.bot_id) {
        Some(b) => b,
        None => {
            let available = state.bots().names().join(", ");
            return Err(Json(ErrorResponse::error(
                &format!("Bot not found: {}, available bots: [{}]", params.bot_id, available),
                Some(params.api_version),
                Some(params.bot_id),
            )));
        }
    };

    let player = match game.next_player() {
        Some(p) => p,
        None => return Err(Json(ErrorResponse::error(
            "Game is already over — no moves can be made",
            Some(params.api_version),
            Some(params.bot_id),
        ))),
    };

    let coords = match bot.choose_move(&game) {
        Some(c) => c,
        None => return Err(Json(ErrorResponse::error(
            "No valid moves available for the bot",
            Some(params.api_version),
            Some(params.bot_id),
        ))),
    };

    if let Err(err) = game.add_move(Movement::Placement { player, coords }) {
        return Err(Json(ErrorResponse::error(
            &format!("Failed to apply bot move: {}", err),
            Some(params.api_version),
            Some(params.bot_id),
        )));
    }

    let game_over = game.check_game_over();
    let winner = match game.status() {
        GameStatus::Finished { winner } => {
            Some(if winner.id() == 0 { "B".to_string() } else { "R".to_string() })
        }
        GameStatus::Ongoing { .. } => None,
    };

    Ok(Json(PlayResponse {
        api_version: params.api_version,
        bot_id: params.bot_id,
        coords,
        position: YEN::from(&game),
        game_over,
        winner,
    }))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_play_response_creation() {
        let yen = YEN::new(3, 1, vec!['B', 'R'], "B/BR/.R.".to_string());
        let response = PlayResponse {
            api_version: "v1".to_string(),
            bot_id: "minimax_bot".to_string(),
            coords: crate::Coordinates::new(0, 0, 2),
            position: yen,
            game_over: false,
            winner: None,
        };
        assert_eq!(response.api_version, "v1");
        assert_eq!(response.bot_id, "minimax_bot");
        assert!(!response.game_over);
        assert!(response.winner.is_none());
    }

    #[test]
    fn test_play_response_with_winner() {
        let yen = YEN::new(3, 1, vec!['B', 'R'], "B/BB/BBB".to_string());
        let response = PlayResponse {
            api_version: "v1".to_string(),
            bot_id: "minimax_bot".to_string(),
            coords: crate::Coordinates::new(0, 0, 2),
            position: yen,
            game_over: true,
            winner: Some("B".to_string()),
        };
        assert!(response.game_over);
        assert_eq!(response.winner, Some("B".to_string()));
    }

    #[test]
    fn test_play_response_serialize() {
        let yen = YEN::new(3, 0, vec!['B', 'R'], "./../.".to_string());
        let response = PlayResponse {
            api_version: "v1".to_string(),
            bot_id: "random_bot".to_string(),
            coords: crate::Coordinates::new(1, 0, 1),
            position: yen,
            game_over: false,
            winner: None,
        };
        let json = serde_json::to_string(&response).unwrap();
        assert!(json.contains("\"api_version\":\"v1\""));
        assert!(json.contains("\"bot_id\":\"random_bot\""));
        assert!(json.contains("\"game_over\":false"));
        assert!(json.contains("\"winner\":null"));
    }

    #[test]
    fn test_play_response_deserialize() {
        let json = r#"{
            "api_version": "v1",
            "bot_id": "random_bot",
            "coords": {"x":1,"y":0,"z":1},
            "position": {"size":3,"turn":1,"players":["B","R"],"layout":"./../."},
            "game_over": false,
            "winner": null
        }"#;
        let response: PlayResponse = serde_json::from_str(json).unwrap();
        assert_eq!(response.api_version, "v1");
        assert_eq!(response.bot_id, "random_bot");
        assert!(!response.game_over);
    }
}
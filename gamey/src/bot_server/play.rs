use crate::{GameY, GameStatus, Movement, YEN, check_api_version, error::ErrorResponse, state::AppState, PlayerId, create_default_state};
use axum::{
    Json,
    extract::{Path, State},
};
use serde::{Deserialize, Serialize};
use axum::extract::Query;

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
pub async fn player_play(
    State(_state): State<AppState>,
    Path(_params): Path<PlayParams>,
    Json(yen): Json<YEN>,
) -> Result<Json<PlayResponse>, Json<ErrorResponse>> {
    check_api_version(&_params.api_version)?;

    let mut game = match GameY::try_from(yen.clone()) {
        Ok(g) => g,
        Err(err) => return Err(Json(ErrorResponse::error(
            &format!("Invalid YEN position: {}", err),
            Some(_params.api_version),
            Some(_params.bot_id),
        ))),
    };

    game.force_turn(PlayerId::new(yen.turn()));

    let bot = match _state.bots().find(&_params.bot_id) {
        Some(b) => b,
        None => {
            let available = _state.bots().names().join(", ");
            return Err(Json(ErrorResponse::error(
                &format!("Bot not found: {}, available bots: [{}]", _params.bot_id, available),
                Some(_params.api_version),
                Some(_params.bot_id),
            )));
        }
    };

    let player = match game.next_player() {
        Some(p) => p,
        None => return Err(Json(ErrorResponse::error(
            "Game is already over — no moves can be made",
            Some(_params.api_version),
            Some(_params.bot_id),
        ))),
    };

    let coords = match bot.choose_move(&game) {
        Some(c) => c,
        None => return Err(Json(ErrorResponse::error(
            "No valid moves available for the bot",
            Some(_params.api_version),
            Some(_params.bot_id),
        ))),
    };

    if let Err(err) = game.add_move(Movement::Placement { player, coords }) {
        return Err(Json(ErrorResponse::error(
            &format!("Failed to apply bot move: {}", err),
            Some(_params.api_version),
            Some(_params.bot_id),
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
        api_version: _params.api_version,
        bot_id: _params.bot_id,
        coords,
        position: YEN::from(&game),
        game_over,
        winner,
    }))
}


/// Computes the move a bot would play for a given YEN position.
///
/// Unlike [`player_play`], this is a plain async function (not an Axum handler):
/// it takes the bot identifier and the YEN payload directly, builds a default
/// `AppState` internally to look up the bot, and returns only the chosen
/// coordinates without applying the move to the board.
///
/// # Arguments
/// * `bot_id` - The identifier of the bot to use for move selection.
/// * `yen`    - The current game state in YEN format.
///
/// # Returns
/// On success, the [`Coordinates`](crate::Coordinates) chosen by the bot.
/// On failure, a JSON [`ErrorResponse`] describing what went wrong.
pub async fn play(
    bot_id: &str,
    Json(yen): Json<YEN>,
) -> Result<crate::Coordinates, Json<ErrorResponse>> {
    let mut game = match GameY::try_from(yen.clone()) {
        Ok(g) => g,
        Err(err) => return Err(Json(ErrorResponse::error(
            &format!("Invalid YEN position: {}", err),
            Some("v1".to_string()),
            Some(bot_id.to_string()),
        ))),
    };

    game.force_turn(PlayerId::new(yen.turn()));

    let state: AppState = create_default_state();

    let bot = match state.bots().find(bot_id) {
        Some(b) => b,
        None => {
            let available = state.bots().names().join(", ");
            return Err(Json(ErrorResponse::error(
                &format!("Bot not found: {}, available bots: [{}]", bot_id, available),
                Some("v1".to_string()),
                Some(bot_id.to_string()),
            )));
        }
    };

    match bot.choose_move(&game) {
        Some(c) => Ok(c),
        None => Err(Json(ErrorResponse::error(
            "No valid moves available for the bot",
            Some("v1".to_string()),
            Some(bot_id.to_string()),
        ))),
    }
}

#[derive(Deserialize)]
pub struct PlayQuery {
    position: String,
    bot_id: String,
}

/// GET handler at `/play?bot_id=<id>&position=<url-encoded JSON>`.
#[axum::debug_handler]
pub async fn play_get(
    Query(query): Query<PlayQuery>,
) -> Result<Json<crate::Coordinates>, Json<ErrorResponse>> {
    let yen: YEN = serde_json::from_str(&query.position).map_err(|err| {
        Json(ErrorResponse::error(
            &format!("Invalid position query parameter: {}", err),
            Some("v1".to_string()),
            Some(query.bot_id.clone()),
        ))
    })?;

    let coords = play(&query.bot_id, Json(yen)).await?;
    Ok(Json(coords))
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

    /// Picks any bot name available in the default state, so tests don't
    /// hard-code a specific bot id that might not exist in this build.
    fn any_available_bot_id() -> String {
        let state = create_default_state();
        state
            .bots()
            .names()
            .first()
            .cloned()
            .expect("default state should expose at least one bot")
    }

    /// Empty 3-row Y board: row 1 has 1 cell, row 2 has 2 cells, row 3 has 3 cells.
    fn empty_board_size_3() -> String {
        "./../...".to_string()
    }

    #[tokio::test]
    async fn test_play_returns_coords_on_valid_position() {
        let bot_id = any_available_bot_id();
        let yen = YEN::new(3, 0, vec!['B', 'R'], empty_board_size_3());

        let result = play(&bot_id, Json(yen)).await;

        assert!(
            result.is_ok(),
            "play should succeed on a valid empty position, got: {:?}",
            result.err().map(|Json(e)| e)
        );
    }

    #[tokio::test]
    async fn test_play_unknown_bot_returns_error() {
        let yen = YEN::new(3, 0, vec!['B', 'R'], empty_board_size_3());

        let result = play("__definitely_not_a_real_bot__", Json(yen)).await;

        let Json(err) = result.expect_err("unknown bot should produce an error");
        let msg = format!("{:?}", err);
        assert!(
            msg.contains("Bot not found"),
            "error should mention 'Bot not found', got: {}",
            msg
        );
        assert!(
            msg.contains("__definitely_not_a_real_bot__"),
            "error should echo the bad bot id, got: {}",
            msg
        );
    }

    #[tokio::test]
    async fn test_play_invalid_yen_returns_error() {
        let bot_id = any_available_bot_id();
        // Layout that does not match the declared size -> GameY::try_from must fail.
        let yen = YEN::new(3, 0, vec!['B', 'R'], "garbage-layout".to_string());

        let result = play(&bot_id, Json(yen)).await;

        let Json(err) = result.expect_err("invalid YEN should produce an error");
        let msg = format!("{:?}", err);
        assert!(
            msg.contains("Invalid YEN position"),
            "error should mention 'Invalid YEN position', got: {}",
            msg
        );
    }

    #[tokio::test]
    async fn test_play_respects_yen_turn() {
        // Same empty board, but turn = 1: play must still return coords.
        let bot_id = any_available_bot_id();
        let yen = YEN::new(3, 1, vec!['B', 'R'], empty_board_size_3());

        let result = play(&bot_id, Json(yen)).await;

        assert!(
            result.is_ok(),
            "play should honor a non-zero turn on a non-terminal position, got: {:?}",
            result.err().map(|Json(e)| e)
        );
    }
}

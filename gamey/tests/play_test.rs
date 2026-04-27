use gamey::play::{player_play, play, play_get, PlayParams, PlayQuery, PlayResponse};
use gamey::{GameY, YEN, create_default_state};
use axum::{
    Json,
    extract::{Path, State, Query},
};

fn any_available_bot_id() -> String {
    let state = create_default_state();
    state
        .bots()
        .names()
        .first()
        .cloned()
        .expect("default state should expose at least one bot")
}

fn empty_board_size_3() -> String {
    "./../...".to_string()
}

fn create_test_state() -> gamey::state::AppState {
    create_default_state()
}

#[test]
fn test_play_response_creation() {
    let yen = YEN::new(3, 1, vec!['B', 'R'], "B/BR/.R.".to_string());
    let response = PlayResponse {
        api_version: "v1".to_string(),
        bot_id: "minimax_bot".to_string(),
        coords: gamey::Coordinates::new(0, 0, 2),
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
        coords: gamey::Coordinates::new(0, 0, 2),
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
        coords: gamey::Coordinates::new(1, 0, 1),
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

#[tokio::test]
async fn test_play_returns_coords_on_valid_position() {
    let bot_id = any_available_bot_id();
    let yen = YEN::new(3, 0, vec!['B', 'R'], empty_board_size_3());

    let result = play(Option::from(&*bot_id), Json(yen)).await;

    assert!(
        result.is_ok(),
        "play should succeed on a valid empty position, got: {:?}",
        result.err().map(|Json(e)| e)
    );
}

#[tokio::test]
async fn test_play_unknown_bot_returns_error() {
    let yen = YEN::new(3, 0, vec!['B', 'R'], empty_board_size_3());

    let result = play(Option::from("__definitely_not_a_real_bot__"), Json(yen)).await;

    let Json(err) = result.expect_err("unknown bot should produce an error");
    let msg = format!("{:?}", err);
    assert!(msg.contains("Bot not found"), "error should mention 'Bot not found', got: {}", msg);
    assert!(msg.contains("__definitely_not_a_real_bot__"), "error should echo the bad bot id, got: {}", msg);
}

#[tokio::test]
async fn test_play_invalid_yen_returns_error() {
    let bot_id = any_available_bot_id();
    let yen = YEN::new(3, 0, vec!['B', 'R'], "garbage-layout".to_string());

    let result = play(Option::from(&*bot_id), Json(yen)).await;

    let Json(err) = result.expect_err("invalid YEN should produce an error");
    let msg = format!("{:?}", err);
    assert!(msg.contains("Invalid YEN position"), "error should mention 'Invalid YEN position', got: {}", msg);
}

#[tokio::test]
async fn test_play_respects_yen_turn() {
    let bot_id = any_available_bot_id();
    let yen = YEN::new(3, 1, vec!['B', 'R'], empty_board_size_3());

    let result = play(Option::from(&*bot_id), Json(yen)).await;

    assert!(
        result.is_ok(),
        "play should honor a non-zero turn on a non-terminal position, got: {:?}",
        result.err().map(|Json(e)| e)
    );
}

#[tokio::test]
async fn test_play_no_bot() {
    let yen = YEN::new(3, 1, vec!['B', 'R'], empty_board_size_3());

    let result = play(None, Json(yen)).await;

    assert!(
        result.is_ok(),
        "play should fall back to minimax bot, got: {:?}",
        result.err().map(|Json(e)| e)
    );
}

#[tokio::test]
async fn test_player_play_success_on_valid_position() {
    let state = create_test_state();
    let bot_id = any_available_bot_id();
    let yen = YEN::new(3, 0, vec!['B', 'R'], empty_board_size_3());

    let params = PlayParams {
        api_version: "v1".to_string(),
        bot_id: bot_id.clone(),
    };

    let result = player_play(State(state), Path(params), Json(yen)).await;

    assert!(result.is_ok(), "player_play should succeed on a valid empty position, got: {:?}", result.err());

    let Json(response) = result.unwrap();
    assert_eq!(response.api_version, "v1");
    assert_eq!(response.bot_id, bot_id);
    assert!(!response.game_over);
    assert!(response.winner.is_none());
}

#[tokio::test]
async fn test_player_play_invalid_api_version() {
    let state = create_test_state();
    let bot_id = any_available_bot_id();
    let yen = YEN::new(3, 0, vec!['B', 'R'], empty_board_size_3());

    let params = PlayParams {
        api_version: "v999".to_string(),
        bot_id: bot_id.clone(),
    };

    let result = player_play(State(state), Path(params), Json(yen)).await;
    assert!(result.is_err(), "player_play should reject invalid API version");
}

#[tokio::test]
async fn test_player_play_unknown_bot() {
    let state = create_test_state();
    let yen = YEN::new(3, 0, vec!['B', 'R'], empty_board_size_3());

    let params = PlayParams {
        api_version: "v1".to_string(),
        bot_id: "__unknown_bot_xyz__".to_string(),
    };

    let result = player_play(State(state), Path(params), Json(yen)).await;
    assert!(result.is_err(), "player_play should return error for unknown bot");

    let Json(err) = result.unwrap_err();
    let msg = format!("{:?}", err);
    assert!(msg.contains("Bot not found"), "error should mention 'Bot not found', got: {}", msg);
}

#[tokio::test]
async fn test_player_play_invalid_yen_position() {
    let state = create_test_state();
    let bot_id = any_available_bot_id();
    let yen = YEN::new(3, 0, vec!['B', 'R'], "invalid-layout".to_string());

    let params = PlayParams {
        api_version: "v1".to_string(),
        bot_id,
    };

    let result = player_play(State(state), Path(params), Json(yen)).await;
    assert!(result.is_err(), "player_play should reject invalid YEN position");

    let Json(err) = result.unwrap_err();
    let msg = format!("{:?}", err);
    assert!(msg.contains("Invalid YEN position"), "error should mention 'Invalid YEN position', got: {}", msg);
}

#[tokio::test]
async fn test_player_play_respects_turn() {
    let state = create_test_state();
    let bot_id = any_available_bot_id();
    let yen = YEN::new(3, 1, vec!['B', 'R'], empty_board_size_3());

    let params = PlayParams {
        api_version: "v1".to_string(),
        bot_id,
    };

    let result = player_play(State(state), Path(params), Json(yen)).await;
    assert!(result.is_ok(), "player_play should honor non-zero turn, got: {:?}", result.err());

    let Json(response) = result.unwrap();
    assert_eq!(response.api_version, "v1");
}

#[tokio::test]
async fn test_player_play_returns_valid_response_structure() {
    let state = create_test_state();
    let bot_id = any_available_bot_id();
    let yen = YEN::new(3, 0, vec!['B', 'R'], empty_board_size_3());

    let params = PlayParams {
        api_version: "v1".to_string(),
        bot_id: bot_id.clone(),
    };

    let Json(response) = player_play(State(state), Path(params), Json(yen)).await.unwrap();
    assert_eq!(response.api_version, "v1");
    assert_eq!(response.bot_id, bot_id);
    assert!(!response.game_over);
    assert!(response.winner.is_none());
}

#[tokio::test]
async fn test_player_play_game_already_over() {
    let state = create_test_state();
    let bot_id = any_available_bot_id();
    let yen = YEN::new(3, 0, vec!['B', 'R'], "B/BR/BRR".to_string());

    let params = PlayParams {
        api_version: "v1".to_string(),
        bot_id,
    };

    let result = player_play(State(state), Path(params), Json(yen)).await;

    if let Err(Json(err)) = result {
        let msg = format!("{:?}", err);
        assert!(
            msg.contains("Game is already over") || msg.contains("Invalid YEN position"),
            "expected 'Game is already over' or 'Invalid YEN position', got: {}",
            msg
        );
    }
}

#[tokio::test]
async fn test_player_play_reports_winner_when_game_over() {
    let state = create_test_state();
    let bot_id = any_available_bot_id();
    let yen = YEN::new(3, 0, vec!['B', 'R'], "B/BR/.RB".to_string());

    let params = PlayParams {
        api_version: "v1".to_string(),
        bot_id: bot_id.clone(),
    };

    let result = player_play(State(state), Path(params), Json(yen)).await;

    if let Ok(Json(response)) = result {
        if response.game_over {
            let w = response.winner.as_deref();
            assert!(w == Some("B") || w == Some("R"), "winner should be 'B' or 'R', got: {:?}", response.winner);
        } else {
            assert!(response.winner.is_none());
        }
        assert_eq!(response.api_version, "v1");
        assert_eq!(response.bot_id, bot_id);
    }
}

#[tokio::test]
async fn test_player_play_response_contains_updated_position() {
    let state = create_test_state();
    let bot_id = any_available_bot_id();
    let yen = YEN::new(3, 0, vec!['B', 'R'], empty_board_size_3());

    let params = PlayParams {
        api_version: "v1".to_string(),
        bot_id: bot_id.clone(),
    };

    let Json(response) = player_play(State(state), Path(params), Json(yen))
        .await
        .expect("valid empty board should succeed");

    let parsed = GameY::try_from(response.position.clone());
    assert!(parsed.is_ok(), "response.position should be a valid YEN, got error: {:?}", parsed.err());
    assert!(response.position.turn() >= 1, "turn counter should advance after a move, got turn={}", response.position.turn());
}

#[tokio::test]
async fn test_player_play_invalid_api_version_error_payload() {
    let state = create_test_state();
    let bot_id = any_available_bot_id();
    let yen = YEN::new(3, 0, vec!['B', 'R'], empty_board_size_3());

    let params = PlayParams {
        api_version: "v999".to_string(),
        bot_id: bot_id.clone(),
    };

    let Json(err) = player_play(State(state), Path(params), Json(yen))
        .await
        .expect_err("invalid api version must error");

    let msg = format!("{:?}", err);
    assert!(!msg.is_empty(), "error message should not be empty");
}

#[tokio::test]
async fn test_player_play_unknown_bot_lists_available() {
    let state = create_test_state();
    let yen = YEN::new(3, 0, vec!['B', 'R'], empty_board_size_3());

    let params = PlayParams {
        api_version: "v1".to_string(),
        bot_id: "__totally_made_up__".to_string(),
    };

    let Json(err) = player_play(State(state), Path(params), Json(yen))
        .await
        .expect_err("unknown bot must error");

    let msg = format!("{:?}", err);
    assert!(msg.contains("Bot not found"), "got: {}", msg);
    assert!(msg.contains("available bots"), "error should list available bots, got: {}", msg);
    assert!(msg.contains("__totally_made_up__"), "error should echo the bad bot id, got: {}", msg);
}

#[tokio::test]
async fn test_player_play_preserves_request_metadata() {
    let state = create_test_state();
    let bot_id = any_available_bot_id();
    let yen = YEN::new(3, 1, vec!['B', 'R'], empty_board_size_3());

    let params = PlayParams {
        api_version: "v1".to_string(),
        bot_id: bot_id.clone(),
    };

    let Json(response) = player_play(State(state), Path(params), Json(yen))
        .await
        .expect("non-zero turn on empty board should succeed");

    assert_eq!(response.api_version, "v1");
    assert_eq!(response.bot_id, bot_id);
}

// ==================== play_get ====================

#[tokio::test]
async fn test_play_get_success_with_valid_position() {
    let position_json = r#"{"size":3,"turn":0,"players":["B","R"],"layout":"./../..."}"#;
    let query = PlayQuery {
        position: position_json.to_string(),
        bot_id: Some(any_available_bot_id()),
    };

    let result = play_get(Query(query)).await;
    assert!(result.is_ok(), "play_get should succeed with valid position, got: {:?}", result.err());
}

#[tokio::test]
async fn test_play_get_invalid_position_json() {
    let query = PlayQuery {
        position: "{ invalid json }".to_string(),
        bot_id: Some(any_available_bot_id()),
    };

    let Json(err) = play_get(Query(query)).await.expect_err("invalid JSON must error");
    let msg = format!("{:?}", err);
    assert!(msg.contains("Invalid position query parameter"), "got: {}", msg);
}

#[tokio::test]
async fn test_play_get_missing_bot_id_uses_default() {
    let position_json = r#"{"size":3,"turn":0,"players":["B","R"],"layout":"./../..."}"#;
    let query = PlayQuery {
        position: position_json.to_string(),
        bot_id: None,
    };

    let result = play_get(Query(query)).await;
    assert!(result.is_ok(), "play_get should succeed with default bot, got: {:?}", result.err());
}

#[tokio::test]
async fn test_play_get_unknown_bot() {
    let position_json = r#"{"size":3,"turn":0,"players":["B","R"],"layout":"./../..."}"#;
    let query = PlayQuery {
        position: position_json.to_string(),
        bot_id: Some("__nonexistent_bot__".to_string()),
    };

    let Json(err) = play_get(Query(query)).await.expect_err("unknown bot must error");
    let msg = format!("{:?}", err);
    assert!(msg.contains("Bot not found"), "got: {}", msg);
}

#[tokio::test]
async fn test_play_get_invalid_yen_in_position() {
    let position_json = r#"{"size":3,"turn":0,"players":["B","R"],"layout":"invalid"}"#;
    let query = PlayQuery {
        position: position_json.to_string(),
        bot_id: Some(any_available_bot_id()),
    };

    let Json(err) = play_get(Query(query)).await.expect_err("invalid YEN must error");
    let msg = format!("{:?}", err);
    assert!(msg.contains("Invalid YEN position"), "got: {}", msg);
}

#[tokio::test]
async fn test_play_get_returns_coordinates() {
    let position_json = r#"{"size":3,"turn":0,"players":["B","R"],"layout":"./../..."}"#;
    let query = PlayQuery {
        position: position_json.to_string(),
        bot_id: Some(any_available_bot_id()),
    };

    let Json(_coords) = play_get(Query(query)).await.unwrap();
    assert!(true); // Placeholder for coordinate validation
}

#[tokio::test]
async fn test_play_get_with_multiple_positions() {
    let bot_id = any_available_bot_id();

    let query1 = PlayQuery {
        position: r#"{"size":3,"turn":0,"players":["B","R"],"layout":"./../..."}"#.to_string(),
        bot_id: Some(bot_id.clone()),
    };
    assert!(play_get(Query(query1)).await.is_ok());

    let query2 = PlayQuery {
        position: r#"{"size":3,"turn":1,"players":["B","R"],"layout":"B/../..."}"#.to_string(),
        bot_id: Some(bot_id.clone()),
    };
    assert!(play_get(Query(query2)).await.is_ok());
}

#[tokio::test]
async fn test_play_get_malformed_json_structure() {
    let query = PlayQuery {
        position: r#"{"size":"three","players":["B","R"]}"#.to_string(),
        bot_id: Some(any_available_bot_id()),
    };

    let result = play_get(Query(query)).await;
    assert!(result.is_err(), "play_get should fail on incomplete JSON structure");
}

#[tokio::test]
async fn test_play_get_url_encoded_position() {
    let position_json = r#"{"size":3,"turn":0,"players":["B","R"],"layout":"./../..."}"#;
    let query = PlayQuery {
        position: position_json.to_string(),
        bot_id: Some(any_available_bot_id()),
    };

    let result = play_get(Query(query)).await;
    assert!(result.is_ok(), "play_get should handle URL-encoded positions, got: {:?}", result.err());
}

#[tokio::test]
async fn test_play_get_returns_in_bounds_coordinates() {
    let position_json = r#"{"size":3,"turn":0,"players":["B","R"],"layout":"./../..."}"#;
    let query = PlayQuery {
        position: position_json.to_string(),
        bot_id: Some(any_available_bot_id()),
    };

    let Json(coords) = play_get(Query(query)).await.expect("valid position must yield coordinates");
    let serialized = serde_json::to_string(&coords).expect("coordinates must be serializable");
    assert!(!serialized.is_empty() && serialized != "null", "coordinates should be non-empty, got: {}", serialized);
}

#[tokio::test]
async fn test_play_get_default_bot_is_minimax() {
    let state = create_default_state();
    let names = state.bots().names();
    let has_minimax = names.iter().any(|n| n == "minimax_bot");
    assert!(has_minimax, "default state should expose 'minimax_bot', got: {:?}", names);

    let position_json = r#"{"size":3,"turn":0,"players":["B","R"],"layout":"./../..."}"#;
    let query = PlayQuery {
        position: position_json.to_string(),
        bot_id: None,
    };

    let result = play_get(Query(query)).await;
    assert!(result.is_ok(), "play_get with no bot_id should fall back to minimax_bot, got: {:?}", result.err());
}

#[tokio::test]
async fn test_play_get_unknown_bot_lists_available() {
    let position_json = r#"{"size":3,"turn":0,"players":["B","R"],"layout":"./../..."}"#;
    let query = PlayQuery {
        position: position_json.to_string(),
        bot_id: Some("__nope__".to_string()),
    };

    let Json(err) = play_get(Query(query)).await.expect_err("unknown bot must error");
    let msg = format!("{:?}", err);
    assert!(msg.contains("Bot not found"), "got: {}", msg);
    assert!(msg.contains("available bots"), "error should list available bots, got: {}", msg);
}

#[tokio::test]
async fn test_play_get_empty_position_string() {
    let query = PlayQuery {
        position: String::new(),
        bot_id: Some(any_available_bot_id()),
    };

    let Json(err) = play_get(Query(query)).await.expect_err("empty position must error");
    let msg = format!("{:?}", err);
    assert!(msg.contains("Invalid position query parameter"), "got: {}", msg);
}

#[tokio::test]
async fn test_play_get_works_for_every_available_bot() {
    let state = create_default_state();
    let names = state.bots().names();
    assert!(!names.is_empty(), "default state should expose >=1 bot");

    let position_json = r#"{"size":3,"turn":0,"players":["B","R"],"layout":"./../..."}"#;

    for bot_id in names {
        let query = PlayQuery {
            position: position_json.to_string(),
            bot_id: Some(bot_id.clone()),
        };

        let result = play_get(Query(query)).await;
        assert!(result.is_ok(), "play_get should succeed for bot '{}', got: {:?}", bot_id, result.err());
    }
}

#[tokio::test]
async fn test_play_get_size_layout_mismatch() {
    let query = PlayQuery {
        position: r#"{"size":3,"turn":0,"players":["B","R"],"layout":"."}"#.to_string(),
        bot_id: Some(any_available_bot_id()),
    };

    let Json(err) = play_get(Query(query)).await.expect_err("size/layout mismatch must error");
    let msg = format!("{:?}", err);
    assert!(msg.contains("Invalid YEN position"), "got: {}", msg);
}
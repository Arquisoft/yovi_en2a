// tests/ranking_integration_tests.rs

use game_manager::data::{Match, YEN};
use game_manager::firebase::{insert_match_by_id, get_user_matches, update_score, get_user_score};
use serial_test::serial;
use rand::Rng;

/// Golden-path lifecycle: save a match, read it back from user history,
/// bump the score, and verify the score was written correctly.
#[tokio::test]
#[serial]
async fn test_full_ranking_and_match_lifecycle() {
    let mut rng = rand::thread_rng();
    let random_id: u32 = rng.gen_range(1000..9999);
    let p1 = format!("player1_{}", random_id);
    let p2 = format!("player2_{}", random_id);
    let match_id = format!("match_{}", random_id);

    // 1) Save a match.
    let dummy_board = YEN::new(3, 0, vec!['B', 'R'], "B/RR/BBB".to_string());
    let match_data = Match {
        player1id: p1.clone(),
        player2id: p2.clone(),
        result: "WIN".to_string(),
        board_status: dummy_board,
        time: 45.5,
        moves: vec![],
        created_at: 0,
    };

    let save_res = insert_match_by_id(&match_id, match_data).await;
    assert!(save_res.is_ok(), "Failed to save match to Firebase: {:?}", save_res.err());

    // 2) Fetch user history.
    let history = get_user_matches(&p1).await.expect("Failed to fetch user history");
    assert!(!history.is_empty(), "History should contain the saved match");
    assert!(
        history.iter().any(|m| m.player1id == p1),
        "Saved match should appear in the history for {}", p1
    );

    // 3) Update score.
    let update_res = update_score(&p1, "TesterName", true, 0.001).await;
    assert!(update_res.is_ok(), "Failed to update player score: {:?}", update_res.err());

    // 4) Verify the score was written directly for this player.
    let score = get_user_score(&p1).await.expect("Failed to fetch player score");
    assert!(score.wins >= 1, "Player should have at least 1 win, got {}", score.wins);
    assert!(score.total_matches >= 1, "Player should have at least 1 match, got {}", score.total_matches);
}

/// Two consecutive wins should not duplicate the player in the scores table.
#[tokio::test]
#[serial]
async fn test_update_score_accumulates_instead_of_duplicating() {
    let random_id: u32 = rand::thread_rng().gen_range(1000..9999);
    let pid = format!("acc_player_{}", random_id);

    update_score(&pid, "AccTester", true, 60.0).await
        .expect("first update_score failed");
    update_score(&pid, "AccTester", true, 55.0).await
        .expect("second update_score failed");

    // Verify directly on the player record instead of scanning the leaderboard.
    let score = get_user_score(&pid).await.expect("Failed to fetch player score");
    assert!(score.total_matches >= 2, "total_matches should be >=2, got {}", score.total_matches);
    assert!(score.wins >= 2, "wins should be >=2, got {}", score.wins);
}

/// A faster win must lower best_time; a slower win must NOT raise it.
#[tokio::test]
#[serial]
async fn test_best_time_monotonic_decreasing() {
    let random_id: u32 = rand::thread_rng().gen_range(1000..9999);
    let pid = format!("bt_player_{}", random_id);

    update_score(&pid, "BtTester", true, 100.0).await.expect("baseline update failed");
    update_score(&pid, "BtTester", true, 70.0).await.expect("faster update failed");
    update_score(&pid, "BtTester", true, 200.0).await.expect("slower update failed");

    let score = get_user_score(&pid).await.expect("Failed to fetch player score");
    assert!(
        score.best_time <= 70.0 + 0.01,
        "best_time should be at most 70.0, got {}",
        score.best_time
    );
    assert!(score.total_matches >= 3, "total_matches should be >=3, got {}", score.total_matches);
    assert!(score.wins >= 3, "wins should be >=3, got {}", score.wins);
}
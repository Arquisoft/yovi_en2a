// tests/ranking_integration_tests.rs
use game_manager::data::{Match, YEN};
use game_manager::firebase::{insert_match_by_id, get_user_matches, update_score, get_ranking_time};
use serial_test::serial;
use rand::Rng;

#[tokio::test]
#[serial]
async fn test_full_ranking_and_match_lifecycle() {
    let mut rng = rand::thread_rng();
    let random_id: u32 = rng.gen_range(1000..9999);
    let p1 = format!("player1_{}", random_id);
    let p2 = format!("player2_{}", random_id);
    let match_id = format!("match_{}", random_id);

    // --- 1. TEST: Save Match ---
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
    assert!(save_res.is_ok(), "Failed to save match to Firebase");

    // --- 2. TEST: Local Rankings (User History) ---
    let history = get_user_matches(&p1).await.expect("Failed to fetch user history");
    assert!(!history.is_empty(), "History should contain the saved match");
    assert_eq!(history[0].player1id, p1);

    // --- 3. TEST: Update Score & ELO ---
    // This tests both insert_score (first time) and update_score logic
    let update_res = update_score(&p1, "TesterName", true, 0.001).await;
    assert!(update_res.is_ok(), "Failed to update player score");

    // --- 4. TEST: Global Rankings (Best Times) ---
    let leaderboard = get_ranking_time().await.expect("Failed to fetch leaderboard");
    // Verify our player appears in the top 20 or exists in the data
    let found = leaderboard.iter().any(|s| s.playerid == p1);
    assert!(found, "New score should be visible in global rankings");
}
// tests/db_tests.rs
//
// Tests for the raw Firebase read/write helpers. These require valid Firebase
// credentials in the environment — run them only when the stack is up.

use game_manager::firebase::{insert_match_by_id, get_match_by_id, remove_match_by_id};
use game_manager::data::{Match, Score, YEN};
use serial_test::serial;
use ctor::ctor;
use rand::Rng;


/// Round-trip a Match through Firebase and verify the fields we care about
/// survive serialization. Uses a fresh id each run so re-runs don't collide
/// with leftover documents.
#[tokio::test]
#[serial]
async fn test_full_match_cycle() {
    let test_id = format!("test_match_{}", rand::thread_rng().gen_range(100_000..999_999));

    let match_data = Match {
        player1id: "1".to_string(),
        player2id: "1".to_string(),
        result: "1 Win".to_string(),
        board_status: YEN::new(
            4,
            0,
            vec!['B', 'R'],
            "B/..R/.B.R/....".to_string(),
        ),
        time: 1000.0,
        moves: vec![],
        created_at: 0,
    };

    let insert_result = insert_match_by_id(&test_id, match_data).await;

    if let Err(ref e) = insert_result {
        eprintln!("Error inserting: {}", e);
    }

    assert!(insert_result.is_ok(), "Inserting Error: {:?}", insert_result.err());

    let read_result: Result<Match, _> = get_match_by_id(&test_id).await;
    assert!(read_result.is_ok(), "Read-back error");

    let fetched: Match = read_result.unwrap();
    assert_eq!(fetched.player1id, "1");
    assert_eq!(fetched.player2id, "1");
    assert_eq!(fetched.result, "1 Win");

    let remove_result: Result<Match, _> = remove_match_by_id(&test_id).await;
    assert!(remove_result.is_ok(), "Removing Error: {:?}", remove_result.err());
}

/// Pure-arithmetic sanity check for the score update logic. No I/O.
#[tokio::test]
#[serial]
async fn test_score_calculation_logic() {
    let mut score = Score {
        playerid: "test_user".to_string(),
        username: "Tester".to_string(),
        total_matches: 10,
        wins: 5,
        losses: 5,
        win_rate: 0.5,
        elo: 100,
        best_time: 120.5,
    };

    let new_time = 105.0;
    score.total_matches += 1;
    score.wins += 1;
    score.elo += 20;
    if new_time < score.best_time {
        score.best_time = new_time;
    }
    score.win_rate = score.wins as f32 / score.total_matches as f32;

    assert_eq!(score.total_matches, 11);
    assert_eq!(score.wins, 6);
    assert_eq!(score.elo, 120);
    assert_eq!(score.best_time, 105.0);
    assert!(score.win_rate > 0.54);
}

/// A loss with a SLOWER time should not move `best_time`, and win_rate should
/// go DOWN. Complements the happy-path test above.
#[tokio::test]
#[serial]
async fn test_score_calculation_loss_keeps_best_time() {
    let mut score = Score {
        playerid: "test_user".to_string(),
        username: "Tester".to_string(),
        total_matches: 10,
        wins: 5,
        losses: 5,
        win_rate: 0.5,
        elo: 100,
        best_time: 90.0,
    };

    let slower_time = 150.0;
    score.total_matches += 1;
    score.losses += 1;
    score.elo = (score.elo - 20).max(0);
    if slower_time < score.best_time {
        score.best_time = slower_time;
    }
    score.win_rate = score.wins as f32 / score.total_matches as f32;

    assert_eq!(score.total_matches, 11);
    assert_eq!(score.losses, 6);
    assert_eq!(score.elo, 80);
    assert_eq!(score.best_time, 90.0, "best_time must not regress on a slower run");
    assert!(score.win_rate < 0.5);
}
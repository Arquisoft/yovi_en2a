use game_manager::firebase::{insert_db, get_match_by_id};
use game_manager::data::{Match, Score};
use serial_test::serial;
use game_manager::data::{YEN};
use ctor::ctor;


#[ctor]
fn init_crypto() {
    rustls::crypto::ring::default_provider()
        .install_default()
        .ok();
}

#[tokio::test]
#[serial]
async fn test_full_match_cycle() {

    let test_id = "test_3";
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
    };

    let insert_result = insert_db("Match", test_id, &match_data).await;

    if let Err(ref e) = insert_result {
        eprintln!("{}", e);
    }

    assert!(insert_result.is_ok(), "Inserting Error: {:?}", insert_result.err());
    let read_result: Result<Match, _> = get_match_by_id(test_id).await;
    assert!(read_result.is_ok(), "Read-back error");

    let fetched:Match = read_result.unwrap();
    assert_eq!(fetched.player1id, "1");
    assert_eq!(fetched.player2id, "1");
    assert_eq!(fetched.result, "1 Win");
}

#[test]
    fn test_score_calculation_logic() {
        // Setup initial state
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

        // Simulate a WIN with a NEW BEST TIME
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


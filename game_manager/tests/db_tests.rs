use game_manager::firebase::{insert_db, get_match_by_id};
use game_manager::data::{Match};
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


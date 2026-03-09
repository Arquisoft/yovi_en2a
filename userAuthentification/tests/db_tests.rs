// tests/db_tests.rs
use userAuthentification::firebase::{insert_user_by_id, get_user_by_id};
use userAuthentification::user_data::User;
use serial_test::serial;

#[tokio::test]
#[serial]
async fn test_full_user_db_cycle() {
    let test_id = "test_db_user_123@example.com";
    let user_data = User {
        email: test_id.to_string(),
        username: "db_tester".to_string(),
        password_hash: "dummy_hashed_pwd".to_string(),
    };

    // Test Insert
    let insert_result = insert_user_by_id(test_id, &user_data).await;
    if let Err(ref e) = insert_result {
        eprintln!("Detailed Firestore error: {}", e);
    }
    assert!(insert_result.is_ok(), "Failed to insert user: {:?}", insert_result.err());

    // Test Read
    let read_result = get_user_by_id(test_id).await;
    assert!(read_result.is_ok(), "Failed to read the inserted User");

    let fetched = read_result.unwrap();
    assert_eq!(fetched.email, test_id);
    assert_eq!(fetched.username, "db_tester");
    assert_eq!(fetched.password_hash, "dummy_hashed_pwd");
}
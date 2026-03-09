// tests/db_tests.rs
// We add delete_user_by_id to the imports for cleanup
use userAuthentification::firebase::{insert_user_by_id, get_user_by_id, delete_user_by_id};
use userAuthentification::user_data::User;
use serial_test::serial;
use rand::Rng; // Required for unique ID generation

#[tokio::test]
#[serial]
async fn test_full_user_db_cycle() {
    // 1. Setup: Create a unique ID to prevent "AlreadyExists" conflicts in Firestore
    let mut rng = rand::thread_rng();
    let random_suffix: u32 = rng.gen_range(10000..99999);
    let test_id = format!("test_db_user_{}@example.com", random_suffix);
    
    let user_data = User {
        email: test_id.clone(),
        username: "db_tester".to_string(),
        password_hash: "dummy_hashed_pwd".to_string(),
    };

    // 2. Test Insert
    // This will now succeed because the ID is highly likely to be new
    let insert_result = insert_user_by_id(&test_id, &user_data).await;
    if let Err(ref e) = insert_result {
        eprintln!("Detailed Firestore error during insertion: {}", e);
    }
    assert!(insert_result.is_ok(), "Failed to insert user: {:?}", insert_result.err());

    // 3. Test Read
    // Verify the document was correctly written and can be retrieved
    let read_result = get_user_by_id(&test_id).await;
    assert!(read_result.is_ok(), "Failed to read the inserted User from Firestore");

    let fetched = read_result.unwrap();
    assert_eq!(fetched.email, test_id);
    assert_eq!(fetched.username, "db_tester");
    assert_eq!(fetched.password_hash, "dummy_hashed_pwd");

    // 4. Cleanup: Delete the test document
    // This ensures the database remains clean and coverage tools can finish successfully
    let delete_result = delete_user_by_id(&test_id).await;
    assert!(delete_result.is_ok(), "Cleanup failed: Document was not removed after the test");
}
// tests/db_tests.rs
// We add delete_user_by_id to the imports for cleanup
use userAuthentification::firebase::{
    insert_user_by_id, get_user_by_id, delete_user_by_id,
    update_db, check_username_exists,
};
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

// ---------------------------------------------------------------------------
//  check_username_exists
// ---------------------------------------------------------------------------

#[tokio::test]
#[serial]
async fn test_check_username_exists_returns_false_when_absent() {
    let result = check_username_exists("__totally_nonexistent_username_xyz_12345__").await;
    assert!(result.is_ok(), "check_username_exists failed: {:?}", result.err());
    assert!(!result.unwrap(), "expected false for a username that does not exist");
}

#[tokio::test]
#[serial]
async fn test_check_username_exists_returns_true_when_present() {
    let mut rng = rand::thread_rng();
    let suffix: u32 = rng.gen_range(10000..99999);
    let test_id = format!("test_ucheck_{}@example.com", suffix);
    let unique_username = format!("ucheck_user_{}", suffix);

    let user = User {
        email: test_id.clone(),
        username: unique_username.clone(),
        password_hash: "dummy_hash".to_string(),
    };

    insert_user_by_id(&test_id, &user).await.expect("insert failed");

    let result = check_username_exists(&unique_username).await;
    assert!(result.is_ok(), "check_username_exists errored: {:?}", result.err());
    assert!(result.unwrap(), "expected true for a username that was just inserted");

    let _ = delete_user_by_id(&test_id).await;
}

// ---------------------------------------------------------------------------
//  update_db
// ---------------------------------------------------------------------------

#[tokio::test]
#[serial]
async fn test_update_db_changes_stored_fields() {
    let mut rng = rand::thread_rng();
    let suffix: u32 = rng.gen_range(10000..99999);
    let test_id = format!("test_update_{}@example.com", suffix);

    let original = User {
        email: test_id.clone(),
        username: "before_update".to_string(),
        password_hash: "old_hash".to_string(),
    };
    insert_user_by_id(&test_id, &original).await.expect("insert");

    let updated = User {
        email: test_id.clone(),
        username: "after_update".to_string(),
        password_hash: "new_hash".to_string(),
    };
    update_db::<User>("Users", &test_id, &updated).await.expect("update_db");

    let fetched = get_user_by_id(&test_id).await.expect("read back");
    assert_eq!(fetched.username, "after_update");
    assert_eq!(fetched.password_hash, "new_hash");

    let _ = delete_user_by_id(&test_id).await;
}
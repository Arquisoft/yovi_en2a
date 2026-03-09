// tests/user_auth_tests.rs
use userAuthentification::user_auth::{register_user, login_user, delete_user}; // Added delete_user here
use serial_test::serial;
use rand::Rng;

#[tokio::test]
#[serial]
async fn test_full_user_auth_cycle() {
    // Generate a random ID to ensure a unique email for each test run
    let mut rng = rand::thread_rng();
    let random_id: u64 = rng.gen_range(100_000_000..999_999_999);
    
    let test_email = format!("test_user_{}@example.com", random_id);
    let test_username = "test_automation_user";
    let test_password = "SecurePassword2026!";

    // --- 1. Test Registration ---
    // Registration of a new unique email
    let register_result = register_user(&test_email, test_username, test_password).await;
    assert!(register_result.is_ok(), "Failed to register new user: {:?}", register_result.err());

    // --- 2. Test Duplicate Registration (Should Fail) ---
    // The system must prevent two accounts from using the same email address
    let duplicate_register_result = register_user(&test_email, test_username, test_password).await;
    assert!(
        duplicate_register_result.is_err(), 
        "Security Breach: System allowed registering the same email twice"
    );

    // --- 3. Test Successful Login ---
    // Verifying that the credentials we just created actually work
    let login_result = login_user(&test_email, test_password).await;
    assert!(login_result.is_ok(), "Failed to login with newly created credentials");
    
    let fetched_user = login_result.unwrap();
    assert_eq!(fetched_user.email, test_email, "Email mismatch in returned user object");
    assert_eq!(fetched_user.username, test_username, "Username mismatch in returned user object");

    // --- 4. Test Login with Incorrect Password (Should Fail) ---
    let wrong_password_result = login_user(&test_email, "WrongPassword!").await;
    assert!(
        wrong_password_result.is_err(), 
        "Security Error: System allowed login with an incorrect password"
    );

    // --- 5. Test Login with Non-existent User (Should Fail) ---
    let fake_user_result = login_user("nonexistent_account_2026@example.com", test_password).await;
    assert!(
        fake_user_result.is_err(), 
        "Logic Error: System allowed login for a user that does not exist"
    );
    
    // --- 6. Cleanup ---
    // Deleting the user from Firestore to prevent "AlreadyExists" errors in future runs
    let cleanup_result = delete_user(&test_email).await;
    assert!(cleanup_result.is_ok(), "Cleanup failed: Failed to delete test user from Firestore");
}
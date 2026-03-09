// tests/user_auth_tests.rs
use userAuthentification::user_auth::{register_user, login_user};
use serial_test::serial;
use rand::Rng;

#[tokio::test]
#[serial]
async fn test_full_user_auth_cycle() {
    // Generate a random user ID to prevent conflicts with previous test runs
    let mut rng = rand::thread_rng();
    let random_id: u32 = rng.gen_range(1000..9999);
    
    let test_email = format!("test_user_{}@example.com", random_id);
    let test_username = "test_automation_user";
    let test_password = "SecurePassword2026!";

    // --- 1. Test Registration ---
    let register_result = register_user(&test_email, test_username, test_password).await;
    assert!(register_result.is_ok(), "Failed to register new user: {:?}", register_result.err());

    // --- 2. Test Duplicate Registration (Should Fail) ---
    let duplicate_register_result = register_user(&test_email, test_username, test_password).await;
    assert!(
        duplicate_register_result.is_err(), 
        "System allowed registering the same email twice"
    );

    // --- 3. Test Successful Login ---
    let login_result = login_user(&test_email, test_password).await;
    assert!(login_result.is_ok(), "Failed to login with correct credentials");
    
    let fetched_user = login_result.unwrap();
    assert_eq!(fetched_user.email, test_email, "Emails do not match");
    assert_eq!(fetched_user.username, test_username, "Usernames do not match");

    // --- 4. Test Login with Incorrect Password (Should Fail) ---
    let wrong_password_result = login_user(&test_email, "WrongPassword!").await;
    assert!(
        wrong_password_result.is_err(), 
        "System allowed login with an incorrect password"
    );

    // --- 5. Test Login with Non-existent User (Should Fail) ---
    let fake_user_result = login_user("nobody@example.com", test_password).await;
    assert!(
        fake_user_result.is_err(), 
        "System allowed login for a non-existent user"
    );
}
// tests/auth_utils_tests.rs
use userAuthentification::auth_utils::{hash_password, verify_password};

#[test]
fn test_password_hashing_and_verification() {
    let password = "my_super_secret_password_123!";
    
    // 1. Test that hashing works and returns a string
    let hash_result = hash_password(password);
    assert!(hash_result.is_ok(), "Failed to hash the password");
    
    let hash = hash_result.unwrap();
    assert!(!hash.is_empty(), "Password hash should not be empty");
    assert_ne!(password, hash, "Hash should not be equal to the plain text password");

    // 2. Test that the correct password verifies successfully
    let verification_result = verify_password(password, &hash);
    assert!(verification_result.is_ok(), "Verification process encountered an error");
    assert!(verification_result.unwrap(), "Correct password should return true");

    // 3. Test that an incorrect password fails verification
    let wrong_password = "wrong_password_123!";
    let wrong_verification = verify_password(wrong_password, &hash);
    assert!(wrong_verification.is_ok(), "Verification process encountered an error");
    assert!(!wrong_verification.unwrap(), "Incorrect password should return false");
}
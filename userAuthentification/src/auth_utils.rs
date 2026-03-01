use argon2::{
    password_hash::{PasswordHasher, PasswordVerifier, SaltString, PasswordHash},
    Argon2,
};
use rand::rngs::OsRng;
use std::error::Error;

/// Hashes a raw password using the Argon2 algorithm.
///
/// What this does:
/// 1. Generates a random salt.
/// 2. Uses Argon2 to hash the password securely.
/// 3. Returns the resulting hash as a string.
pub fn hash_password(password: &str) -> Result<String, Box<dyn std::error::Error>> {
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();

    // Map the argon2 error to a String-based error so Box<dyn Error> accepts it
    let hash = argon2.hash_password(password.as_bytes(), &salt)
        .map_err(|e| e.to_string())?;

    Ok(hash.to_string())
}

/// Verifies a login attempt by comparing:
/// - The password provided by the user
/// - The stored password hash from Firestore
///
/// Returns:
/// - `true` if the password is correct
/// - `false` if the password is incorrect
/// Argon2 handles secure comparison internally to prevent timing attacks.
pub fn verify_password(password: &str, hash: &str) -> Result<bool, Box<dyn std::error::Error>> {
    // Again, map the error to a string to satisfy the return type
    let parsed_hash = PasswordHash::new(hash)
        .map_err(|e| e.to_string())?;

    Ok(Argon2::default()
        .verify_password(password.as_bytes(), &parsed_hash)
        .is_ok())
}
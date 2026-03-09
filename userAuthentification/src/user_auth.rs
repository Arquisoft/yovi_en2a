use std::error::Error;
use crate::firebase::{read_db, insert_db, delete_db};
use crate::user_data::User;
use crate::auth_utils::{hash_password, verify_password};

/// Registers a new user in the "Users" collection.
///
/// Steps:
/// 1. Check if a user with this email already exists.
/// 2. If yes → return an error.
/// 3. Hash the provided password.
/// 4. Create a new `User` struct.
/// 5. Insert it into Firestore.
///
/// Why we check first:
/// We use the email as document ID, so it must be unique.
pub async fn register_user(
    email: &str,
    username: &str,
    password: &str,
) -> Result<(), Box<dyn Error>> {

    // Try reading the user first to see if it already exists.
    // If it exists, registration should fail.
    if let Ok(_) = read_db::<User>("Users", email).await {
        return Err("User already exists".into());
    }

    // Securely hash the password before storing it
    let password_hash = hash_password(password)?;

    // Build the new user object
    let user = User {
        email: email.to_string(),
        username: username.to_string(),
        password_hash,
    };

    // Insert into Firestore using our generic database function
    insert_db("Users", email, &user).await?;

    println!("User [{}] registered successfully.", email);

    Ok(())
}

/// Attempts to log in a user.
///
/// Steps:
/// 1. Fetch the user from Firestore using the email.
/// 2. If not found → return error.
/// 3. Verify the provided password against the stored hash.
/// 4. If correct → return the User struct.
/// 5. If incorrect → return error.

pub async fn login_user(
    email: &str,
    password: &str,
) -> Result<User, Box<dyn Error>> {

    // Fetch user from Firestore
    let user = read_db::<User>("Users", email).await?;

    // Verify the password
    if verify_password(password, &user.password_hash)? {
        println!("User [{}] logged in successfully.", email);
        Ok(user)
    } else {
        Err("Invalid password".into())
    }
}

pub async fn delete_user(email: &str) -> Result<(), Box<dyn Error>> {
    // We call the generic delete_db function we just created
    delete_db("Users", email).await?;

    println!("User [{}] successfully removed from the system.", email);
    Ok(())
}
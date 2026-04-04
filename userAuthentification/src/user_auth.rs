use std::error::Error;
use crate::firebase::{read_db, insert_db, delete_db, update_db, check_username_exists};
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
        println!("[AUTH] Registration failed for [{}]: email already in use", email);
        return Err("Email already exists".into());
    }

    if check_username_exists(username).await.unwrap_or(false) {
        println!("[AUTH] Registration failed for [{}]: username already in use", email);
        return Err("Username already in use".into());
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

    // Fetch user from Firestore. If not found, return the same error as a wrong
    // password to avoid revealing whether an email is registered (user enumeration).
    let user = match read_db::<User>("Users", email).await {
        Ok(u) => u,
        Err(e) => {
            println!("[AUTH] Login failed for [{}]: user not found ({})", email, e);
            return Err("Invalid email or password".into());
        }
    };

    // Verify the password
    if verify_password(password, &user.password_hash)? {
        println!("[AUTH] Login successful for [{}]", email);
        Ok(user)
    } else {
        println!("[AUTH] Login failed for [{}]: wrong password", email);
        Err("Invalid email or password".into())
    }
}

pub async fn delete_user(email: &str) -> Result<(), Box<dyn Error>> {
    // We call the generic delete_db function we just created
    delete_db("Users", email).await?;

    println!("User [{}] successfully removed from the system.", email);
    Ok(())
}

pub async fn update_username(email: &str, new_username: &str) -> Result<(), Box<dyn Error>> {
    // Fetch the user from Firestore.
    let mut user = match read_db::<User>("Users", email).await {
        Ok(u) => u,
        Err(e) => {
            println!("[AUTH] Update username failed for [{}]: user not found ({})", email, e);
            return Err("User not found".into());
        }
    };

    if check_username_exists(new_username).await.unwrap_or(false) {
        println!("[AUTH] Update username failed for [{}]: username already in use", email);
        return Err("Username already in use".into());
    }

    // Update the username
    user.username = new_username.to_string();

    // Insert the updated user object back into Firestore using update to preserve other fields if any
    update_db("Users", email, &user).await?;

    println!("User [{}] updated username to [{}] successfully.", email, new_username);

    Ok(())
}
use serde::{Deserialize, Serialize};

/// Represents a user document inside the Firestore "Users" collection.
///
/// Important:
/// - The `email` will be used as the document ID in Firestore.
/// - We DO NOT store the raw password.
/// - Instead, we store a secure hash of the password.

pub trait DBData: Serialize + for<'de> Deserialize<'de> + std::fmt::Debug + Send + Sync {}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct User {
    /// Unique email address of the user.
    /// This will also act as the Firestore document ID.
    pub email: String,

    /// Public username chosen by the user.
    pub username: String,

    /// Securely hashed password using Argon2.
    pub password_hash: String,
}

/// Allows `User` to be used with our generic Firestore functions
/// like `read_db` and `insert_db`.
impl DBData for User {}
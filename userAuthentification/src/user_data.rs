use serde::{Deserialize, Serialize};

pub trait DBData: Serialize + for<'de> Deserialize<'de> + std::fmt::Debug + Send + Sync {}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct User {
    pub email: String,
    pub username: String,
    pub password_hash: String,
}

impl DBData for User {}

// --- API Request/Response models ---

#[derive(Deserialize)]
pub struct RegisterRequest {
    pub email: String,
    pub username: String,
    pub password: String,
}

#[derive(Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

#[derive(Serialize)]
pub struct LoginResponse {
    pub username: String,
    pub email: String,
    pub message: String,
}
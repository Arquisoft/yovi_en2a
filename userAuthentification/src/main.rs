use axum::{
    routing::post,
    Router,
    Json,
    http::StatusCode,
    response::IntoResponse,
};
use serde::{Deserialize, Serialize};

// Import our existing modules
mod user_data; 
mod user_auth; 
mod auth_utils; 
mod firebase;

// --- SERDE STRUCTS FOR REQUESTS AND RESPONSES ---

#[derive(Deserialize)]
struct RegisterRequest {
    email: String,
    username: String,
    password: String,
}

#[derive(Deserialize)]
struct LoginRequest {
    email: String,
    password: String,
}

#[derive(Serialize)]
struct LoginResponse {
    username: String,
    email: String,
}

// --- ROUTE HANDLERS ---

/// Handles the registration POST request.
/// Deserializes the JSON body into `RegisterRequest` and calls the database logic.
async fn register_handler(Json(payload): Json<RegisterRequest>) -> impl IntoResponse {
    // Call the register_user function from user_auth.rs
    match register_user(&payload.email, &payload.username, &payload.password).await {
        Ok(_) => {
            (StatusCode::OK, "User registered successfully".to_string())
        }
        Err(e) => {
            // If the user already exists or another error occurs, return a 400 Bad Request
            (StatusCode::BAD_REQUEST, e.to_string())
        }
    }
}

/// Handles the login POST request.
/// Deserializes the JSON body into `LoginRequest` and verifies credentials.
async fn login_handler(Json(payload): Json<LoginRequest>) -> impl IntoResponse {
    // Call the login_user function from user_auth.rs
    match login_user(&payload.email, &payload.password).await {
        Ok(user) => {
            // Create a safe response object that DOES NOT include the password_hash
            let response = LoginResponse {
                username: user.username, 
                email: user.email,
            };
            (StatusCode::OK, Json(response)).into_response()
        }
        Err(e) => {
            // Invalid password or user not found returns a 401 Unauthorized
            (StatusCode::UNAUTHORIZED, e.to_string()).into_response()
        }
    }
}

// --- MAIN SERVER SETUP ---

#[tokio::main]
async fn main() {
    // Build the Axum router with our two endpoints
    let app = Router::new()
        .route("/register", post(register_handler))
        .route("/login", post(login_handler));

    // Define the address and port (127.0.0.1:8000 matches the Express fetch URL)
    let addr = "127.0.0.1:8000";
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    
    println!("Rust Auth API listening on http://{}", addr);
    
    // Start the server
    axum::serve(listener, app).await.unwrap();
}
use axum::{
    routing::post,
    Router,
    Json,
    http::StatusCode,
    response::IntoResponse,
};
use tokio::net::TcpListener;

// Importamos los modelos y la lógica de negocio
use crate::user_data::{RegisterRequest, LoginRequest, LoginResponse, UpdateUsernameRequest};
use crate::user_auth::{register_user, login_user, update_username};

/// Maneja la petición POST de registro.
async fn register_handler(Json(payload): Json<RegisterRequest>) -> impl IntoResponse {
    match register_user(&payload.email, &payload.username, &payload.password).await {
        Ok(_) => {
            let response = LoginResponse {
                username: payload.username.clone(),
                email: payload.email.clone(),
                message: "User registered successfully".to_string(),
            };
            (StatusCode::OK, Json(response)).into_response()
        },
        Err(e) => (StatusCode::BAD_REQUEST, Json(serde_json::json!({
            "error": e.to_string()
        }))).into_response()
    }
}

/// Maneja la petición POST de inicio de sesión.
async fn login_handler(Json(payload): Json<LoginRequest>) -> impl IntoResponse {
    match login_user(&payload.email, &payload.password).await {
        Ok(user) => {
            let response = LoginResponse {
                username: user.username.clone(),
                email: user.email.clone(),
                message: format!("Welcome again {}", user.username),
            };

            (StatusCode::OK, Json(response)).into_response()
        }
        Err(e) => (StatusCode::UNAUTHORIZED, Json(serde_json::json!({
            "error": e.to_string()
        }))).into_response()
    }
}

/// Maneja la petición POST de actualización de nombre de usuario.
async fn update_username_handler(Json(payload): Json<UpdateUsernameRequest>) -> impl IntoResponse {
    match update_username(&payload.email, &payload.new_username).await {
        Ok(_) => (StatusCode::OK, Json(serde_json::json!({
            "message": "Username updated successfully"
        }))).into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, Json(serde_json::json!({
            "error": e.to_string()
        }))).into_response()
    }
}

pub async fn run() {
    let app = Router::new()
        .route("/register", post(register_handler))
        .route("/login", post(login_handler))
        .route("/update-username", post(update_username_handler));

    // Usamos 0.0.0.0 para exponer el puerto correctamente en Docker
    let addr = "0.0.0.0:4001";
    println!("🚀 Rust Auth API escuchando en http://{}", addr);
    
    let listener = TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
// Declaración de módulos
mod user_data; 
mod user_auth; 
mod auth_utils; 
mod firebase;
mod api_rest; // Añadimos el nuevo módulo

#[tokio::main]
async fn main() {
    // Delegamos la inicialización al módulo api_rest
    api_rest::run().await;
}
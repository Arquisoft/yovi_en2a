#[tokio::main]
async fn main() {
    game_manager::api_rest::run().await;
}
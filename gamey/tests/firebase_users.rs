use dotenvy::dotenv;

use gamey::db::FirestoreClient;

#[ignore]
#[tokio::test]
async fn can_fetch_users_collection() {
    dotenv().ok();

    let client = FirestoreClient::new().await;

    let response = client
        .get_collection("Users")
        .await
        .expect("Could not find users");

    println!("Response value:{}", response);

    assert!(response.contains("documents"));
}

#[ignore]
#[tokio::test]
async fn cannot_fetch_random_collection() {
    dotenv().ok();

    let client = FirestoreClient::new().await;

    // Access inexisting collection
    let response = client
        .get_collection("RandomCollection")
        .await
        .expect("Communication error with Firestore");
    
    assert!(response.contains("error") || !response.contains("documents"));
}

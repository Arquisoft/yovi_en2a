use reqwest::Client;

use super::{auth::get_access_token, service_account::ServiceAccount};

pub struct FirestoreClient {
    client: Client,
    project_id: String,
    token: String,
}

impl FirestoreClient {
    pub async fn new() -> Self {
        let sa = ServiceAccount::from_env();
        let token = get_access_token(&sa).await;

        let project_id =
            std::env::var("FIREBASE_PROJECT_ID").expect("FIREBASE_PROJECT_ID no definida");

        Self {
            client: Client::new(),
            project_id,
            token,
        }
    }

    pub async fn get_document(&self, collection: &str, id: &str) -> String {
        let url = format!(
            "https://firestore.googleapis.com/v1/projects/{}/databases/(default)/documents/{}/{}",
            self.project_id, collection, id
        );

        self.client
            .get(url)
            .bearer_auth(&self.token)
            .send()
            .await
            .expect("Firestore error")
            .text()
            .await
            .unwrap()
    }

    pub async fn get_collection(&self, collection: &str) -> Result<String, reqwest::Error> {
        let url = format!(
            "https://firestore.googleapis.com/v1/projects/{}/databases/(default)/documents/{}",
            self.project_id, collection
        );

        let res = self.client
            .get(url)
            .bearer_auth(&self.token)
            .send()
            .await?;

        Ok(res.text().await?)
    }
}

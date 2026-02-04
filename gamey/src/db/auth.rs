use chrono::{Utc, Duration};
use jsonwebtoken::{encode, Algorithm, EncodingKey, Header};
use serde::{Deserialize, Serialize};

use super::service_account::ServiceAccount;

#[derive(Serialize)]
struct Claims {
    iss: String,
    scope: String,
    aud: String,
    exp: i64,
    iat: i64,
}

#[derive(Deserialize)]
struct TokenResponse {
    access_token: String,
}

pub async fn get_access_token(sa: &ServiceAccount) -> String {
    let now = Utc::now();

    let claims = Claims {
        iss: sa.client_email.clone(),
        // Access to data store
        scope: "https://www.googleapis.com/auth/datastore".to_string(),
        aud: sa.token_uri.clone(),
        // Current time and expectation (More than 1hour different will not allow connection)
        iat: now.timestamp(),
        exp: (now + Duration::minutes(60)).timestamp(),
    };

    let key = EncodingKey::from_rsa_pem(sa.private_key.as_bytes())
        .expect("Invalid ppk");

    // Verifies the JSON Web Token with the ppk
    let jwt = encode(&Header::new(Algorithm::RS256), &claims, &key)
        .expect("Error creating JWT");

    let client = reqwest::Client::new();

    // We post the petition
    let res = client
        .post(&sa.token_uri)
        .form(&[
            ("grant_type", "urn:ietf:params:oauth:grant-type:jwt-bearer"),
            ("assertion", &jwt),
        ])
        .send()
        .await
        .expect("Error retrieving access token");

    let body: TokenResponse = res.json().await.expect("Invalid response");
    body.access_token
}
use serde::Deserialize;
use std::fs;

#[derive(Debug, Deserialize)]
pub struct ServiceAccount{
    pub client_email: String,
    pub private_key: String,
    pub token_uri: String,
}

// With this we may access the env values.
// They JSON values are read with fs and deserialized with serde storing only:
// client_email, private_key, token_uri
impl ServiceAccount{
    pub fn from_env() -> Self{
        let path = std::env::var("GOOGLE_APPLICATION_CREDENTIALS")
            .expect("App credentials not defined");

        let json = fs::read_to_string(path).expect("Could not read credentials file");
        serde_json::from_str(&json).expect("Invalid JSON ppk")
    }
}
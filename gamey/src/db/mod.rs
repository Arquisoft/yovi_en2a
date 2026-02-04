pub mod auth;
pub mod firebase;
pub mod service_account;

// Forward the client directly
pub use firebase::FirestoreClient;
pub mod data;
pub mod firebase;
pub mod redis_client;
pub mod api_rest;

#[cfg(test)]
pub use crate::firebase::remove_match_by_id;
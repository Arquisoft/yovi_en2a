use firestore::*;
use serde::{Deserialize, Serialize};
use std::error::Error;
use std::env;
use dotenvy::dotenv;
use std::sync::Once;

// We import the data structures from data.rs where they match with the firebase definition
use crate::data::{DBData, Match, Score};

/// We use a `Once` static to make sure the crypto provider is only initialized once.
/// If we don't do this, the app might panic if we call `get_connection` multiple times.
static INIT_CRYPTO: Once = Once::new();

/// Helper function to set up the Firestore connection.
/// It also handles the 'Ring' crypto provider setup which was a bit of a headache
/// because of how modern Rust crates handle TLS.
async fn get_connection() -> Result<FirestoreDb, Box<dyn Error>> {
    // Try to load the .env file if it exists
    let _ = dotenv();

    // This block only runs the very first time the function is called.
    // Rust is very strict about crypto providers now!
    INIT_CRYPTO.call_once(|| {
        rustls::crypto::ring::default_provider()
            .install_default()
            .expect("Failed to install Ring CryptoProvider");
        rustls::crypto::ring::default_provider()
            .install_default()
            .ok();
    });

    // Check if the project ID is in our environment variables
    let project_id = env::var("FIREBASE_PROJECT_ID")
        .map_err(|_| "Environment variable FIREBASE_PROJECT_ID is not set")?;

    // Create the actual client
    let db = FirestoreDb::new(&project_id).await?;

    Ok(db)
}


/// Fetches a single document from a Firestore collection and maps it to a type `T`.
///
/// # Type Parameters
/// * `T`: The target structure. It needs to implement [`DBData`] (and Send/Sync for async safety).
///
/// # Arguments
/// * `table_name` - The name of the Firestore collection (like "Users" or "Matches").
/// * `id` - The specific ID of the document you want.
///
/// # Returns
/// * `Ok(T)` - The data we found, already turned into a Rust struct.
/// * `Err` - If the document is missing or the network is down.
pub async fn read_db<T>(table_name: &str, id: &str) -> Result<T, Box<dyn Error>>
where
        for<'de> T: DBData,
{
    // Get the Firestore connection
    let db = get_connection().await?;

    // Use the Fluent API to find the document.
    // It returns an Option because the document might not exist.
    let object: Option<T> = db.fluent()
        .select()
        .by_id_in(table_name)
        .obj()
        .one(id)
        .await?;

    // We check if we actually got something back
    match object {
        Some(data) => Ok(data),
        None => Err(format!("Document with ID {} not found into {}", id, table_name).into()),
    }
}

/// Inserts a new document into Firestore and then checks if it's really there.
///
/// # Type Parameters
/// * `T`: The struct to save. Needs to be serializable for Firestore.
///
/// # Arguments
/// * `table_name` - Target collection.
/// * `id` - The ID you want to give the new document.
/// * `data` - Reference to the object you want to save.
pub async fn insert_db<T>(table_name: &str, id: &str, data: &T) -> Result<(), Box<dyn Error>>
where
        for<'de> T: DBData,
{
    // Get connection
    let db = get_connection().await?;

    // Perform the insertion using the Fluent API.
    // We use .execute::<()>() because we don't really need the return object here.
    db.fluent()
        .insert()
        .into(table_name)
        .document_id(id)
        .object(data)
        .execute::<()>()
        .await?;

    // Post-insertion check.
    // I'm calling read_db here just to be 100% sure the write worked.
    // If read_db returns an error, the '?' will propagate it.
    read_db::<T>(table_name, id).await?;

    println!("Document [{}] verified correctly in {}.", id, table_name);

    Ok(())
}

/// Shorthand to get a Match struct directly from the "Match" collection.
pub async fn get_match_by_id(id: &str) -> Result<Match, Box<dyn Error>> {
    let match_data: Match = read_db("Match", id).await?;
    Ok(match_data)
}

pub async fn insert_match_by_id(id: &str, match_data: Match) -> Result<(), Box<dyn Error>> {
    insert_db("Match", id, &match_data).await?;
    Ok(())
}

/// Fetches all matches for a specific user.
/// Since Firestore doesn't support complex OR queries easily via the basic fluent API,
/// we query for matches where the user is player1, then where they are player2, and combine them.
pub async fn get_user_matches(user_id: &str) -> Result<Vec<Match>, Box<dyn Error>> {
    let db = get_connection().await?;

    // 1. Get matches where user is player 1
    let mut matches_p1: Vec<Match> = db.fluent()
        .select()
        .from("Match")
        .filter(|q| q.for_all([q.field("player1id").eq(user_id)]))
        .obj()
        .query() 
        .await?;

    // 2. Get matches where user is player 2
    let matches_p2: Vec<Match> = db.fluent()
        .select()
        .from("Match")
        .filter(|q| q.for_all([q.field("player2id").eq(user_id)]))
        .obj()
        .query() 
        .await?;

    // 3. Combine both lists
    matches_p1.extend(matches_p2);
    Ok(matches_p1)
}

/// Fetches the Top 20 players based on their best time.
/// Orders the 'Scores' collection in ascending order (lowest time is the best).
pub async fn get_ranking_time() -> Result<Vec<Score>, Box<dyn Error>> {
    let db = get_connection().await?;

    let top_scores: Vec<Score> = db.fluent()
        .select()
        .from("Scores") 
        .order_by([(
            "best_time", 
            FirestoreQueryDirection::Ascending
        )])
        .limit(20)
        .obj()
        .query() 
        .await?;

    Ok(top_scores)
}
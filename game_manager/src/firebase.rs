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
        match dotenvy::dotenv() {
            Ok(_) => println!("INFO: Archivo .env cargado correctamente."),
            Err(e) => println!("ADVERTENCIA: No se pudo cargar el .env. Detalle: {}", e),
        }

        // This block only runs the very first time the function is called.
        // Rust is very strict about crypto providers now!
        INIT_CRYPTO.call_once(|| {
            let provider = rustls::crypto::ring::default_provider();
            let _ = provider.install_default();
            println!("INFO: Global CryptoProvider (Ring) installed.");
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

/// Actualiza el Score de un jugador al finalizar una partida.
/// Si el jugador no existe en la base de datos, lo crea automáticamente.
pub async fn update_score(
    playerid: &str,
    username: &str, 
    is_win: bool,
    time: f32,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    
    // 🔥 CAMBIO AQUÍ: Interceptamos el error inseguro de get_connection() y 
    // lo convertimos a un String seguro para que Axum no se queje.
    let db = get_connection()
        .await
        .map_err(|e| -> Box<dyn std::error::Error + Send + Sync> { e.to_string().into() })?;

    // 1. Buscamos en la colección "Scores" donde el campo `playerid` coincida
    let mut existing_scores: Vec<Score> = db.fluent()
        .select()
        .from("Scores")
        .filter(|q| q.for_all([q.field("playerid").eq(playerid)]))
        .obj()
        .query()
        .await?;

    // Si la consulta nos devuelve algún resultado, lo extraemos y lo actualizamos
    if let Some(mut score) = existing_scores.pop() {
        // --- EL REGISTRO EXISTE: ACTUALIZAMOS ---
        
        score.total_matches += 1;
        
        if is_win {
            score.wins += 1;
            score.elo += 20;
        } else {
            score.losses += 1;
            score.elo -= 15;
            if score.elo < 0 {
                score.elo = 0;
            }
        }

        if score.best_time == 0.0 || time < score.best_time {
            score.best_time = time;
        }

        score.win_rate = (score.wins as f32 / score.total_matches as f32) as std::ffi::c_float;

        db.fluent()
            .update()
            .in_col("Scores")
            .document_id(playerid) 
            .object(&score)
            .execute::<Score>()
            .await?;

    } else {
        // --- EL REGISTRO NO EXISTE: CREAMOS UNO NUEVO ---
        insert_score(playerid, username, is_win, time).await?;
    }

    Ok(())
}


/// Crea un nuevo registro de Score para un usuario que acaba de jugar su primera partida.
pub async fn insert_score(
    playerid: &str,
    username: &str,
    is_win: bool,
    time: f32,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    
    let db = get_connection()
        .await
        .map_err(|e| -> Box<dyn std::error::Error + Send + Sync> { e.to_string().into() })?;

    let wins = if is_win { 1 } else { 0 };
    let losses = if is_win { 0 } else { 1 };
    
    let initial_elo = 0; 
    let mut elo = if is_win { initial_elo + 20 } else { initial_elo - 15 };
    if elo < 0 { elo = 0; }

    let win_rate = if is_win { 1.0 } else { 0.0 };

    let new_score = Score {
        playerid: playerid.to_string(),
        username: username.to_string(),
        total_matches: 1,
        wins,
        losses,
        win_rate: win_rate as std::ffi::c_float,
        elo,
        best_time: time, 
    };

    db.fluent()
        .insert()
        .into("Scores")
        .document_id(playerid)
        .object(&new_score)
        .execute::<Score>()
        .await?;

    Ok(())
}
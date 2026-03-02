use firestore::*;
use serde::{Deserialize, Serialize};
use std::error::Error;
use std::env;
use dotenvy::dotenv;
use std::sync::Once;

// We import the User struct and DBData trait from user_data.rs
use crate::user_data::{User, DBData};

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
/// * `table_name` - The name of the Firestore collection (like "Users").
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

/// Shorthand to get a User struct directly from the "Users" collection.
pub async fn get_user_by_id(id: &str) -> Result<User, Box<dyn Error>> {
    let user_data: User = read_db("Users", id).await?;
    Ok(user_data)
}

/// Shorthand to insert a User struct directly into the "Users" collection.
pub async fn insert_user_by_id(id: &str, user_data: &User) -> Result<(), Box<dyn Error>> {
    insert_db("Users", id, user_data).await
}
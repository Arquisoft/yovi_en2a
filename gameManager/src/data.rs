use serde::{Deserialize, Serialize};

pub trait DBData: Serialize + for<'de> Deserialize<'de> + std::fmt::Debug {}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct Match{
    pub player1id: String,
    pub player2id: String,
    pub result: String
}
impl DBData for Match {}
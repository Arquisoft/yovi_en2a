use serde::{Deserialize, Serialize};
use gamey::notation::{YEN};

pub trait DBData: Serialize + for<'de> Deserialize<'de> + std::fmt::Debug  + Send + Sync {}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct Match{
    pub player1id: String,
    pub player2id: String,
    pub result: String,
    pub board_status:YEN
}
impl DBData for Match {}
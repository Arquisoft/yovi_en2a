//! Greedy bot implementation.
//!
//! This module provides [`GreedyBot`], a bot that uses a greedy heuristic
//! to select moves in the Game of Y. Unlike the minimax bot it performs no
//! look-ahead: it scores every available cell with a fixed heuristic and
//! immediately picks the best one.
//!
//! # Heuristic
//!
//! Each candidate cell is scored with a two-component tuple
//! `(own_neighbours, centrality)`:
//!
//! 1. **Own-neighbour count** – the number of adjacent cells already occupied
//!    by the bot. Preferring cells next to existing pieces encourages building
//!    connected groups, which is essential for winning in Game of Y.
//!
//! 2. **Centrality** – a tiebreaker that prefers cells closer to the centre of
//!    the triangular board. For a cell with barycentric coordinates `(x, y, z)`
//!    the score is computed as:
//!
//!    Central cells have the most neighbours and connect more
//!    easily to all three sides.
//!
//! # Trade-offs
//!
//! The greedy heuristic is fast (O(n) per move, where n is the number of
//! available cells) but plays weaker than the minimax bot because it cannot
//! anticipate threats or plan ahead. It is useful as a lightweight opponent
//! for easy difficulty or for testing purposes.

use crate::{Coordinates, GameY, PlayerId, YBot};

/// A bot that selects moves using a greedy one-step heuristic.
///
/// On each turn it scores every empty cell by the number of its own adjacent
/// pieces (to promote connectivity) and breaks ties by centrality (to favour
/// strong board positions). No lookahead is performed.
pub struct GreedyBot;

impl YBot for GreedyBot {
    fn name(&self) -> &str {
        "greedy_bot"
    }

    /// Selects the best available cell according to the greedy heuristic.
    ///
    /// The scoring key for each candidate cell is `(own_neighbours, centrality)`,
    /// compared lexicographically. The cell with the highest key is chosen.
    ///
    /// Returns `None` if the board is full or the game is already finished
    fn choose_move(&self, board: &GameY) -> Option<Coordinates> {
        let available = board.available_cells();
        if available.is_empty() {
            return None;
        }

        let size = board.board_size();


        let bot_player: PlayerId = board.next_player()?;


        // Score every available cell with a 2-tuple
        // ties in priority order: own-neighbours → centrality.
        let best_index = available
            .iter()
            .copied()
            .max_by_key(|&idx| {
                let coords = Coordinates::from_index(idx, size);
                let nbrs = neighbours(&coords);

                // Own-neighbour count.
                let own_neighbours = nbrs
                    .iter()
                    .filter(|n| board.cell_owner(n) == Some(bot_player))
                    .count();

                //Centrality: calculated based on position in the table.
                let cx = coords.x() as i32;
                let cy = coords.y() as i32;
                let cz = coords.z() as i32;

                let centrality = -((cx - cy).abs() + (cy - cz).abs() + (cz - cx).abs());

                (own_neighbours, centrality)
            })?;

        Some(Coordinates::from_index(best_index, size))
    }
}

/// Returns all valid neighbours of `coords` on the triangular Game of Y board.
///
/// The Game of Y uses a triangular grid with barycentric coordinates `(x, y, z)`
/// where `x + y + z = size - 1`.
/// Neighbours that would produce a negative coordinate are omitted, so corner
/// cells have 2 neighbours and edge cells have 4.
fn neighbours(coords: &Coordinates) -> Vec<Coordinates> {
    let x = coords.x();
    let y = coords.y();
    let z = coords.z();
    let mut result = Vec::with_capacity(6);

    if x > 0 {
        result.push(Coordinates::new(x - 1, y + 1, z));
        result.push(Coordinates::new(x - 1, y, z + 1));
    }
    if y > 0 {
        result.push(Coordinates::new(x + 1, y - 1, z));
        result.push(Coordinates::new(x, y - 1, z + 1));
    }
    if z > 0 {
        result.push(Coordinates::new(x + 1, y, z - 1));
        result.push(Coordinates::new(x, y + 1, z - 1));
    }

    result
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{Movement, PlayerId};

    #[test]
    fn test_greedy_bot_name() {
        assert_eq!(GreedyBot.name(), "greedy_bot");
    }

    #[test]
    fn test_greedy_bot_returns_move_on_empty_board() {
        let game = GameY::new(5);
        assert!(GreedyBot.choose_move(&game).is_some());
    }

    #[test]
    fn test_greedy_bot_returns_valid_coordinates() {
        let game = GameY::new(5);
        let coords = GreedyBot.choose_move(&game).unwrap();
        let index = coords.to_index(game.board_size());
        assert!(index < 15);
        assert!(game.available_cells().contains(&index));
    }

    #[test]
    fn test_greedy_bot_returns_none_on_full_board() {
        let mut game = GameY::new(2);
        for mv in [
            Movement::Placement {
                player: PlayerId::new(0),
                coords: Coordinates::new(1, 0, 0),
            },
            Movement::Placement {
                player: PlayerId::new(1),
                coords: Coordinates::new(0, 1, 0),
            },
            Movement::Placement {
                player: PlayerId::new(0),
                coords: Coordinates::new(0, 0, 1),
            },
        ] {
            game.add_move(mv).unwrap();
        }
        assert!(game.available_cells().is_empty());
        assert!(GreedyBot.choose_move(&game).is_none());
    }

    #[test]
    fn test_greedy_bot_prefers_adjacent_to_own_pieces() {
        let mut game = GameY::new(4);

        game.add_move(Movement::Placement {
            player: PlayerId::new(0),
            coords: Coordinates::new(1, 1, 1),
        })
        .unwrap();

        game.add_move(Movement::Placement {
            player: PlayerId::new(1),
            coords: Coordinates::new(3, 0, 0),
        })
        .unwrap();

        let chosen = GreedyBot.choose_move(&game).unwrap();
        let chosen_idx = chosen.to_index(game.board_size());

        let centre_neighbour_indices: Vec<u32> = neighbours(&Coordinates::new(1, 1, 1))
            .iter()
            .map(|c| c.to_index(4))
            .collect();

        assert!(
            centre_neighbour_indices.contains(&chosen_idx),
            "Greedy bot should extend its existing piece at (1,1,1), \
             but chose index {chosen_idx}"
        );
    }

    #[test]
    fn test_greedy_bot_multiple_calls_return_valid_moves() {
        let game = GameY::new(7);
        for _ in 0..5 {
            let coords = GreedyBot.choose_move(&game).unwrap();
            let index = coords.to_index(game.board_size());
            assert!(index < 28);
            assert!(game.available_cells().contains(&index));
        }
    }

    #[test]
    fn test_neighbours_centre_cell() {
        let n = neighbours(&Coordinates::new(1, 1, 1));
        assert_eq!(n.len(), 6);
    }

    #[test]
    fn test_neighbours_corner_cell() {
        let n = neighbours(&Coordinates::new(3, 0, 0));
        assert_eq!(n.len(), 2);
    }

    #[test]
    fn test_neighbours_edge_cell() {
        let n = neighbours(&Coordinates::new(2, 1, 0));
        assert_eq!(n.len(), 4);
    }
}
//! Minimax bot implementation with alpha-beta pruning.
//!
//! This module provides [`MinimaxBot`], a bot that uses the
//! minimax algorithm to select moves in the Game of Y.
//!
//! # Algorithm Overview
//!
//! Minimax is a decision-making algorithm for two-player zero-sum games. It
//! builds a game tree up to a given `depth`, assuming the opponent always plays
//! optimally. The bot maximises its own score while the opponent minimises it.
//!
//! Alpha-beta pruning is applied to skip branches of the tree that cannot
//! possibly affect the final decision, significantly reducing the number of
//! nodes evaluated without changing the result.
//!
//! # Depth and Difficulty
//!
//! The search depth controls the look-ahead horizon and directly determines
//! playing strength and computation time:
//!
//! Terminal nodes are evaluated as:
//! - **Win** (`+1 000 000`): the bot reached a winning position.
//! - **Loss** (`-1 000 000`): the opponent reached a winning position.
//! - **Draw / depth limit** (`0`): no winner within the search horizon.

use crate::{Coordinates, GameStatus, GameY, Movement, PlayerId, YBot};

/// Search depth used for easy difficulty.
pub const MINIMAX_DEPTH_EASY:   u32 = 2;
/// Search depth used for medium difficulty.
pub const MINIMAX_DEPTH_MEDIUM: u32 = 4;
/// Search depth used for hard difficulty.
pub const MINIMAX_DEPTH_HARD:   u32 = 6;

/// Score assigned to a terminal winning position for the bot.
const WIN_SCORE:  i32 = 1_000_000;
/// Score assigned to a terminal losing position for the bot.
const LOSS_SCORE: i32 = -1_000_000;

/// A bot that uses minimax search with alpha-beta pruning.
///
/// Strength is controlled by the `depth` parameter: higher depth means
/// stronger play at the cost of more computation time.
pub struct MinimaxBot { depth: u32 }

impl MinimaxBot {
    /// Creates a new [`MinimaxBot`] with the given search depth.
    ///
    /// A depth of `0` degenerates to returning the first available cell
    /// with no look-ahead. Prefer the named depth constants for standard
    /// difficulty levels.
    pub fn new(depth: u32) -> Self { Self { depth } }

    /// Returns the configured search depth.
    pub fn depth(&self) -> u32 { self.depth }
}

impl YBot for MinimaxBot {
    fn name(&self) -> &str { "minimax_bot" }

    /// Selects the best move for the current player using minimax search.
    ///
    /// Iterates over all available cells, simulates each move, and evaluates
    /// the resulting position with [`minimax`]. Returns the cell with the
    /// highest score. Alpha-beta bounds are updated at the root to allow
    /// early pruning in deeper branches.
    ///
    /// Returns `None` if the board is full or the game is already finished.
    fn choose_move(&self, board: &GameY) -> Option<Coordinates> {
        if board.available_cells().is_empty() { return None; }
        let bot = board.next_player()?;
        if self.depth == 0 {
            return board.available_cells().first()
                .map(|&idx| Coordinates::from_index(idx, board.board_size()));
        }

        let (mut best_score, mut best_move, mut alpha) = (i32::MIN, None, i32::MIN);
        for &idx in board.available_cells() {
            let coords: Coordinates = Coordinates::from_index(idx, board.board_size());
            let mut child: GameY = board.clone();
            let _ = child.add_move(Movement::Placement { player: bot, coords });
            let score: i32 = minimax(&child, self.depth - 1, i32::MIN, i32::MAX, false, bot);
            if score > best_score {
                best_score = score;
                best_move = Some(coords);
            }
            alpha = alpha.max(best_score);
        }
        best_move
    }
}

/// Recursive minimax with alpha-beta pruning.
///
/// # Parameters
/// - `board`: the current game state.
/// - `depth`: remaining search depth. Returns `0` when exhausted.
/// - `alpha`: best score the maximising player can already guarantee.
/// - `beta`: best score the minimising player can already guarantee.
/// - `maximizing`: `true` when it is the bot's turn, `false` for the opponent.
/// - `bot`: the [`PlayerId`] of the bot, used to determine win/loss at terminal nodes.
///
/// # Returns
/// The heuristic value of `board` from the bot's perspective:
/// - [`WIN_SCORE`] if the bot has won.
/// - [`LOSS_SCORE`] if the opponent has won.
/// - `0` when the depth limit is reached or no moves remain.
/// - An intermediate value otherwise, propagated from child nodes.
fn minimax(board: &GameY, depth: u32, mut alpha: i32, mut beta: i32, maximizing: bool, bot: PlayerId) -> i32 {
    if board.check_game_over() {
        return match board.status() {
            GameStatus::Finished { winner } => if *winner == bot { WIN_SCORE } else { LOSS_SCORE },
            GameStatus::Ongoing { .. } => 0,
        };
    }
    if depth == 0 || board.available_cells().is_empty() { return 0; }

    let player = match board.next_player() { Some(p) => p, None => return 0 };
    let mut best = if maximizing { i32::MIN } else { i32::MAX };

    for &idx in board.available_cells() {
        let coords = Coordinates::from_index(idx, board.board_size());
        let mut child = board.clone();
        let _ = child.add_move(Movement::Placement { player, coords });
        let score = minimax(&child, depth - 1, alpha, beta, !maximizing, bot);

        if maximizing {
            if score > best { best = score; }
            alpha = alpha.max(best);
        }
        else {
            if score < best { best = score; }
            beta = beta.min(best);
        }
        if alpha >= beta { break; }
    }
    best
}

#[cfg(test)]
mod tests {
    use super::*;

    fn place(game: &mut GameY, moves: &[(u32, (u32, u32, u32))]) {
        for &(p, (x, y, z)) in moves {
            game.add_move(Movement::Placement {
                player: PlayerId::new(p),
                coords: Coordinates::new(x, y, z),
            }).unwrap();
        }
    }

    // Bot identity

    #[test]
    fn test_name() { assert_eq!(MinimaxBot::new(2).name(), "minimax_bot"); }

    #[test]
    fn test_depth_getter() { assert_eq!(MinimaxBot::new(4).depth(), 4); }

    // Basic move selection
    #[test]
    fn test_returns_move_on_empty_board() {
        assert!(MinimaxBot::new(MINIMAX_DEPTH_EASY).choose_move(&GameY::new(4)).is_some());
    }

    #[test]
    fn test_returns_none_on_full_board() {
        let mut game = GameY::new(2);
        place(&mut game, &[(0,(1,0,0)), (1,(0,1,0)), (0,(0,0,1))]);
        assert!(MinimaxBot::new(2).choose_move(&game).is_none());
    }

    #[test]
    fn test_returned_coords_are_available() {
        let game = GameY::new(4);
        let coords = MinimaxBot::new(MINIMAX_DEPTH_EASY).choose_move(&game).unwrap();
        assert!(game.available_cells().contains(&coords.to_index(game.board_size())));
    }

    #[test]
    fn test_depth_zero_returns_first_available() {
        let game = GameY::new(4);
        let coords = MinimaxBot::new(0).choose_move(&game).unwrap();
        assert_eq!(coords.to_index(game.board_size()), *game.available_cells().first().unwrap());
    }

    // Win / loss detection

    #[test]
    fn test_takes_immediate_win() {
        // p0 has (2,0,0)-(1,0,1): connected chain touching sides b and c.
        // Only (0,0,2) completes the chain to also touch side a.
        // (1,1,0) is the other available cell but does not form a winning chain.
        let mut game = GameY::new(3);
        place(&mut game, &[
            (0, (2,0,0)), (1, (0,2,0)),
            (0, (1,0,1)), (1, (0,1,1)),
        ]);
        assert_eq!(
            MinimaxBot::new(MINIMAX_DEPTH_EASY).choose_move(&game).unwrap(),
            Coordinates::new(0, 0, 2)
        );
    }

    #[test]
    fn test_blocks_opponent_win() {
        // p1 has (2,0,0)-(1,0,1), one move from winning at (0,0,2).
        // It is p0's turn. Only (0,0,2) blocks; (1,1,0) does not.
        let mut game = GameY::new(3);
        place(&mut game, &[
            (0, (0,2,0)), (1, (2,0,0)),
            (0, (0,1,1)), (1, (1,0,1)),
        ]);
        assert_eq!(
            MinimaxBot::new(MINIMAX_DEPTH_MEDIUM).choose_move(&game).unwrap(),
            Coordinates::new(0, 0, 2)
        );
    }

    // Score constants

    #[test]
    fn test_win_score_positive()  { assert!(WIN_SCORE > 0); }

    #[test]
    fn test_loss_score_negative() { assert!(LOSS_SCORE < 0); }

    #[test]
    fn test_win_loss_symmetric()  { assert_eq!(WIN_SCORE, -LOSS_SCORE); }

    // minimax internals

    #[test]
    fn test_minimax_finished_board_win() {
        // (2,0,0)-(1,0,1)-(0,0,2): connected chain touching all three sides
        let mut game = GameY::new(3);
        place(&mut game, &[
            (0, (2,0,0)), (1, (0,2,0)),
            (0, (1,0,1)), (1, (0,1,1)),
            (0, (0,0,2)),
        ]);
        assert!(game.check_game_over());
        assert_eq!(minimax(&game, 4, i32::MIN, i32::MAX, false, PlayerId::new(0)), WIN_SCORE);
    }

    #[test]
    fn test_minimax_finished_board_loss() {
        let mut game = GameY::new(3);
        place(&mut game, &[
            (0, (2,0,0)), (1, (0,2,0)),
            (0, (1,0,1)), (1, (0,1,1)),
            (0, (0,0,2)),
        ]);
        assert!(game.check_game_over());
        assert_eq!(minimax(&game, 4, i32::MIN, i32::MAX, false, PlayerId::new(1)), LOSS_SCORE);
    }

    #[test]
    fn test_minimax_depth_zero_returns_draw() {
        //Depth 0 always returns 0
        let game = GameY::new(4);
        assert_eq!(minimax(&game, 0, i32::MIN, i32::MAX, true, PlayerId::new(0)), 0);
    }

    #[test]
    fn test_minimax_score_bounded() {
        let game = GameY::new(3);
        let score = minimax(&game, 2, i32::MIN, i32::MAX, true, PlayerId::new(0));
        assert!(score >= LOSS_SCORE && score <= WIN_SCORE);
    }

    #[test]
    fn test_minimax_deterministic() {
        let mut game = GameY::new(3);
        place(&mut game, &[(0,(2,0,0)), (1,(0,2,0))]);
        assert_eq!(
            MinimaxBot::new(2).choose_move(&game),
            MinimaxBot::new(2).choose_move(&game)
        );
    }
}
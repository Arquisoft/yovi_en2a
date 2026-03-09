use crate::{Coordinates, GameStatus, GameY, Movement, PlayerId, YBot};

pub const MINIMAX_DEPTH_EASY:   u32 = 2;
pub const MINIMAX_DEPTH_MEDIUM: u32 = 4;
pub const MINIMAX_DEPTH_HARD:   u32 = 6;

const WIN_SCORE:  i32 = 1_000_000;
const LOSS_SCORE: i32 = -1_000_000;

pub struct MinimaxBot { depth: u32 }

impl MinimaxBot {
    pub fn new(depth: u32) -> Self { Self { depth } }
    pub fn depth(&self) -> u32 { self.depth }
}

impl YBot for MinimaxBot {
    fn name(&self) -> &str { "minimax_bot" }

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
//! Minimax bot implementation with alpha-beta pruning and iterative deepening.
//!
//! This module provides [`MinimaxBot`], a bot that uses the minimax algorithm
//! with several practical enhancements to select moves in the Game of Y.
//!
//! # Algorithm Overview
//!
//! Minimax is a decision-making algorithm for two-player zero-sum games. It
//! builds a game tree up to a given `depth`, assuming the opponent always plays
//! optimally. The bot maximises its own score while the opponent minimises it.
//!
//! Alpha-beta pruning skips branches that cannot affect the final decision,
//! significantly reducing the number of nodes evaluated without changing the result.
//!
//! # Immediate Win Detection
//!
//! Before running any heuristic-ordered search, [`search_at_depth`] calls
//! [`find_immediate_win`], which scans **all** available cells for a 1-move win.
//! This bypasses the [`candidate_cells`] restriction and move ordering, so the
//! bot never misses a winning move regardless of how it scores heuristically.
//!
//! # Move Ordering and Candidate Pruning
//!
//! To keep the branching factor manageable as the board fills up:
//! - [`candidate_cells`] restricts the search to cells adjacent to already-occupied
//!   cells. On an empty board all cells are candidates.
//! - [`ordered_moves`] scores each candidate using [`order_score`], which rewards
//!   cells adjacent to opponent pieces (blocking), cells adjacent to own pieces
//!   (extension), cells on sides already touched by either player, and cells with
//!   more neighbours (central positions). Candidates are sorted in descending order.
//! - Inside [`minimax`], only the top [`MAX_CANDIDATES`] (= 15) moves from the
//!   ordered list are expanded at each node.
//!
//! # Position Evaluation
//!
//! [`evaluate`] estimates the value of a non-terminal position using a
//! shortest-path heuristic (0-1 BFS):
//!
//! - [`passable_cells`] finds all cells that are empty or owned by the player,
//!   representing the cells through which a virtual connection could pass.
//! - [`connected_groups`] finds all connected groups of a player's pieces via BFS.
//! - [`dist_to_side`] computes the minimum number of *empty* cells a group needs
//!   to reach each of the three sides (0-1 BFS: owned neighbours cost 0, empty
//!   neighbours cost 1).
//! - [`position_score`] sums the three side-distances for each group and takes the
//!   minimum across groups (best group wins). A lower score means a shorter path
//!   to connecting all three sides.
//! - [`evaluate`] returns `opp_score - bot_score`, so larger positive values
//!   favour the bot.
//!
//! # Depth Modes
//! The `depth` field of [`MinimaxBot`] controls the search horizon:
//!
//! - **Positive depth** (`MINIMAX_DEPTH_EASY = 2`, `MINIMAX_DEPTH_MEDIUM = 4`,
//!   `MINIMAX_DEPTH_HARD = 6`): fixed-depth search via [`search_at_depth`].
//! - **Zero**: returns the first available cell with no look-ahead.
//! - **Negative** (`MINIMAX_DEPTH_AUTO = -1`): iterative deepening — the bot
//!   searches at depth 1, 2, 3, … and stops when a depth level takes ≥
//!   [`AUTO_TIME_LIMIT_SECS`] (0.4 s) or a forced win is found. The best move
//!   from the deepest completed search is returned.
//!
//! # Terminal Node Scores
//!
//! - **Win** (`WIN_SCORE = +1 000 000`): the bot has connected all three sides.
//! - **Loss** (`LOSS_SCORE = −1 000 000`): the opponent has connected all three sides.
//! - **Depth limit reached**: returns the heuristic value from [`evaluate`].

use crate::{Coordinates, GameStatus, GameY, Movement, PlayerId, YBot};
use std::collections::{HashMap, HashSet, VecDeque};

/// Search depth used for easy difficulty.
pub const MINIMAX_DEPTH_EASY: i32 = 2;
/// Search depth used for medium difficulty.
pub const MINIMAX_DEPTH_MEDIUM: i32 = 4;
/// Search depth used for hard difficulty.
pub const MINIMAX_DEPTH_HARD: i32 = 6;
/// Sentinel depth that activates iterative deepening mode.
pub const MINIMAX_DEPTH_AUTO: i32 = -1;

/// Score assigned to a terminal winning position for the bot.
const WIN_SCORE: i32 = 1000000;
/// Score assigned to a terminal losing position for the bot.
const LOSS_SCORE: i32 = -1000000;
/// Fallback distance used when a side is unreachable (blocked by opponent pieces).
const UNREACHABLE: i32 = 1000;
/// Limits the branching factor as the board fills up.
const MAX_CANDIDATES: usize = 15;
/// Maximum wall-clock time (seconds) allowed per depth level in iterative deepening.
const AUTO_TIME_LIMIT_SECS: f64 = 0.4;

/// A bot that uses minimax search with alpha-beta pruning.
///
/// Strength is controlled by the `depth` parameter: higher depth means
/// stronger play at the cost of more computation time.
pub struct MinimaxBot { depth: i32 }

impl MinimaxBot {
    /// Creates a new [`MinimaxBot`] with the given search depth.
    ///
    /// A depth of `0` degenerates to returning the first available cell
    /// with no look-ahead. Prefer the named depth constants for standard
    /// difficulty levels.
    pub fn new(depth: i32) -> Self { Self { depth } }

    /// Returns the configured search depth.
    pub fn depth(&self) -> i32 { self.depth }
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
        if self.depth > 0 {
            let (best_move, _) = search_at_depth(board, bot, self.depth as u32);
            return best_move;
        }
        // Auto mode: iterative deepening — stop after the first depth that takes >= 0.4 s.
        let mut best_move = board.available_cells().first()
            .map(|&idx| Coordinates::from_index(idx, board.board_size()));

        let max_depth = board.available_cells().len() as u32;
        for d in 1u32..=max_depth {
            let start = std::time::Instant::now();
            let (candidate, score) = search_at_depth(board, bot, d);
            if let Some(m) = candidate { best_move = Some(m); }
            if score >= WIN_SCORE || score <= LOSS_SCORE { break; } // outcome determined, no point going deeper
            if start.elapsed().as_secs_f64() >= AUTO_TIME_LIMIT_SECS { break; }
        }
        best_move
    }
}

/// Runs a single fixed-depth search and returns the best `(move, score)` pair.
///
/// Checks for an immediate 1-move win first via [`find_immediate_win`]. If none
/// is found, iterates over [`ordered_moves`] and calls [`minimax`] for each,
/// propagating the root alpha bound to enable early pruning. Stops early if a
/// forced win (`score >= WIN_SCORE`) is found.
fn search_at_depth(board: &GameY, bot: PlayerId, depth: u32) -> (Option<Coordinates>, i32) {
    // Scan every available cell for an immediate win before doing any ordered search.
    // This bypasses the candidate_cells restriction and the move ordering, so the bot
    // never misses a 1-move win regardless of where it sits in the ordered list.
    if let Some(coords) = find_immediate_win(board, bot) {
        return (Some(coords), WIN_SCORE);
    }
    let (mut best_score, mut best_move, mut alpha) = (i32::MIN, None, i32::MIN);
    for coords in ordered_moves(board, bot, bot) {
        let mut child = board.clone();
        let _ = child.add_move(Movement::Placement { player: bot, coords });
        let score = minimax(&child, depth - 1, alpha, i32::MAX, false, bot);
        if score > best_score { best_score = score; best_move = Some(coords); }
        if best_score > alpha { alpha = best_score; }
        if best_score >= WIN_SCORE { break; } // found a forced win, no need to check more
    }
    (best_move, best_score)
}

/// Scans all available cells for an immediate 1-move win, ignoring move ordering.
fn find_immediate_win(board: &GameY, bot: PlayerId) -> Option<Coordinates> {
    let size = board.board_size();
    for &idx in board.available_cells() {
        let coords = Coordinates::from_index(idx, size);
        let mut child = board.clone();
        let _ = child.add_move(Movement::Placement { player: bot, coords });
        if child.check_game_over() {
            if let GameStatus::Finished { winner } = child.status() {
                if *winner == bot { return Some(coords); }
            }
        }
    }
    None
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
            GameStatus::Ongoing { .. } => evaluate(board, bot),
        };
    }
    if depth == 0 || board.available_cells().is_empty() { return evaluate(board, bot); }

    let player = match board.next_player() { Some(p) => p, None => return evaluate(board, bot) };
    let mut best = if maximizing { i32::MIN } else { i32::MAX };

    for coords in ordered_moves(board, player, bot).into_iter().take(MAX_CANDIDATES) {
        let mut child = board.clone();
        let _ = child.add_move(Movement::Placement { player, coords });
        let score = minimax(&child, depth - 1, alpha, beta, !maximizing, bot);

        if maximizing {
            if score > best { best = score; }
            alpha = alpha.max(best);
        }else {
            if score < best { best = score; }
            beta = beta.min(best);
        }
        if alpha >= beta { break; }
    }
    best
}

/// Heuristic evaluation of a non-terminal position from the bot's perspective.
///
/// Computes `opp_score - bot_score` where each score is the minimum total
/// side-distance across all of that player's connected groups.
fn evaluate(board: &GameY, bot: PlayerId) -> i32 {
    let opp = other_player(bot);

    let bot_passable = passable_cells(board, bot);
    let opp_passable = passable_cells(board, opp);
    let bot_groups   = connected_groups(board, bot);
    let opp_groups   = connected_groups(board, opp);

    let bot_score = position_score(&bot_groups, &bot_passable);
    let opp_score = position_score(&opp_groups, &opp_passable);

    opp_score - bot_score
}

/// Returns the minimum total side-distance across all groups.
///
/// For each group, sums the shortest distances to side A, B, and C (via
/// [`dist_to_side`]). Returns the minimum across all groups.
fn position_score(groups: &[Vec<Coordinates>], passable: &HashSet<Coordinates>) -> i32 {
    if groups.is_empty() { return UNREACHABLE * 3; }

    groups.iter().map(|group| {
        let distance_a = dist_to_side(group, 0, passable);
        let distance_b = dist_to_side(group, 1, passable);
        let distance_c = dist_to_side(group, 2, passable);
        distance_a + distance_b + distance_c
    }).min().unwrap_or(UNREACHABLE * 3)
}

/// Returns all cells that are either empty or owned by `player`.
/// These are the cells through which a virtual connection for `player` can pass.
fn passable_cells(board: &GameY, player: PlayerId) -> HashSet<Coordinates> {
    let size = board.board_size();
    (0..size*(size+1)/2)
        .map(|idx| Coordinates::from_index(idx, size))
        .filter(|c| {
            let owner = board.cell_owner(c);
            owner.is_none() || owner == Some(player)
        })
        .collect()
}

/// Returns all connected groups of `player`'s pieces as a list of coordinate lists.
/// Uses BFS over the player's occupied cells to identify connected components.
fn connected_groups(board: &GameY, player: PlayerId) -> Vec<Vec<Coordinates>> {
    let size = board.board_size();
    let available: HashSet<u32> = board.available_cells().iter().copied().collect();
    let owned: HashSet<Coordinates> = (0..size*(size+1)/2)
        .map(|idx| Coordinates::from_index(idx, size))
        .filter(|c| !available.contains(&c.to_index(size)) && board.cell_owner(c) == Some(player))
        .collect();

    let mut visited: HashSet<Coordinates> = HashSet::new();
    let mut groups = Vec::new();

    for &cell in &owned {
        if visited.contains(&cell) { continue; }
        let mut group = Vec::new();
        let mut queue = VecDeque::from([cell]);
        visited.insert(cell);
        while let Some(cur) = queue.pop_front() {
            group.push(cur);
            for n in neighbours(&cur) {
                if owned.contains(&n) && visited.insert(n) { queue.push_back(n); }
            }
        }
        groups.push(group);
    }
    groups
}

/// Returns `true` if `cell` touches the given `side` (0 = A, 1 = B, 2 = C).
fn on_target_side(cell: &Coordinates, side: u8) -> bool {
    match side {
        0 => cell.touches_side_a(),
        1 => cell.touches_side_b(),
        _ => cell.touches_side_c(),
    }
}

/// Relaxes a single neighbour in the 0-1 BFS used by [`dist_to_side`].
///
/// Skips the neighbour if it is not passable or already visited. Otherwise,
/// computes its tentative distance (0 if it belongs to the group, 1 otherwise)
/// and updates `dist`/`deque` when a shorter path is found.
fn relax_neighbour(
    neighbour: &Coordinates,
    current_dist: i32,
    group_set: &HashSet<Coordinates>,
    passable: &HashSet<Coordinates>,
    visited: &HashSet<Coordinates>,
    dist: &mut HashMap<Coordinates, i32>,
    deque: &mut VecDeque<Coordinates>,
) {
    if !passable.contains(neighbour) || visited.contains(neighbour) { return; }
    let cost = if group_set.contains(neighbour) { 0 } else { 1 };
    let new_dist = current_dist + cost;
    if new_dist < *dist.get(neighbour).unwrap_or(&UNREACHABLE) {
        dist.insert(*neighbour, new_dist);
        if cost == 0 { deque.push_front(*neighbour); } else { deque.push_back(*neighbour); }
    }
}

/// Computes the minimum number of empty cells needed to connect `group` to `side`
///
/// Uses 0-1 BFS (deque): moving through an already-owned cell in the group costs 0,
/// moving through an empty passable cell costs 1. Returns [`UNREACHABLE`] if no
/// path exists through passable cells.
fn dist_to_side(group: &[Coordinates], side: u8, passable: &HashSet<Coordinates>) -> i32 {
    let group_set: HashSet<Coordinates> = group.iter().copied().collect();
    let mut dist: HashMap<Coordinates, i32> = HashMap::new();
    let mut deque: VecDeque<Coordinates> = VecDeque::new();
    let mut visited: HashSet<Coordinates> = HashSet::new();

    for &cell in group {
        dist.insert(cell, 0);
        deque.push_front(cell);
    }

    while let Some(current) = deque.pop_front() {
        if !visited.insert(current) { continue; }
        let current_dist = dist[&current];
        if on_target_side(&current, side) { return current_dist; }
        for neighbour in neighbours(&current) {
            relax_neighbour(&neighbour, current_dist, &group_set, passable, &visited, &mut dist, &mut deque);
        }
    }
    UNREACHABLE
}

/// Returns [`candidate_cells`] sorted by [`order_score`] in descending order.
///
/// Precomputes the sides already touched by each player and the size of the
/// opponent's largest connected group, then scores each candidate cell and
/// sorts them so the most promising moves are evaluated first.
fn ordered_moves(board: &GameY, player: PlayerId, bot: PlayerId) -> Vec<Coordinates> {
    let size  = board.board_size();
    let human = other_player(bot);
    let avail: HashSet<u32> = board.available_cells().iter().copied().collect();

    let (mut player_owned, mut human_owned) = (Vec::new(), Vec::new());
    let (mut player_sides, mut human_sides) = ((false,false,false), (false,false,false));
    for idx in 0..size*(size+1)/2 {
        if avail.contains(&idx) { continue; }
        let c = Coordinates::from_index(idx, size);
        if board.cell_owner(&c) == Some(player) {
            player_sides.0 |= c.touches_side_a();
            player_sides.1 |= c.touches_side_b();
            player_sides.2 |= c.touches_side_c();
            player_owned.push(c);
        } else if board.cell_owner(&c) == Some(human) {
            human_sides.0 |= c.touches_side_a();
            human_sides.1 |= c.touches_side_b();
            human_sides.2 |= c.touches_side_c();
            human_owned.push(c);
        }
    }

    let human_group_size = largest_group_size(&human_owned);

    let mut scored: Vec<(Coordinates, i32)> = candidate_cells(board).iter().map(|&idx| {
        let coords = Coordinates::from_index(idx, size);
        (coords, order_score(board, &coords, player, human, player_sides, human_sides, human_group_size))
    }).collect();

    scored.sort_unstable_by(|a, b| b.1.cmp(&a.1));
    scored.into_iter().map(|(c, _)| c).collect()
}

/// Scores a single candidate cell for move ordering. Higher is more promising.
///
/// The score is the sum of:
/// - `human_neighbours × (15 + largest_human_group_size)` — blocking the opponent
///   near a large group is highly rewarded.
/// - `20` for each side already touched by the opponent that this cell also touches
///   — directly contesting opponent-held sides.
/// - `player_neighbours × 10` — extending own chains.
/// - `10` for each side already touched by the player that this cell also touches
///   — reinforcing own sides.
/// - `neighbour_count × 5` — central cells with more neighbours are preferred.
fn order_score(
    board: &GameY,
    coords: &Coordinates,
    player: PlayerId,
    human: PlayerId,
    player_sides: (bool,bool,bool),
    human_sides: (bool,bool,bool),
    human_group_size: i32,
) -> i32 {
    let nbrs = neighbours(coords);
    let human_nbrs  = nbrs.iter().filter(|n| board.cell_owner(n) == Some(human)).count()  as i32;
    let player_nbrs = nbrs.iter().filter(|n| board.cell_owner(n) == Some(player)).count() as i32;
    let mut score = 0i32;

    score += human_nbrs * (15 + human_group_size);

    let (ha, hb, hc) = human_sides;
    score += i32::from(coords.touches_side_a() && ha) * 20;
    score += i32::from(coords.touches_side_b() && hb) * 20;
    score += i32::from(coords.touches_side_c() && hc) * 20;

    score += player_nbrs * 10;

    let (pa, pb, pc) = player_sides;
    score += i32::from(coords.touches_side_a() && pa) * 10;
    score += i32::from(coords.touches_side_b() && pb) * 10;
    score += i32::from(coords.touches_side_c() && pc) * 10;

    score += nbrs.len() as i32 * 5;

    score
}


/// Returns the subset of available cells that are adjacent to at least one
/// already-occupied cell. On an empty board, returns all available cells.
fn candidate_cells(board: &GameY) -> Vec<u32> {
    let size = board.board_size();
    let avail: HashSet<u32> = board.available_cells().iter().copied().collect();

    let occupied: HashSet<Coordinates> = (0..size*(size+1)/2)
        .map(|idx| Coordinates::from_index(idx, size))
        .filter(|c| !avail.contains(&c.to_index(size)))
        .collect();

    if occupied.is_empty() {
        return board.available_cells().clone();
    }

    board.available_cells().iter().copied()
        .filter(|&idx| {
            let c = Coordinates::from_index(idx, size);
            neighbours(&c).iter().any(|n| occupied.contains(n))
        })
        .collect()
}

/// Returns the other player (assumes exactly two players with IDs 0 and 1).
fn other_player(player: PlayerId) -> PlayerId {
    if player.id() == 0 { PlayerId::new(1) } else { PlayerId::new(0) }
}

/// Returns the number of cells in the largest connected group among `owned`.
fn largest_group_size(owned: &[Coordinates]) -> i32 {
    if owned.is_empty() { return 0; }
    let set: HashSet<Coordinates> = owned.iter().copied().collect();
    let mut visited: HashSet<Coordinates> = HashSet::new();
    let mut largest = 0i32;
    for &start in owned {
        if visited.contains(&start) { continue; }
        let (mut q, mut sz) = (VecDeque::from([start]), 0i32);
        visited.insert(start);
        while let Some(cur) = q.pop_front() {
            sz += 1;
            for n in neighbours(&cur) {
                if set.contains(&n) && visited.insert(n) { q.push_back(n); }
            }
        }
        largest = largest.max(sz);
    }
    largest
}

/// Returns the up-to-6 neighbours of `c` on the triangular Y board.
fn neighbours(c: &Coordinates) -> Vec<Coordinates> {
    let (x, y, z) = (c.x(), c.y(), c.z());
    let mut r = Vec::with_capacity(6);
    if x > 0 { r.push(Coordinates::new(x-1,y+1,z)); r.push(Coordinates::new(x-1,y,z+1)); }
    if y > 0 { r.push(Coordinates::new(x+1,y-1,z)); r.push(Coordinates::new(x,y-1,z+1)); }
    if z > 0 { r.push(Coordinates::new(x+1,y,z-1)); r.push(Coordinates::new(x,y+1,z-1)); }
    r
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

     #[test]
  fn test_auto_mode_returns_a_valid_move() {
      let game = GameY::new(4);
      let coords = MinimaxBot::new(MINIMAX_DEPTH_AUTO).choose_move(&game).unwrap();
      assert!(game.available_cells().contains(&coords.to_index(game.board_size())));
  }

  #[test]
  fn test_auto_mode_takes_immediate_win() {
      // reuse same near-win position from test_takes_immediate_win
      let mut game = GameY::new(3);
      place(&mut game, &[
          (0, (2,0,0)), (1, (0,2,0)),
          (0, (1,0,1)), (1, (0,1,1)),
      ]);
      assert_eq!(
          MinimaxBot::new(MINIMAX_DEPTH_AUTO).choose_move(&game).unwrap(),
          Coordinates::new(0, 0, 2)
      );
  }

   #[test]
    fn test_prefers_win_over_high_scoring_block() {
        let mut game = GameY::new(5);
        place(&mut game, &[
            (0, (0,0,4)), (1, (4,0,0)),
            (0, (0,1,3)), (1, (3,1,0)),
            (0, (0,2,2)), (1, (2,1,1)),
            (0, (0,3,1)), (1, (1,2,1)),
        ]);
        assert_eq!(game.next_player(), Some(PlayerId::new(0)));
        assert_eq!(
            MinimaxBot::new(MINIMAX_DEPTH_EASY).choose_move(&game).unwrap(),
             Coordinates::new(1, 3, 0),
        );
    }
}
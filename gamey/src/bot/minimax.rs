use crate::{Coordinates, GameStatus, GameY, Movement, PlayerId, YBot};
use std::collections::{HashMap, HashSet, VecDeque};

pub const MINIMAX_DEPTH_EASY: i32 = 2;
pub const MINIMAX_DEPTH_MEDIUM: i32 = 4;
pub const MINIMAX_DEPTH_HARD: i32 = 6;
pub const MINIMAX_DEPTH_AUTO: i32 = -1;

const WIN_SCORE: i32 = 1000000;
const LOSS_SCORE: i32 = -1000000;
const UNREACHABLE: i32 = 1000;
const MAX_CANDIDATES: usize = 15;
const AUTO_TIME_LIMIT_SECS: f64 = 0.4;

pub struct MinimaxBot { depth: i32 }

impl MinimaxBot {
    pub fn new(depth: i32) -> Self { Self { depth } }
    pub fn depth(&self) -> i32 { self.depth }
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
        if self.depth > 0 {
            let (best_move, _) = search_at_depth(board, bot, self.depth as u32);
            return best_move;
        }
        // Auto mode: iterative deepening — stop after the first depth that takes >= 0.4 s.
        let mut best_move = board.available_cells().first()
            .map(|&idx| Coordinates::from_index(idx, board.board_size()));

        for d in 1u32.. {
            let start = std::time::Instant::now();
            let (candidate, score) = search_at_depth(board, bot, d);
            if let Some(m) = candidate { best_move = Some(m); }
            if score >= WIN_SCORE { break; } // found a forced win, no need to go deeper
            if start.elapsed().as_secs_f64() >= AUTO_TIME_LIMIT_SECS { break; }
        }
        best_move
    }
}

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
        } else {
            if score < best { best = score; }
            beta = beta.min(best);
        }
        if alpha >= beta { break; }
    }
    best
}

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

fn position_score(groups: &[Vec<Coordinates>], passable: &HashSet<Coordinates>) -> i32 {
    if groups.is_empty() { return UNREACHABLE * 3; }

    groups.iter().map(|group| {
        let distance_a = dist_to_side(group, 0, passable);
        let distance_b = dist_to_side(group, 1, passable);
        let distance_c = dist_to_side(group, 2, passable);
        distance_a + distance_b + distance_c
    }).min().unwrap_or(UNREACHABLE * 3)
}

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

        let on_side = match side {
            0 => current.touches_side_a(),
            1 => current.touches_side_b(),
            _ => current.touches_side_c(),
        };
        if on_side { return current_dist; }

        for neighbour in neighbours(&current) {
            if !passable.contains(&neighbour) || visited.contains(&neighbour) { continue; }
            let cost = if group_set.contains(&neighbour) { 0 } else { 1 };
            let new_dist = current_dist + cost;
            if new_dist < *dist.get(&neighbour).unwrap_or(&UNREACHABLE) {
                dist.insert(neighbour, new_dist);
                if cost == 0 { deque.push_front(neighbour); } else { deque.push_back(neighbour); }
            }
        }
    }
    UNREACHABLE
}

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

fn other_player(player: PlayerId) -> PlayerId {
    if player.id() == 0 { PlayerId::new(1) } else { PlayerId::new(0) }
}

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

fn neighbours(c: &Coordinates) -> Vec<Coordinates> {
    let (x, y, z) = (c.x(), c.y(), c.z());
    let mut r = Vec::with_capacity(6);
    if x > 0 { r.push(Coordinates::new(x-1,y+1,z)); r.push(Coordinates::new(x-1,y,z+1)); }
    if y > 0 { r.push(Coordinates::new(x+1,y-1,z)); r.push(Coordinates::new(x,y-1,z+1)); }
    if z > 0 { r.push(Coordinates::new(x+1,y,z-1)); r.push(Coordinates::new(x,y+1,z-1)); }
    r
}
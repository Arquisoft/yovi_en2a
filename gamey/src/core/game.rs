use crate::core::SetIdx;
use crate::core::player_set::PlayerSet;
use crate::{Coordinates, GameAction, GameYError, Movement, PlayerId, RenderOptions, YEN};
use rand::Rng;
use std::collections::{HashMap, HashSet};
use std::fmt::Write;
use std::path::Path;

/// A Result type alias for game operations that may fail with a `GameYError`.
pub type Result<T> = std::result::Result<T, crate::GameYError>;

/// Game variant that modifies rules and win conditions.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum GameVariant {
    /// Standard rules: connecting all three sides wins.
    Standard,
    /// Misère rules: connecting all three sides loses (the opponent wins).
    WhyNot,
    /// Each player places two pieces per turn instead of one.
    MasterY,
    /// Before each move a coin decides who plays next (random player selection).
    FortuneY,
    /// A player may not place adjacent to the cell their opponent placed last turn.
    TabuY,
    /// Some cells are permanently blocked (holes).
    HoleyY,
}

impl GameVariant {
    fn from_str(s: &str) -> Self {
        match s {
            "why_not" => GameVariant::WhyNot,
            "master_y" => GameVariant::MasterY,
            "fortune_y" => GameVariant::FortuneY,
            "tabu_y" => GameVariant::TabuY,
            "holey_y" => GameVariant::HoleyY,
            _ => GameVariant::Standard,
        }
    }

    fn as_str(&self) -> Option<&'static str> {
        match self {
            GameVariant::Standard => None,
            GameVariant::WhyNot => Some("why_not"),
            GameVariant::MasterY => Some("master_y"),
            GameVariant::FortuneY => Some("fortune_y"),
            GameVariant::TabuY => Some("tabu_y"),
            GameVariant::HoleyY => Some("holey_y"),
        }
    }
}

/// The main game state for a Y game.
///
/// Y is a connection game played on a triangular board where players
/// take turns placing pieces. The goal is to connect all three sides
/// of the triangle with a single chain of connected pieces.
#[derive(Debug, Clone)]
pub struct GameY {
    // Size of the board (length of one side of the triangular board).
    board_size: u32,

    // Mapping from coordinates to identifiers of players who placed stones there.
    board_map: HashMap<Coordinates, (SetIdx, PlayerId)>,

    status: GameStatus,

    // History of moves made in the game.
    history: Vec<Movement>,

    // Union-Find data structure to track connected components for each player
    sets: Vec<PlayerSet>,

    available_cells: Vec<u32>,

    // Game variant that modifies win conditions.
    variant: GameVariant,

    // For MasterY: number of placements the current player has made in this turn (resets at 2).
    placements_this_turn: u32,

    // For HoleyY: coordinates of permanently blocked cells.
    holes: HashSet<Coordinates>,
}

impl GameY {
    pub fn force_turn(&mut self, player: PlayerId) {
        if !self.check_game_over() {
            self.status = GameStatus::Ongoing { next_player: player };
        }
    }

    /// Returns the game variant.
    pub fn variant(&self) -> GameVariant {
        self.variant
    }
}

/// Represents the state of a single cell on the board.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Cell {
    /// The cell has no piece.
    Empty,
    /// The cell is occupied by a piece belonging to the specified player.
    Occupied(PlayerId),
}

impl GameY {
    /// Creates a new game with the specified board size and standard rules.
    pub fn new(board_size: u32) -> Self {
        Self::new_with_variant(board_size, GameVariant::Standard)
    }

    /// Creates a new game with the specified board size and game variant.
    pub fn new_with_variant(board_size: u32, variant: GameVariant) -> Self {
        let total_cells = (board_size * (board_size + 1)) / 2;
        Self {
            board_size,
            board_map: HashMap::new(),
            history: Vec::new(),
            sets: Vec::new(),
            status: GameStatus::Ongoing {
                next_player: PlayerId::new(0),
            },
            available_cells: (0..total_cells).collect(),
            variant,
            placements_this_turn: 0,
            holes: HashSet::new(),
        }
    }

    /// Creates a HoleyY game with `hole_count` randomly placed holes.
    /// No two holes will be adjacent to each other.
    /// Returns an error if `hole_count` cannot be satisfied under that constraint.
    pub fn new_holey(board_size: u32, hole_count: u32) -> Result<Self> {
        let total_cells = (board_size * (board_size + 1)) / 2;
        let mut candidates: Vec<u32> = (0..total_cells).collect();
        rand::seq::SliceRandom::shuffle(candidates.as_mut_slice(), &mut rand::rng());

        let mut holes: HashSet<Coordinates> = HashSet::new();
        for idx in &candidates {
            if holes.len() as u32 == hole_count {
                break;
            }
            let coords = Coordinates::from_index(*idx, board_size);
            let adjacent_to_hole = Self::coords_neighbors(coords).iter().any(|n| holes.contains(n));
            if !adjacent_to_hole {
                holes.insert(coords);
            }
        }

        if holes.len() as u32 != hole_count {
            return Err(GameYError::TooManyHoles {
                requested: hole_count,
                max: holes.len() as u32,
                total_cells,
            });
        }

        Ok(Self::new_holey_from_positions(board_size, holes))
    }

    fn coords_neighbors(coords: Coordinates) -> Vec<Coordinates> {
        let mut neighbors = Vec::new();
        let x = coords.x();
        let y = coords.y();
        let z = coords.z();
        if x > 0 {
            neighbors.push(Coordinates::new(x - 1, y + 1, z));
            neighbors.push(Coordinates::new(x - 1, y, z + 1));
        }
        if y > 0 {
            neighbors.push(Coordinates::new(x + 1, y - 1, z));
            neighbors.push(Coordinates::new(x, y - 1, z + 1));
        }
        if z > 0 {
            neighbors.push(Coordinates::new(x + 1, y, z - 1));
            neighbors.push(Coordinates::new(x, y + 1, z - 1));
        }
        neighbors
    }

    fn new_holey_from_positions(board_size: u32, holes: HashSet<Coordinates>) -> Self {
        let total_cells = (board_size * (board_size + 1)) / 2;
        let available_cells = (0..total_cells)
            .filter(|&idx| {
                let coords = Coordinates::from_index(idx, board_size);
                !holes.contains(&coords)
            })
            .collect();
        Self {
            board_size,
            board_map: HashMap::new(),
            history: Vec::new(),
            sets: Vec::new(),
            status: GameStatus::Ongoing {
                next_player: PlayerId::new(0),
            },
            available_cells,
            variant: GameVariant::HoleyY,
            placements_this_turn: 0,
            holes,
        }
    }

    /// Returns the set of hole coordinates (only non-empty for HoleyY games).
    pub fn holes(&self) -> &HashSet<Coordinates> {
        &self.holes
    }


    /// Returns the [`PlayerId`] of the player whose piece occupies `coords`,
    /// or `None` if the cell is empty.
    pub fn cell_owner(&self, coords: &Coordinates) -> Option<PlayerId> {
    self.board_map.get(coords).map(|(_, player)| *player)
}
    /// Returns the current game status.
    pub fn status(&self) -> &GameStatus {
        &self.status
    }

    /// Returns true if the game has ended (has a winner).
    pub fn check_game_over(&self) -> bool {
        match self.status {
            GameStatus::Ongoing { .. } => false,
            GameStatus::Finished { winner: _ } => true,
        }
    }

    /// Returns the list of available cell indices where pieces can be placed.
    pub fn available_cells(&self) -> &Vec<u32> {
        &self.available_cells
    }

    /// Returns the total number of cells on the board.
    pub fn total_cells(&self) -> u32 {
        (self.board_size * (self.board_size + 1)) / 2
    }

    /// Checks if the movement is made by the correct player.
    ///
    /// Returns an error if it's not the specified player's turn.
    pub fn check_player_turn(&self, movement: &Movement) -> Result<()> {
        if let GameStatus::Ongoing { next_player } = self.status {
            let player = match movement {
                Movement::Placement { player, .. } => *player,
                Movement::Action { player, .. } => *player,
            };
            if player != next_player {
                return Err(GameYError::InvalidPlayerTurn {
                    expected: next_player,
                    found: player,
                });
            }
        }
        Ok(())
    }

    /// Returns the player who should make the next move, or None if the game is over.
    pub fn next_player(&self) -> Option<PlayerId> {
        if let GameStatus::Ongoing { next_player } = self.status {
            Some(next_player)
        } else {
            None
        }
    }

    /// Loads a game state from a YEN format file.
    pub fn load_from_file<P: AsRef<Path>>(path: P) -> Result<Self> {
        let filename = path.as_ref().display().to_string();
        let file_content = std::fs::read_to_string(path).map_err(|e| GameYError::IoError {
            message: format!("Failed to read file: {}", filename),
            error: e.to_string(),
        })?;
        let yen: YEN =
            serde_json::from_str(&file_content).map_err(|e| GameYError::SerdeError { error: e })?;
        GameY::try_from(yen)
    }

    /// Saves the game state to a file in YEN format.
    pub fn save_to_file<P: AsRef<Path>>(&self, path: P) -> Result<()> {
        let yen: YEN = self.into();
        let json_content =
            serde_json::to_string_pretty(&yen).map_err(|e| GameYError::SerdeError { error: e })?;
        let filename = path.as_ref().display().to_string();
        std::fs::write(path, json_content).map_err(|e| GameYError::IoError {
            message: format!("Failed to write file: {}", filename),
            error: e.to_string(),
        })?;
        Ok(())
    }

    /// Adds a move to the game.
    pub fn add_move(&mut self, movement: Movement) -> Result<()> {
        match &movement {
            Movement::Placement { player, coords } => {
                self.handle_placement(*player, *coords)?;
            }
            Movement::Action { player, action } => {
                self.handle_action(*player, action);
            }
        }
        self.history.push(movement);
        Ok(())
    }

    /// Orchestrates the placement logic
    fn handle_placement(&mut self, player: PlayerId, coords: Coordinates) -> Result<()> {
        self.validate_placement(player, coords)?;

        // Update board state (available cells, sets, board_map)
        let set_idx = self.register_piece(player, coords);

        // Connect neighbors and determine if this move won the game
        let won = self.connect_neighbors_and_check_win(coords, player, set_idx);

        self.update_status_after_placement(player, won);
        Ok(())
    }

    /// Iterates over neighbors to union sets and checks for a win condition
    fn connect_neighbors_and_check_win(
        &mut self,
        coords: Coordinates,
        player: PlayerId,
        current_set_idx: usize,
    ) -> bool {
        // Base win condition: The piece itself touches all required sides
        let mut won = self.sets[current_set_idx].is_winning_configuration();

        //
        let neighbors = self.get_neighbors(&coords);

        for neighbor in neighbors {
            if let Some((neighbor_idx, neighbor_player)) = self.board_map.get(&neighbor)
                && *neighbor_player == player
            {
                // Union returns true if the merge resulted in a winning connection
                //
                let connection_won = self.union(current_set_idx, *neighbor_idx);
                won = won || connection_won;
            }
        }
        won
    }

    /// Updates the game status (Finished vs Ongoing)
    fn update_status_after_placement(&mut self, player: PlayerId, won: bool) {
        if self.check_game_over() {
            tracing::info!("Game was already over. Move ignored for status update.");
        } else if won {
            // In WhyNot the player who connects all three sides LOSES.
            let winner = match self.variant {
                GameVariant::WhyNot => other_player(player),
                _ => player,
            };
            tracing::debug!("Player {} wins the game!", winner);
            self.status = GameStatus::Finished { winner };
        } else {
            let next = self.next_player_after(player);
            self.status = GameStatus::Ongoing { next_player: next };
        }
    }

    /// Determines the next player after a placement, applying variant-specific rules.
    fn next_player_after(&mut self, player: PlayerId) -> PlayerId {
        match self.variant {
            GameVariant::MasterY => {
                self.placements_this_turn += 1;
                if self.placements_this_turn >= 2 {
                    self.placements_this_turn = 0;
                    other_player(player)
                } else {
                    player
                }
            }
            GameVariant::FortuneY => {
                let next_id: u32 = rand::rng().random_range(0..2);
                PlayerId::new(next_id)
            }
            _ => other_player(player),
        }
    }

    /// Handles non-placement actions (Resign, Swap, etc.)
    fn handle_action(&mut self, player: PlayerId, action: &GameAction) {
        match action {
            GameAction::Resign => {
                self.status = GameStatus::Finished {
                    winner: other_player(player),
                };
            }
            GameAction::Swap => {
                self.status = GameStatus::Ongoing {
                    next_player: other_player(player),
                };
            }
        }
    }

    /// Handles validation logic (Game Over checks, occupancy, and variant-specific rules).
    fn validate_placement(&self, player: PlayerId, coords: Coordinates) -> Result<()> {
        if self.check_game_over() {
            tracing::info!("Game is already over. Move at {} could be ignored", coords);
        }

        if self.board_map.contains_key(&coords) {
            return Err(GameYError::Occupied {
                coordinates: coords,
                player,
            });
        }

        if self.variant == GameVariant::HoleyY && self.holes.contains(&coords) {
            return Err(GameYError::HoleCell {
                coordinates: coords,
                player,
            });
        }

        if self.variant == GameVariant::TabuY {
            if let Some(last_opp) = self.last_opponent_placement(player) {
                if self.get_neighbors(&last_opp).contains(&coords) {
                    return Err(GameYError::TabuViolation {
                        coordinates: coords,
                        player,
                    });
                }
            }
        }

        Ok(())
    }

    /// Returns the coordinates of the most recent placement made by the opponent, if any.
    fn last_opponent_placement(&self, current_player: PlayerId) -> Option<Coordinates> {
        let opponent = other_player(current_player);
        self.history.iter().rev().find_map(|m| {
            if let Movement::Placement { player, coords } = m {
                if *player == opponent { Some(*coords) } else { None }
            } else {
                None
            }
        })
    }

    /// Updates internal data structures (Available cells, Sets, Map)
    /// Returns the index of the newly created set.
    fn register_piece(&mut self, player: PlayerId, coords: Coordinates) -> usize {
        let cell_idx = coords.to_index(self.board_size);
        self.available_cells.retain(|&x| x != cell_idx);

        let set_idx = self.sets.len();
        let new_set = PlayerSet {
            parent: set_idx,
            touches_side_a: coords.touches_side_a(),
            touches_side_b: coords.touches_side_b(),
            touches_side_c: coords.touches_side_c(),
        };
        self.sets.push(new_set);
        self.board_map.insert(coords, (set_idx, player));

        set_idx
    }

    /// Returns the size of the board (length of one side of the triangle).
    pub fn board_size(&self) -> u32 {
        self.board_size
    }

    /// Returns the neighboring coordinates for a given cell.
    fn get_neighbors(&self, coords: &Coordinates) -> Vec<Coordinates> {
        let mut neighbors = Vec::new();
        let x = coords.x();
        let y = coords.y();
        let z = coords.z();

        if x > 0 {
            neighbors.push(Coordinates::new(x - 1, y + 1, z));
            neighbors.push(Coordinates::new(x - 1, y, z + 1));
        }
        if y > 0 {
            neighbors.push(Coordinates::new(x + 1, y - 1, z));
            neighbors.push(Coordinates::new(x, y - 1, z + 1));
        }
        if z > 0 {
            neighbors.push(Coordinates::new(x + 1, y, z - 1));
            neighbors.push(Coordinates::new(x, y + 1, z - 1));
        }
        neighbors
    }

    /// Renders the current state of the board as a text string.
    /// If `show_coordinates` is true, the coordinates of each cell will be displayed.
    pub fn render(&self, options: &RenderOptions) -> String {
        let mut result = String::new();
        let coords_size = self.board_size.to_string().len();
        let _ = writeln!(result, "--- Game of Y (Size {}) ---", self.board_size);

        let indent_multiplier = self.get_indent_multiplier(options);

        for row in 0..self.board_size {
            let x = self.board_size - 1 - row;
            indent(&mut result, x * indent_multiplier);

            for y in 0..=row {
                let z = row - y;
                let coords = Coordinates::new(x, y, z);
                let cell_str = self.format_cell(coords, options, coords_size);
                let _ = write!(result, "{}   ", cell_str);
            }

            result.push('\n');
            if options.show_idx || options.show_3d_coords {
                result.push('\n');
            }
        }
        result
    }
    /*pub fn render(&self, options: &RenderOptions) -> String {
        let mut result = String::new();
        let coords_size = self.board_size.to_string().len() as u32;

        let _ = writeln!(result, "--- Game of Y (Size {}) ---", self.board_size);

        for row in 0..self.board_size {
            let x = self.board_size - 1 - row;

            let indent_multiplier = match (options.show_3d_coords, options.show_idx) {
                (true, true) => 8,
                (true, false) => 4,
                (false, true) => 4,
                (false, false) => 2,
            };

            indent(&mut result, x * indent_multiplier);

            for y in 0..=row {
                let z = row - y;

                let coords = Coordinates::new(x, y, z);
                let player = self.board_map.get(&coords).map(|(_, p)| *p);

                let mut symbol = match player {
                    Some(p) => format!("{}", p),
                    None => ".".to_string(),
                };

                if options.show_3d_coords {
                    symbol.push_str(
                        format!(
                            "({:0width$},{:0width$},{:0width$})",
                            x,
                            y,
                            z,
                            width = coords_size as usize
                        )
                        .as_str(),
                    );
                }
                if options.show_idx {
                    let idx = coords.to_index(self.board_size);
                    symbol.push_str(format!("({}) ", idx).as_str());
                }
                if options.show_colors {
                    match player {
                        Some(p) if p.id() == 0 => {
                            symbol = format!("\x1b[34m{}\x1b[0m", symbol); // Blue for player 0
                        }
                        Some(p) if p.id() == 1 => {
                            symbol = format!("\x1b[31m{}\x1b[0m", symbol); // Red for player 1
                        }
                        _ => {}
                    }
                }

                let _ = write!(result, "{}   ", symbol);
            }
            result.push('\n');
            if options.show_idx || options.show_3d_coords {
                result.push('\n');
            }
        }
        result
    }*/

    fn get_indent_multiplier(&self, options: &RenderOptions) -> u32 {
        match (options.show_3d_coords, options.show_idx) {
            (true, true) => 8,
            (true, false) => 4,
            (false, true) => 4,
            (false, false) => 2,
        }
    }

    fn format_cell(&self, coords: Coordinates, options: &RenderOptions, width: usize) -> String {
        let player = self.board_map.get(&coords).map(|(_, p)| *p);

        // 1. Base symbol
        let mut symbol = match player {
            Some(p) => format!("{}", p),
            None if self.holes.contains(&coords) => "H".to_string(),
            None => ".".to_string(),
        };

        // 2. Append metadata (3D Coords / Index)
        if options.show_3d_coords {
            symbol.push_str(&format!(
                "({:0w$},{:0w$},{:0w$})",
                coords.x(),
                coords.y(),
                coords.z(),
                w = width
            ));
        }
        if options.show_idx {
            let idx = coords.to_index(self.board_size);
            symbol.push_str(&format!("({}) ", idx));
        }

        // 3. Apply colors
        if options.show_colors {
            symbol = apply_player_color(symbol, player);
        }

        symbol
    }

    /// Disjoint Set Union 'Find' with path compression
    fn find(&mut self, i: SetIdx) -> SetIdx {
        if self.sets[i].parent == i {
            i
        } else {
            self.sets[i].parent = self.find(self.sets[i].parent);
            self.sets[i].parent
        }
    }

    /// Disjoint Set Union 'Union' operation
    fn union(&mut self, i: SetIdx, j: SetIdx) -> bool {
        let root_i = self.find(i);
        let root_j = self.find(j);

        if root_i != root_j {
            self.sets[root_i].parent = root_j;
            // Merge side properties
            self.sets[root_j].touches_side_a |= self.sets[root_i].touches_side_a;
            self.sets[root_j].touches_side_b |= self.sets[root_i].touches_side_b;
            self.sets[root_j].touches_side_c |= self.sets[root_i].touches_side_c;
            return self.sets[root_j].touches_side_a
                && self.sets[root_j].touches_side_b
                && self.sets[root_j].touches_side_c;
        }
        false
    }
}

fn indent(str: &mut String, level: u32) {
    str.push_str(&" ".repeat(level as usize));
}

impl TryFrom<YEN> for GameY {
    type Error = GameYError;

    fn try_from(game: YEN) -> Result<Self> {
        let variant = game.variant()
            .map(GameVariant::from_str)
            .unwrap_or(GameVariant::Standard);

        let rows: Vec<&str> = game.layout().split('/').collect();
        if rows.len() as u32 != game.size() {
            return Err(GameYError::InvalidYENLayout {
                expected: game.size(),
                found: rows.len() as u32,
            });
        }

        // For HoleyY: collect hole positions from the layout before constructing the game.
        let holes: HashSet<Coordinates> = if variant == GameVariant::HoleyY {
            let mut holes = HashSet::new();
            for (row, row_str) in rows.iter().enumerate() {
                for (col, cell) in row_str.chars().enumerate() {
                    if cell == 'H' {
                        let x = game.size() - 1 - (row as u32);
                        let y = col as u32;
                        let z = game.size() - 1 - x - y;
                        holes.insert(Coordinates::new(x, y, z));
                    }
                }
            }
            holes
        } else {
            HashSet::new()
        };

        let mut ygame = if variant == GameVariant::HoleyY {
            GameY::new_holey_from_positions(game.size(), holes)
        } else {
            GameY::new_with_variant(game.size(), variant)
        };

        for (row, row_str) in rows.iter().enumerate() {
            let cells: Vec<char> = row_str.chars().collect();
            if cells.len() as u32 != row as u32 + 1 {
                return Err(GameYError::InvalidYENLayoutLine {
                    expected: row as u32 + 1,
                    found: cells.len() as u32,
                    line: row as u32,
                });
            }
            for (col, cell) in cells.iter().enumerate() {
                let x = game.size() - 1 - (row as u32);
                let y = col as u32;
                let z = game.size() - 1 - x - y;
                let coords = Coordinates::new(x, y, z);
                match cell {
                    'B' => {
                        ygame.add_move(Movement::Placement {
                            player: PlayerId::new(0),
                            coords,
                        })?;
                    }
                    'R' => {
                        ygame.add_move(Movement::Placement {
                            player: PlayerId::new(1),
                            coords,
                        })?;
                    }
                    '.' | 'H' => {}
                    _ => {
                        return Err(GameYError::InvalidCharInLayout {
                            char: *cell,
                            row,
                            col,
                        });
                    }
                }
            }
        }
        Ok(ygame)
    }
}

impl From<&GameY> for YEN {
    fn from(game: &GameY) -> Self {
        let size = game.board_size;
        let turn = match game.status {
            GameStatus::Finished { winner } => other_player(winner).id() as u32,
            GameStatus::Ongoing { next_player } => next_player.id(),
        };
        let mut layout = String::new();
        let total_cells = (game.board_size * (game.board_size + 1)) / 2;
        let players = vec!['B', 'R'];
        for idx in 0..total_cells {
            let coords = Coordinates::from_index(idx, game.board_size);
            let cell_char = match game.board_map.get(&coords) {
                Some((_, player)) if player.id() == 0 => 'B',
                Some((_, player)) if player.id() == 1 => 'R',
                _ if game.holes.contains(&coords) => 'H',
                _ => '.',
            };
            layout.push(cell_char);
            if coords.z() == 0 && coords.x() > 0 {
                layout.push('/');
            }
        }
        let variant = game.variant.as_str().map(|s| s.to_string());
        YEN::new_with_variant(size, turn, players, layout, variant)
    }
}

fn other_player(player: PlayerId) -> PlayerId {
    // Assuming two players with IDs 0 and 1
    if player.id() == 0 {
        PlayerId::new(1)
    } else {
        PlayerId::new(0)
    }
}

fn apply_player_color(symbol: String, player: Option<PlayerId>) -> String {
    match player {
        Some(p) if p.id() == 0 => format!("\x1b[34m{}\x1b[0m", symbol), // Blue
        Some(p) if p.id() == 1 => format!("\x1b[31m{}\x1b[0m", symbol), // Red
        _ => symbol,
    }
}

/// Represents the current status of a game.
#[derive(Debug, Clone)]
pub enum GameStatus {
    /// The game is still in progress with the specified player to move next.
    Ongoing { next_player: PlayerId },
    /// The game has ended with a winner.
    Finished { winner: PlayerId },
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashSet;

    #[test]
    fn test_other_player() {
        assert_eq!(other_player(PlayerId::new(0)), PlayerId::new(1));
        assert_eq!(other_player(PlayerId::new(1)), PlayerId::new(0));
    }

    #[test]
    fn test_game_initialization() {
        let game = GameY::new(7);
        assert_eq!(game.board_size, 7);
        assert_eq!(game.history.len(), 0);
        match game.status {
            GameStatus::Ongoing { next_player } => {
                assert_eq!(next_player, PlayerId::new(0));
            }
            _ => panic!("Game should be ongoing"),
        }
    }

    // Helper function to compare neighbor sets
    fn assert_neighbors_match(actual: Vec<Coordinates>, expected: Vec<Coordinates>) {
        let actual_set: HashSet<_> = actual.into_iter().collect();
        let expected_set: HashSet<_> = expected.into_iter().collect();
        assert_eq!(actual_set, expected_set);
    }

    #[test]
    fn test_interior_cell_has_six_neighbors() {
        let board = GameY::new(5);
        let cell = Coordinates::new(2, 1, 1);

        let neighbors = board.get_neighbors(&cell);

        let expected = vec![
            Coordinates::new(1, 2, 1),
            Coordinates::new(1, 1, 2),
            Coordinates::new(3, 0, 1),
            Coordinates::new(2, 0, 2),
            Coordinates::new(3, 1, 0),
            Coordinates::new(2, 2, 0),
        ];

        assert_eq!(neighbors.len(), 6);
        assert_neighbors_match(neighbors, expected);
    }

    #[test]
    fn test_corner_cell_has_two_neighbors() {
        let board = GameY::new(5);
        let top_corner = Coordinates::new(4, 0, 0);

        let neighbors = board.get_neighbors(&top_corner);

        let expected = vec![Coordinates::new(3, 1, 0), Coordinates::new(3, 0, 1)];

        assert_eq!(neighbors.len(), 2);
        assert_neighbors_match(neighbors, expected);
    }

    #[test]
    fn test_edge_cell_has_four_neighbors() {
        let board = GameY::new(5);
        let edge_cell = Coordinates::new(0, 2, 2);

        let neighbors = board.get_neighbors(&edge_cell);

        let expected = vec![
            Coordinates::new(1, 1, 2),
            Coordinates::new(0, 1, 3),
            Coordinates::new(1, 2, 1),
            Coordinates::new(0, 3, 1),
        ];

        assert_eq!(neighbors.len(), 4);
        assert_neighbors_match(neighbors, expected);
    }

    #[test]
    fn test_winning_condition() {
        let mut game = GameY::new(3);

        let moves = vec![
            Movement::Placement {
                player: PlayerId::new(0),
                coords: Coordinates::new(0, 2, 0),
            },
            Movement::Placement {
                player: PlayerId::new(1),
                coords: Coordinates::new(2, 0, 0),
            },
            Movement::Placement {
                player: PlayerId::new(0),
                coords: Coordinates::new(0, 1, 1),
            },
            Movement::Placement {
                player: PlayerId::new(1),
                coords: Coordinates::new(1, 1, 0),
            },
            Movement::Placement {
                player: PlayerId::new(0),
                coords: Coordinates::new(0, 0, 2),
            },
        ];

        for mv in moves {
            game.add_move(mv).unwrap();
        }

        match game.status {
            GameStatus::Finished { winner } => {
                assert_eq!(winner, PlayerId::new(0));
            }
            _ => panic!("Game should be finished with a winner"),
        }
    }

    #[test]
    fn test_yen_conversion() {
        let mut game = GameY::new(3);

        let moves = vec![
            Movement::Placement {
                player: PlayerId::new(0),
                coords: Coordinates::new(0, 2, 0),
            },
            Movement::Placement {
                player: PlayerId::new(1),
                coords: Coordinates::new(2, 0, 0),
            },
            Movement::Placement {
                player: PlayerId::new(0),
                coords: Coordinates::new(0, 1, 1),
            },
        ];

        for mv in moves {
            game.add_move(mv).unwrap();
        }

        let yen: YEN = (&game).into();
        let loaded_game = GameY::try_from(yen.clone()).unwrap();

        assert_eq!(game.board_size, loaded_game.board_size);
        let yen_loaded: YEN = (&loaded_game).into();
        assert_eq!(yen.layout(), yen_loaded.layout());
    }

    // Test loading a YEN representation of a finished game
    #[test]
    fn test_load_yen_end2() {
        let yen_str = r#"{
            "size": 2,
            "turn": 0,
            "players": ["B","R"],
            "layout": "B/BB"
        }"#;
        let yen: YEN = serde_json::from_str(yen_str).unwrap();
        let game = GameY::try_from(yen).unwrap();
        match game.status {
            GameStatus::Finished { winner } => {
                assert_eq!(winner, PlayerId::new(0));
            }
            _ => panic!("Game should be finished with a winner"),
        }
    }

    // Test loading a YEN representation of a finished game
    #[test]
    fn test_load_yen_end3() {
        let yen_str = r#"{
            "size": 3,
            "turn": 0,
            "players": ["B","R"],
            "layout": "B/BB/BBR"
        }"#;
        let yen: YEN = serde_json::from_str(yen_str).unwrap();
        let game = GameY::try_from(yen).unwrap();
        match game.status {
            GameStatus::Finished { winner } => {
                assert_eq!(winner, PlayerId::new(0));
            }
            other => panic!("Game should be finished with a winner. Found: {:?}", other),
        }
    }

    // Test loading a YEN representation of a finished game
    #[test]
    fn test_load_yen_single_full() {
        let yen_str = r#"{
            "size": 1,
            "turn": 0,
            "players": ["B","R"],
            "layout": "B"
        }"#;
        let yen: YEN = serde_json::from_str(yen_str).unwrap();
        let game = GameY::try_from(yen).unwrap();
        match game.status {
            GameStatus::Finished { winner } => {
                assert_eq!(winner, PlayerId::new(0));
            }
            other => panic!("Game should be finished with a winner. Found {:?}", other),
        }
    }

    // ── WhyNot variant ────────────────────────────────────────────────────────

    // Reusable helper: plays the same 5-move sequence used in test_winning_condition
    // but on a game created with the given variant.
    fn play_standard_win_sequence(game: &mut GameY) {
        let moves = vec![
            Movement::Placement { player: PlayerId::new(0), coords: Coordinates::new(0, 2, 0) },
            Movement::Placement { player: PlayerId::new(1), coords: Coordinates::new(2, 0, 0) },
            Movement::Placement { player: PlayerId::new(0), coords: Coordinates::new(0, 1, 1) },
            Movement::Placement { player: PlayerId::new(1), coords: Coordinates::new(1, 1, 0) },
            Movement::Placement { player: PlayerId::new(0), coords: Coordinates::new(0, 0, 2) },
        ];
        for mv in moves { game.add_move(mv).unwrap(); }
    }

    #[test]
    fn test_why_not_opponent_wins_when_connection_made() {
        // P0 completes the 3-side connection, so in WhyNot P1 should win.
        let mut game = GameY::new_with_variant(3, GameVariant::WhyNot);
        play_standard_win_sequence(&mut game);
        match game.status {
            GameStatus::Finished { winner } => assert_eq!(winner, PlayerId::new(1)),
            _ => panic!("Game should be finished"),
        }
    }

    #[test]
    fn test_standard_mover_wins_connection() {
        // Sanity check: same sequence in Standard variant → P0 wins.
        let mut game = GameY::new(3);
        play_standard_win_sequence(&mut game);
        match game.status {
            GameStatus::Finished { winner } => assert_eq!(winner, PlayerId::new(0)),
            _ => panic!("Game should be finished"),
        }
    }

    #[test]
    fn test_why_not_game_ongoing_before_connection() {
        // No 3-side connection yet → game must remain Ongoing.
        let mut game = GameY::new_with_variant(3, GameVariant::WhyNot);
        game.add_move(Movement::Placement {
            player: PlayerId::new(0),
            coords: Coordinates::new(0, 2, 0),
        }).unwrap();
        assert!(!game.check_game_over());
    }

    #[test]
    fn test_why_not_yen_roundtrip_preserves_variant() {
        // Serialising a WhyNot game and deserialising it must keep WhyNot rules.
        let mut game = GameY::new_with_variant(3, GameVariant::WhyNot);
        game.add_move(Movement::Placement {
            player: PlayerId::new(0),
            coords: Coordinates::new(0, 2, 0),
        }).unwrap();

        let yen: YEN = (&game).into();
        assert_eq!(yen.variant(), Some("why_not"));

        let restored = GameY::try_from(yen).unwrap();
        assert_eq!(restored.variant(), GameVariant::WhyNot);
    }

    #[test]
    fn test_why_not_yen_json_applies_inverted_win() {
        // Load a YEN that has "variant":"why_not" and a layout where P0 has
        // already connected all three sides.  The engine should record P1 as winner.
        let yen_str = r#"{
            "size": 3,
            "turn": 0,
            "players": ["B","R"],
            "layout": "B/BB/BBR",
            "variant": "why_not"
        }"#;
        let yen: YEN = serde_json::from_str(yen_str).unwrap();
        let game = GameY::try_from(yen).unwrap();
        match game.status {
            GameStatus::Finished { winner } => assert_eq!(winner, PlayerId::new(1)),
            other => panic!("Expected Finished, got {:?}", other),
        }
    }

    #[test]
    fn test_standard_yen_has_no_variant_field() {
        // Standard games must not include a "variant" key in their JSON output.
        let game = GameY::new(3);
        let yen: YEN = (&game).into();
        let json = serde_json::to_string(&yen).unwrap();
        assert!(!json.contains("variant"), "standard YEN should not contain a variant field");
    }

    // ── MasterY ──────────────────────────────────────────────────────────────

    #[test]
    fn test_master_y_same_player_places_twice() {
        let mut game = GameY::new_with_variant(5, GameVariant::MasterY);
        // Player 0 first placement — still player 0's turn
        game.add_move(Movement::Placement {
            player: PlayerId::new(0),
            coords: Coordinates::new(2, 1, 1),
        }).unwrap();
        match &game.status {
            GameStatus::Ongoing { next_player } => assert_eq!(*next_player, PlayerId::new(0)),
            _ => panic!("Game should be ongoing and still player 0's turn"),
        }
    }

    #[test]
    fn test_master_y_switches_after_two_placements() {
        let mut game = GameY::new_with_variant(5, GameVariant::MasterY);
        game.add_move(Movement::Placement {
            player: PlayerId::new(0),
            coords: Coordinates::new(2, 1, 1),
        }).unwrap();
        game.add_move(Movement::Placement {
            player: PlayerId::new(0),
            coords: Coordinates::new(3, 0, 1),
        }).unwrap();
        match &game.status {
            GameStatus::Ongoing { next_player } => assert_eq!(*next_player, PlayerId::new(1)),
            _ => panic!("Game should be ongoing and now player 1's turn"),
        }
    }

    #[test]
    fn test_master_y_win_ends_game_early() {
        // Player 0 wins on the first of their two placements — game ends immediately.
        let mut game = GameY::new_with_variant(3, GameVariant::MasterY);
        // Build a partial win: player 0 needs to touch all 3 sides.
        // On a size-3 board (0,2,0) touches side A+C, (0,0,2) touches side A+B.
        // (2,0,0) touches sides B+C.  Placing all three connects all sides.
        game.add_move(Movement::Placement { player: PlayerId::new(0), coords: Coordinates::new(0, 2, 0) }).unwrap();
        game.add_move(Movement::Placement { player: PlayerId::new(0), coords: Coordinates::new(0, 0, 2) }).unwrap();
        // Still player 0 after first pair; now second pair starts.
        game.add_move(Movement::Placement { player: PlayerId::new(1), coords: Coordinates::new(2, 0, 0) }).unwrap();
        game.add_move(Movement::Placement { player: PlayerId::new(1), coords: Coordinates::new(1, 1, 0) }).unwrap();
        // Player 0 connects all three sides — game should end.
        game.add_move(Movement::Placement { player: PlayerId::new(0), coords: Coordinates::new(0, 1, 1) }).unwrap();
        match game.status {
            GameStatus::Finished { winner } => assert_eq!(winner, PlayerId::new(0)),
            _ => panic!("Game should be finished with player 0 as winner"),
        }
    }

    #[test]
    fn test_master_y_yen_roundtrip() {
        let mut game = GameY::new_with_variant(3, GameVariant::MasterY);
        game.add_move(Movement::Placement { player: PlayerId::new(0), coords: Coordinates::new(2, 0, 0) }).unwrap();
        let yen: YEN = (&game).into();
        assert_eq!(yen.variant(), Some("master_y"));
        let restored = GameY::try_from(yen).unwrap();
        assert_eq!(restored.variant(), GameVariant::MasterY);
    }

    // ── FortuneY ─────────────────────────────────────────────────────────────

    #[test]
    fn test_fortune_y_next_player_is_valid() {
        let mut game = GameY::new_with_variant(5, GameVariant::FortuneY);
        game.add_move(Movement::Placement {
            player: PlayerId::new(0),
            coords: Coordinates::new(2, 1, 1),
        }).unwrap();
        // After a move the next player must be either 0 or 1.
        match &game.status {
            GameStatus::Ongoing { next_player } => {
                assert!(next_player.id() == 0 || next_player.id() == 1);
            }
            _ => panic!("Game should be ongoing"),
        }
    }

    #[test]
    fn test_fortune_y_yen_roundtrip() {
        let mut game = GameY::new_with_variant(3, GameVariant::FortuneY);
        game.add_move(Movement::Placement { player: PlayerId::new(0), coords: Coordinates::new(2, 0, 0) }).unwrap();
        let yen: YEN = (&game).into();
        assert_eq!(yen.variant(), Some("fortune_y"));
        let restored = GameY::try_from(yen).unwrap();
        assert_eq!(restored.variant(), GameVariant::FortuneY);
    }

    // ── TabuY ─────────────────────────────────────────────────────────────────

    #[test]
    fn test_tabu_y_rejects_adjacent_to_last_opponent_move() {
        let mut game = GameY::new_with_variant(5, GameVariant::TabuY);
        // Player 0 places at (2,1,1).
        game.add_move(Movement::Placement {
            player: PlayerId::new(0),
            coords: Coordinates::new(2, 1, 1),
        }).unwrap();
        // (1,2,1) is a neighbor of (2,1,1), so player 1 cannot place there.
        let result = game.add_move(Movement::Placement {
            player: PlayerId::new(1),
            coords: Coordinates::new(1, 2, 1),
        });
        assert!(result.is_err(), "Tabu violation should return an error");
        match result.unwrap_err() {
            GameYError::TabuViolation { .. } => {}
            e => panic!("Expected TabuViolation, got {:?}", e),
        }
    }

    #[test]
    fn test_tabu_y_allows_non_adjacent_placement() {
        let mut game = GameY::new_with_variant(5, GameVariant::TabuY);
        game.add_move(Movement::Placement {
            player: PlayerId::new(0),
            coords: Coordinates::new(2, 1, 1),
        }).unwrap();
        // (0, 4, 0) is far from (2,1,1) — should be allowed.
        let result = game.add_move(Movement::Placement {
            player: PlayerId::new(1),
            coords: Coordinates::new(0, 4, 0),
        });
        assert!(result.is_ok(), "Non-adjacent placement should be allowed");
    }

    #[test]
    fn test_tabu_y_first_move_has_no_restriction() {
        let mut game = GameY::new_with_variant(5, GameVariant::TabuY);
        // No opponent move yet — any cell is legal.
        let result = game.add_move(Movement::Placement {
            player: PlayerId::new(0),
            coords: Coordinates::new(2, 1, 1),
        });
        assert!(result.is_ok());
    }

    #[test]
    fn test_tabu_y_yen_roundtrip() {
        let mut game = GameY::new_with_variant(3, GameVariant::TabuY);
        game.add_move(Movement::Placement { player: PlayerId::new(0), coords: Coordinates::new(2, 0, 0) }).unwrap();
        let yen: YEN = (&game).into();
        assert_eq!(yen.variant(), Some("tabu_y"));
        let restored = GameY::try_from(yen).unwrap();
        assert_eq!(restored.variant(), GameVariant::TabuY);
    }

    // ── HoleyY ───────────────────────────────────────────────────────────────

    #[test]
    fn test_holey_y_rejects_placement_on_hole() {
        let hole = Coordinates::new(2, 0, 0);
        let holes: HashSet<Coordinates> = [hole].into_iter().collect();
        let mut game = GameY::new_holey_from_positions(3, holes);
        let result = game.add_move(Movement::Placement {
            player: PlayerId::new(0),
            coords: hole,
        });
        assert!(result.is_err());
        match result.unwrap_err() {
            GameYError::HoleCell { .. } => {}
            e => panic!("Expected HoleCell, got {:?}", e),
        }
    }

    #[test]
    fn test_holey_y_hole_not_in_available_cells() {
        let hole = Coordinates::new(2, 0, 0);
        let holes: HashSet<Coordinates> = [hole].into_iter().collect();
        let game = GameY::new_holey_from_positions(3, holes.clone());
        let hole_idx = hole.to_index(3);
        assert!(
            !game.available_cells().contains(&hole_idx),
            "Hole cell must not appear in available_cells"
        );
    }

    #[test]
    fn test_holey_y_allows_non_hole_placement() {
        let hole = Coordinates::new(2, 0, 0);
        let holes: HashSet<Coordinates> = [hole].into_iter().collect();
        let mut game = GameY::new_holey_from_positions(3, holes);
        // (0,2,0) is NOT a hole — placement should succeed.
        let result = game.add_move(Movement::Placement {
            player: PlayerId::new(0),
            coords: Coordinates::new(0, 2, 0),
        });
        assert!(result.is_ok());
    }

    #[test]
    fn test_holey_y_yen_roundtrip() {
        let hole = Coordinates::new(1, 0, 1);
        let holes: HashSet<Coordinates> = [hole].into_iter().collect();
        let mut game = GameY::new_holey_from_positions(3, holes.clone());
        game.add_move(Movement::Placement { player: PlayerId::new(0), coords: Coordinates::new(2, 0, 0) }).unwrap();

        let yen: YEN = (&game).into();
        assert_eq!(yen.variant(), Some("holey_y"));
        // The layout must encode the hole as 'H'.
        assert!(yen.layout().contains('H'), "layout should contain 'H' for hole cells");

        let restored = GameY::try_from(yen).unwrap();
        assert_eq!(restored.variant(), GameVariant::HoleyY);
        assert!(restored.holes().contains(&hole), "restored game must preserve holes");
    }

    #[test]
    fn test_holey_y_holes_getter() {
        let hole = Coordinates::new(0, 1, 1);
        let holes: HashSet<Coordinates> = [hole].into_iter().collect();
        let game = GameY::new_holey_from_positions(3, holes.clone());
        assert_eq!(game.holes(), &holes);
    }

    // Test loading a YEN representation of a finished game
    #[test]
    fn test_load_yen_single_empty() {
        let yen_str = r#"{
            "size": 1,
            "turn": 0,
            "players": ["B","R"],
            "layout": "."
        }"#;
        let yen: YEN = serde_json::from_str(yen_str).unwrap();
        let game = GameY::try_from(yen).unwrap();
        match game.status {
            GameStatus::Ongoing { next_player } => {
                assert_eq!(next_player, PlayerId::new(0));
            }
            _ => panic!("Game should be ongoing"),
        }
    }
}

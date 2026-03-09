import { describe, test, expect, beforeEach } from 'vitest';
import { Game, toXYZ, fromXYZ } from '../components/gameWindow/Game';

describe('Coordinate conversion utilities', () => {
  test('toXYZ converts row and col correctly', () => {
    const result = toXYZ(1, 2, 5);

    expect(result).toEqual({
      x: 3,
      y: 2,
      z: -1
    });
  });

  test('fromXYZ converts x and y back to row and col correctly', () => {
    const result = fromXYZ(3, 2, -1, 5);

    expect(result).toEqual({
      row: 1,
      col: 2
    });
  });

  test('toXYZ and fromXYZ are inverse operations', () => {
    const row = 2;
    const col = 1;
    const size = 4;

    const xyz = toXYZ(row, col, size);
    const result = fromXYZ(xyz.x, xyz.y, xyz.z, size);

    expect(result).toEqual({ row, col });
  });
});

describe('Game class', () => {
  let game: Game;

  beforeEach(() => {
    game = new Game(5, 'Marta', 'Marcos');
  });

  test('Game constructor initializes game correctly', () => {
    expect(game.size).toBe(5);
    expect(game.matchId).toBeNull();
    expect(game.player1).toBe('Marta');
    expect(game.player2).toBe('Marcos');
    expect(game.moves).toEqual([]);
    expect(game.turn).toBe(0);
    expect(game.gameOver).toBe(false);
  });

  test('Game setMatchId sets the matchId correctly', () => {
    game.setMatchId('match-123');
    expect(game.matchId).toBe('match-123');
  });

  test('Game addMove adds a move with current player', () => {
    game.addMove(1, 2);

    expect(game.moves).toEqual([
      { row: 1, col: 2, player: 0 }
    ]);
  });

  test('Game addMove changes turn after adding a move', () => {
    game.addMove(1, 2);
    expect(game.turn).toBe(1);

    game.addMove(2, 3);
    expect(game.turn).toBe(0);
  });

  test('Game addMove stores consecutive moves with alternating players', () => {
    game.addMove(0, 0);
    game.addMove(1, 1);
    game.addMove(2, 2);

    expect(game.moves).toEqual([
      { row: 0, col: 0, player: 0 },
      { row: 1, col: 1, player: 1 },
      { row: 2, col: 2, player: 0 }
    ]);
  });

  test('Game setGameOver changes gameOver value', () => {
    game.setGameOver(true);
    expect(game.gameOver).toBe(true);

    game.setGameOver(false);
    expect(game.gameOver).toBe(false);
  });

  test('Game isOccupied returns false if no move exists in the position', () => {
    game.addMove(0, 0);

    expect(game.isOccupied(1, 1)).toBe(false);
  });

  test('Game isOccupied returns true if a move exists in the position', () => {
    game.addMove(2, 3);

    expect(game.isOccupied(2, 3)).toBe(true);
  });

  test('Game reset clears game state except players and size', () => {
    game.setMatchId('match-999');
    game.addMove(1, 1);
    game.setGameOver(true);

    game.reset();

    expect(game.matchId).toBeNull();
    expect(game.moves).toEqual([]);
    expect(game.turn).toBe(0);
    expect(game.gameOver).toBe(false);

    expect(game.size).toBe(5);
    expect(game.player1).toBe('Marta');
    expect(game.player2).toBe('Marcos');
  });
});
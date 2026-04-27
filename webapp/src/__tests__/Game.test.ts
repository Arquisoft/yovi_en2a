import { describe, test, expect, beforeEach } from 'vitest'
import { Game, toXYZ, fromXYZ } from '../components/gameWindow/Game'

describe('toXYZ', () => {
  test('converts row/col to xyz coordinates', () => {
    expect(toXYZ(0, 0, 11)).toEqual({ x: 10, y: 0, z: 0 })
    expect(toXYZ(5, 3, 11)).toEqual({ x: 5, y: 3, z: 2 })
    expect(toXYZ(10, 10, 11)).toEqual({ x: 0, y: 10, z: 0 })
  })
})

describe('fromXYZ', () => {
  test('converts xyz back to row/col', () => {
    expect(fromXYZ(10, 0, 0, 11)).toEqual({ row: 0, col: 0 })
    expect(fromXYZ(5, 3, 2, 11)).toEqual({ row: 5, col: 3 })
    expect(fromXYZ(0, 10, 0, 11)).toEqual({ row: 10, col: 10 })
  })
})

describe('Game', () => {
  let game: Game

  beforeEach(() => {
    game = new Game(11, 'Alice', 'Bot')
  })

  test('initialises with correct defaults', () => {
    expect(game.size).toBe(11)
    expect(game.player1).toBe('Alice')
    expect(game.player2).toBe('Bot')
    expect(game.matchId).toBeNull()
    expect(game.moves).toHaveLength(0)
    expect(game.turn).toBe(0)
    expect(game.gameOver).toBe(false)
  })

  test('setMatchId stores the match id', () => {
    game.setMatchId('match-42')
    expect(game.matchId).toBe('match-42')
  })

  test('addMove records a move and switches turn', () => {
    game.addMove(0, 0)
    expect(game.moves).toHaveLength(1)
    expect(game.moves[0]).toEqual({ row: 0, col: 0, player: 0 })
    expect(game.turn).toBe(1)

    game.addMove(1, 1)
    expect(game.moves[1]).toEqual({ row: 1, col: 1, player: 1 })
    expect(game.turn).toBe(0)
  })

  test('setGameOver updates gameOver flag', () => {
    game.setGameOver(true)
    expect(game.gameOver).toBe(true)

    game.setGameOver(false)
    expect(game.gameOver).toBe(false)
  })

  test('reset clears all state', () => {
    game.setMatchId('match-42')
    game.addMove(0, 0)
    game.setGameOver(true)

    game.reset()

    expect(game.matchId).toBeNull()
    expect(game.moves).toHaveLength(0)
    expect(game.turn).toBe(0)
    expect(game.gameOver).toBe(false)
  })

  test('isOccupied returns true for taken cells', () => {
    game.addMove(3, 4)
    expect(game.isOccupied(3, 4)).toBe(true)
  })

  test('isOccupied returns false for empty cells', () => {
    game.addMove(3, 4)
    expect(game.isOccupied(0, 0)).toBe(false)
    expect(game.isOccupied(3, 5)).toBe(false)
  })

  test('setTurn changes the current turn', () => {
    game.setTurn(1)
    expect(game.turn).toBe(1)
    game.setTurn(0)
    expect(game.turn).toBe(0)
  })

  test('setHoleCells stores cells as row,col keys', () => {
    // flatToRowColKey: idx 0 → "0,0", idx 1 → "1,0", idx 2 → "1,1", idx 3 → "2,0"
    game.setHoleCells([0, 2])
    expect(game.holeCells.has('0,0')).toBe(true)
    expect(game.holeCells.has('1,1')).toBe(true)
    expect(game.holeCells.has('1,0')).toBe(false)
  })

  test('setHoleCells with empty array clears holeCells', () => {
    game.setHoleCells([0, 1])
    game.setHoleCells([])
    expect(game.holeCells.size).toBe(0)
  })

  test('setBlockedCells stores cells as row,col keys', () => {
    // idx 1 → "1,0", idx 3 → "2,0"
    game.setBlockedCells([1, 3])
    expect(game.blockedCells.has('1,0')).toBe(true)
    expect(game.blockedCells.has('2,0')).toBe(true)
  })

  test('reset clears holeCells and blockedCells', () => {
    game.setHoleCells([0])
    game.setBlockedCells([1])
    game.reset()
    expect(game.holeCells.size).toBe(0)
    expect(game.blockedCells.size).toBe(0)
  })
})

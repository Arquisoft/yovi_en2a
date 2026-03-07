import { Board } from "./Board";
import type { Player } from "./Cell";

export interface YenNotation {
  size: number;
  turn: Player;
  players: Player[];
  layout: string;
}

export class Game {
  board: Board;
  currentPlayer: Player;
  players: Player[];
  lastMove: { x: number; y: number; z: number } | null;

  constructor(size: number, players: Player[] = ["B", "R"]) {
    this.board = new Board(size);
    this.players = players;
    this.currentPlayer = players[0];
    this.lastMove = null;
  }

  placeCell(x: number, y: number, z: number): boolean {
    if (this.lastMove !== null) 
        return false;

    const cell = this.board.getCell(x, y, z);

    // cell not found (coordenadas inválidas)
    if (!cell) 
        return false;

    // cell already occupied
    if (cell.owner !== null) 
        return false;

    cell.owner = this.currentPlayer;
    this.lastMove = { x, y, z };
    return true;
  }

  undo(): void {
    if (!this.lastMove) 
        return;

    const cell = this.board.getCell(this.lastMove.x, this.lastMove.y, this.lastMove.z);
    if (cell)
      cell.owner = null;

    this.lastMove = null;
  }

  endTurn(): void {
    // No move made - can't end turn
    if (!this.lastMove) 
        return;

    const currentIndex = this.players.indexOf(this.currentPlayer);
    this.currentPlayer = this.players[(currentIndex + 1) % this.players.length];
    this.lastMove = null;
  }

  reset(): void {
    this.board.reset();
    this.currentPlayer = this.players[0];
    this.lastMove = null;
  }

  canUndo(): boolean {
    return this.lastMove !== null;
  }

  canEndTurn(): boolean {
    return this.lastMove !== null;
  }

  // Exports the actual game to YEN notation
  toYEN(): YenNotation {
    return {
      size: this.board.size,
      turn: this.currentPlayer,
      players: this.players,
      layout: this.board.toLayoutString()
    };
  }

  // Restore the game from a YEN document
  fromYEN(yen: YenNotation): void {
    this.board = new Board(yen.size);
    this.board.loadLayoutString(yen.layout);
    this.players = yen.players;
    this.currentPlayer = yen.turn;
    this.lastMove = null; 
  }
}
import { Board } from "./Board";
import type { Player } from "./Cell";

export class Game {
  board: Board;
  currentPlayer: Player;
  lastMove: { row: number; col: number } | null;

  constructor(size: number) {
    this.board = new Board(size);
    this.currentPlayer = 1;
    this.lastMove = null;
  }

  placeCell(row: number, col: number): boolean {
    if (this.lastMove !== null) 
        return false;

    const cell = this.board.getCell(row, col);

    //cell not found
    if (!cell) 
        return false;

    //cell already occupied
    if (cell.owner !== null) 
        return false;

    cell.owner = this.currentPlayer;
    this.lastMove = { row, col };
    return true;
  }

  undo(): void {
    if (!this.lastMove) 
        return;

    const cell = this.board.getCell(this.lastMove.row, this.lastMove.col);
    if (cell)
      cell.owner = null;

    this.lastMove = null;
  }

  endTurn(): void {
    // No move made - can't end turn
    if (!this.lastMove) 
        return;

    this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
    this.lastMove = null;
  }

  reset(): void {
    this.board.reset();
    this.currentPlayer = 1;
    this.lastMove = null;
  }

  canUndo(): boolean {
    return this.lastMove !== null;
  }

  canEndTurn(): boolean {
    return this.lastMove !== null;
  }
}
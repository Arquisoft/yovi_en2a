import { BoardModel } from "./BoardModel";

export class Game {
  board: BoardModel;
  currentPlayer: 0 | 1;
  gameOver: boolean;

  constructor(size: number) {
    this.board = new BoardModel(size);
    this.currentPlayer = 0;
    this.gameOver = false;
  }

  applyMove(row: number, col: number): void {
    if (this.gameOver) return;
    if (this.board.cells[row][col].owner !== null) return;

    this.board.cells[row][col].owner = this.currentPlayer;
    this.currentPlayer = this.currentPlayer === 0 ? 1 : 0;
  }

  setGameOver(value: boolean): void {
    this.gameOver = value;
  }

  reset(size: number): void {
    this.board = new BoardModel(size);
    this.currentPlayer = 0;
    this.gameOver = false;
  }
}
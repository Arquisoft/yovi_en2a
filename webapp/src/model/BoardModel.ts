import { Cell } from "./Cell";

export type Move = {
  player: 0 | 1;
  coords: [number, number, number];
};

export class BoardModel {
  size: number;
  cells: Cell[][];

  constructor(size: number) {
    this.size = size;
    this.cells = [];
    this.createBoard();
  }

  private createBoard(): void {
    for (let row = 0; row < this.size; row++) {
      // create row
      this.cells[row] = [];

      for (let col = 0; col <= row; col++) {
        // create cell
        this.cells[row][col] = new Cell(row, col);
      }
    }
  }

  getCell(row: number, col: number): Cell | null {
    if (row < 0 || row >= this.cells.length) {
      return null;
    }

    if (col < 0 || col >= this.cells[row].length) {
      return null;
    }

    return this.cells[row][col];
  }

  reset(): void {
    for (let row = 0; row < this.size; row++) {
      for (let col = 0; col <= row; col++) {
        this.cells[row][col].owner = null;
      }
    }
  }
}
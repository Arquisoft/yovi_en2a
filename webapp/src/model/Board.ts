import { Cell } from "./Cell";

export class Board {
  size: number;
  cells: Cell[][];

  constructor(size: number) {
    this.size = size;
    this.cells = [];
    this.createBoard();
  }

  private createBoard(): void {
    for (let row = 0; row < this.size; row++) {
      this.cells[row] = [];

      for (let col = 0; col <= row; col++) {
        // Transform 2D coordinates into 3D (x, y, z)
        // x + y + z = size - 1
        const x = col;
        const y = row - col;
        const z = this.size - 1 - row;
        
        const cell = new Cell(x, y, z);
        this.cells[row][col] = cell;
      }
    }
  }

  getCell(x: number, y: number, z: number): Cell | null {
    // 1. Validate coordinates
    if (x + y + z !== this.size - 1) {
      return null;
    }
    if (x < 0 || y < 0 || z < 0) {
      return null;
    }

    // 2. Transform coordinates into row, column for the array manipulation
    const row = this.size - 1 - z;
    const col = x;

    return this.cells[row][col];
  }

  reset(): void {
    for (let row = 0; row < this.size; row++) {
      for (let col = 0; col <= row; col++) {
        this.cells[row][col].owner = null;
      }
    }
  }

  // Generate string layout separating rows "/"
  toLayoutString(): string {
    const rowsStr: string[] = [];
    for (let row = 0; row < this.size; row++) {
      let rowStr = "";
      for (let col = 0; col <= row; col++) {
        const owner = this.cells[row][col].owner;
        rowStr += owner !== null ? owner : ".";
      }
      rowsStr.push(rowStr);
    }
    return rowsStr.join("/");
  }

  // Load the board from a layotuString
  loadLayoutString(layout: string): void {
    const rowsStr = layout.split("/");
    for (let row = 0; row < Math.min(this.size, rowsStr.length); row++) {
      for (let col = 0; col <= row && col < rowsStr[row].length; col++) {
        const char = rowsStr[row][col];
        this.cells[row][col].owner = char === "." ? null : char;
      }
    }
  }
}
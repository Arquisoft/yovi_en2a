export type CellOwner = 0 | 1 | null;

export class Cell {
  row: number;
  col: number;
  owner: CellOwner;

  constructor(row: number, col: number) {
    this.row = row;
    this.col = col;
    this.owner = null;
  }
}
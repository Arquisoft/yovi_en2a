export type Player = 1 | 2;

export class Cell {
  row: number;
  col: number;
  owner: Player | null;

  constructor(row: number, col: number) {
    this.row = row;
    this.col = col;
    this.owner = null;
  }
}
export type Player = string;
export class Cell {
  x: number;
  y: number;
  z: number;
  owner: Player | null;

  constructor(x: number, y: number, z: number) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.owner = null;
  }
}
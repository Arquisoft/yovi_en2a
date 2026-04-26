export type Move = {
  row: number;
  col: number;
  player: 0 | 1;
};

export function toXYZ(row: number, col: number, size:number) {
    const x = size - 1 - row;
    const y = col;
    const z = row - col;
    return { x, y, z };
}

export function fromXYZ(x: number, y: number, _z: number, size: number) {
  const row = size - 1 - x;
  const col = y;

  return { row, col };
}

function flatToRowColKey(idx: number): string {
  let row = 0;
  while ((row + 1) * (row + 2) / 2 <= idx) row++;
  return `${row},${idx - row * (row + 1) / 2}`;
}

export class Game {
  size: number;
  matchId: string | null;
  player1: string;
  player2: string;
  moves: Move[];
  turn: 0 | 1;
  gameOver: boolean;
  holeCells: Set<string>;
  blockedCells: Set<string>;

  constructor(size: number, player1: string, player2: string) {
    this.size = size;
    this.matchId = null;
    this.player1 = player1;
    this.player2 = player2;
    this.moves = [];
    this.turn = 0;
    this.gameOver = false;
    this.holeCells = new Set();
    this.blockedCells = new Set();
  }

  setMatchId(id: string) {
    this.matchId = id;
  }

  addMove(row: number, col: number): void {
    this.moves.push({ row, col, player: this.turn });
    this.turn = this.turn === 0 ? 1 : 0;
  }

  setTurn(turn: 0 | 1): void {
    this.turn = turn;
  }

  setHoleCells(indices: number[]): void {
    this.holeCells = new Set(indices.map((i) => flatToRowColKey(i)));
  }

  setBlockedCells(indices: number[]): void {
    this.blockedCells = new Set(indices.map((i) => flatToRowColKey(i)));
  }

  setGameOver(value: boolean): void {
    this.gameOver = value;
  }

  reset(): void {
    this.matchId = null;
    this.moves = [];
    this.turn = 0;
    this.gameOver = false;
    this.holeCells = new Set();
    this.blockedCells = new Set();
  }

  isOccupied(row: number, col: number): boolean {
    for (const move of this.moves) {
      if (move.row === row && move.col === col) {
        return true;
      }
    }
    return false;
  }
}
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

export class Game {
  size: number;
  matchId: string | null;
  player1: string;
  player2: string;
  moves: Move[];
  turn: 0 | 1;
  gameOver: boolean;

  constructor(size: number, player1: string, player2: string) {
    this.size = size;
    this.matchId = null;
    this.player1 = player1;
    this.player2 = player2;
    this.moves = [];
    this.turn = 0;
    this.gameOver = false;
  }

  setMatchId(id: string) {
    this.matchId = id;
  }

  addMove(row: number, col: number): void {
    this.moves.push({ row, col, player: this.turn });
    this.turn = this.turn === 0 ? 1 : 0;
  }

  setGameOver(value: boolean): void {
    this.gameOver = value;
  }

  reset(): void {
    this.matchId = null;
    this.moves = [];
    this.turn = 0;
    this.gameOver = false;
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
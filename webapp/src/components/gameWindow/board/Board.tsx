import "./Board.css";
import HexButton from "./HexButton";
import type {Move} from "../GameWindow";

type Props = {
  size: number;
  moves: Move[];
  blocked: boolean;
  holeCells: Set<string>;
  blockedCells: Set<string>;
  onPlace: (row: number, col: number) => void;
};

export default function Board({ size, moves, blocked, holeCells, blockedCells, onPlace }: Readonly<Props>) {
  const rows = [];

  for (let row = 0; row < size; row++) {
    const cells = [];

    for (let col = 0; col <= row; col++) {
      let owner: 0 | 1 | null = null;

      for (const move of moves) {
        if (move.row === row && move.col === col) {
          owner = move.player;
          break;
        }
      }

      const key = `${row},${col}`;
      const isHole = holeCells.has(key);
      const isTabuBlocked = blockedCells.has(key);
      const disabled = owner !== null || blocked || isHole || isTabuBlocked;

      cells.push(
        <HexButton
          key={`${row}-${col}`}
          owner={owner}
          isDisabled={disabled}
          isHole={isHole}
          isTabuBlocked={isTabuBlocked}
          onClick={() => onPlace(row, col)}
        />
      );
    }

    rows.push(
      <div key={row} className="board-row">
        {cells}
      </div>
    );
  }

  return <div className="board">{rows}</div>;
}
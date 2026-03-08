import "./Board.css";
import HexButton from "./HexButton";
import type {Move} from "../GameWindow";

type Props = {
  size: number;
  moves: Move[];
  blocked: boolean;
  onPlace: (row: number, col: number) => void;
};

export default function Board({ size, moves, blocked, onPlace }: Props) {
  const rows = [];

  for (let row = 0; row < size; row++) {   
    const cells = []; 

    for (let col = 0; col <= row; col++) {
      let owner: 0 | 1 | null = null;

      // Check if there's a move for this cell
      for (const move of moves) {
        if (move.row === row && move.col === col) {
          owner = move.player;
          break;
        }
      }
      // Get the cell from the board model
      const disabled = owner !== null || blocked;

      cells.push(
        <HexButton
          key={`${row}-${col}`}
          owner={owner}
          isDisabled={disabled}
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


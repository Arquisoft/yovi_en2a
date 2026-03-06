import HexButton from "./HexButton";
import "./Board.css";
import type { Board as BoardModel } from "../../../model/Board";

type Props = {
  board: BoardModel;
  blocked: boolean;
  onPlace: (row: number, col: number) => void;
};

export default function Board({ board, blocked, onPlace }: Props) {

  const rows = [];

  for (let row = 0; row < board.cells.length; row++) {
    const rowCells = [];
    for (let col = 0; col < board.cells[row].length; col++) {
      // Get the cell from the board model
      const cell = board.cells[row][col];
      const disabled = cell.owner !== null || blocked;

      rowCells.push(
        <HexButton
          key={`${cell.row}-${cell.col}`}
          owner={cell.owner}
          isDisabled={disabled}
          onClick={() => onPlace(cell.row, cell.col)}
        />
      );
    }

    rows.push(
      <div key={row} className="board-row">
        {rowCells}
      </div>
    );
  }

  return <div className="board">{rows}</div>;
}


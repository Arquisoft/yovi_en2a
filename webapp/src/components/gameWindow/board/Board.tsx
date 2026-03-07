import HexButton from "./HexButton";
import "./Board.css";
import type { Board as BoardModel } from "../../../model/Board";

type Props = {
  board: BoardModel;
  blocked: boolean;
  onPlace: (x: number, y: number, z: number) => void;
};

export default function Board({ board, blocked, onPlace }: Readonly<Props>) {

  const rows = [];

  for (let row = 0; row < board.cells.length; row++) {
    const rowCells = [];
    
    for (const cell of board.cells[row]) {
      
      const disabled = cell.owner !== null || blocked;

      rowCells.push(
        <HexButton
          key={`${cell.x}-${cell.y}-${cell.z}`}
          owner={cell.owner}
          isDisabled={disabled}
          onClick={() => onPlace(cell.x, cell.y, cell.z)}
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
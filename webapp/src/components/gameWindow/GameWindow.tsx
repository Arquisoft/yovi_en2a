import "./GameWindow.css";
import { useState } from "react";
import TopLeftHeader from "./topLeftHeader/TopLeftHeader";
import TopRightMenu from "../topRightMenu/TopRightMenu";
import Board from "./board/Board";
import RightPanel from "./rightPanel/RightPanel";
import { Game } from "../../model/Game";

type Props = {
  size: number;
};

const GameWindow = ({ size = 8 }: Props) => {
  const [game, setGame] = useState(new Game(size));

  //create a new reference to the game
  function refreshGame() {
    const newGame = new Game(game.board.size);
    newGame.board = game.board;
    newGame.currentPlayer = game.currentPlayer;
    newGame.lastMove = game.lastMove;
    setGame(newGame);
  }

  function handlePlace(row: number, col: number) {
    const ok = game.placeCell(row, col);
    if (ok) refreshGame();
  }

  function handleUndo() {
    game.undo();
    refreshGame();
  }

  function handleEndTurn() {
    game.endTurn();
    refreshGame();
  }

  function handleReset() {
    game.reset();
    refreshGame();
  }

  return (
    <div className="game-window">
      <TopRightMenu />
      <TopLeftHeader />

      <div className="center-area">
        <Board
          board={game.board}
          blocked={game.lastMove !== null}
          onPlace={handlePlace}
        />
      </div>

      <RightPanel
        turn={game.currentPlayer}
        onUndo={handleUndo}
        onEndTurn={handleEndTurn}
        onReset={handleReset}
        canUndo={game.canUndo()}
        canEndTurn={game.canEndTurn()}
      />
    </div>
  );
};

export default GameWindow;
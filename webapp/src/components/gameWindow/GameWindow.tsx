import "./GameWindow.css";
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import TopLeftHeader from "./topLeftHeader/TopLeftHeader";
import TopRightMenu from "../topRightMenu/TopRightMenu";
import Board from "./board/Board";
import RightPanel from "./rightPanel/RightPanel";
import { Game } from "../../model/Game";

const GameWindow = () => {
  const { size: sizeParam } = useParams();

  const parsedSize = Number.parseInt(sizeParam ?? "8", 10);
  const size = Number.isNaN(parsedSize) ? 8 : parsedSize;

  const [game, setGame] = useState(new Game(size));

  useEffect(() => {
    if (game.board.size !== size) {
      setGame(new Game(size));
    }
  }, [size, game.board.size]);

  function refreshGame() {
    const newGame = new Game(game.board.size, game.players); 
    newGame.board = game.board;
    newGame.currentPlayer = game.currentPlayer;
    newGame.lastMove = game.lastMove;
    setGame(newGame);
  }

  function handlePlace(x: number, y: number, z: number) {
    const ok = game.placeCell(x, y, z); 
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
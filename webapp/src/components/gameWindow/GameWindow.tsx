import "./GameWindow.css";
import { useEffect, useState } from "react";
import TopLeftHeader from "./topLeftHeader/TopLeftHeader";
import TopRightMenu from "../topRightMenu/TopRightMenu";
import Board from "./board/Board";
import RightPanel from "./rightPanel/RightPanel";
import { toXYZ, fromXYZ} from "../../model/Coordinates";
import { createMatch, sendMove, requestBotMove } from "../../model/GameApi";
import { Game } from "../../model/Game";
import { useTimer } from "../../model/Timer";

type Props = {
  size?: number;
  mode?: "bot" | "multi";
};

const GameWindow = ({ size = 8, mode = "bot" }: Props) => {
  const [matchId, setMatchId] = useState<string | null>(null);
  const [game, setGame] = useState<Game>(new Game(size));
  const [loading, setLoading] = useState(false);
  const [paused, setPaused] = useState(false);

  const { formattedTime, resetTimer } = useTimer(!paused && !game.gameOver);

  useEffect(() => { createGame(); }, [size]);
  //create a new reference to the game
  function cloneGame(source: Game): Game {
    const newGame = new Game(source.board.size);

    for (let row = 0; row < source.board.cells.length; row++) {
      for (let col = 0; col < source.board.cells[row].length; col++) {
        newGame.board.cells[row][col].owner = source.board.cells[row][col].owner;
      }
    }

    newGame.currentPlayer = source.currentPlayer;
    newGame.gameOver = source.gameOver;

    return newGame;
  }


  async function createGame() {
    // block board while waiting for response
    setLoading(true);

    // conection to backend and get game state
    try {
      const data = await createMatch(size);
      setMatchId(data.match_id);
      setGame(new Game(size));
    } catch (error) {
      console.error("Error creating game:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handlePlace(row: number, col: number) {
    if (!matchId || game.gameOver) return;
    if (game.board.cells[row][col].owner !== null) return;

    const coords = toXYZ(row, col, game.board.size);
    // block board while waiting for response
    setLoading(true);

    try{
      const data = await sendMove({match_id: matchId, coord_x: coords.x, coord_y: coords.y, coord_z: coords.z});

      const updatedGame = cloneGame(game);
      updatedGame.applyMove(row, col);
      updatedGame.setGameOver(data.game_over);
      setGame(updatedGame);
      
      if (!data.game_over && mode === "bot") {
        // Handle bot's turn
        const botData = await requestBotMove({ match_id: matchId });

        const botGame = cloneGame(updatedGame);
        const botCoords = fromXYZ(botData.coord_x, botData.coord_y, botData.coord_z, size);

        botGame.applyMove(botCoords.row, botCoords.col);
        botGame.setGameOver(botData.game_over);
        setGame(botGame);
      }
    } catch (error) {
      console.error("Error sending move:", error);
    } finally {
      setLoading(false);
    }
  }

  function handleUndo() {
    //not implemented yet
  }

  function handleEndTurn() {
    //not implemented yet
  }

  function handleReset() {
    resetTimer();
    createGame();
  }


  return (
    <div className="game-window">
      <TopRightMenu />
      <TopLeftHeader />

      <div className="center-area">
        <Board
          board={game.board}
          blocked={loading || game.gameOver}
          onPlace={handlePlace}
        />
      </div>

      <RightPanel
        turn={game.currentPlayer === 0 ? 1 : 2}
        time={formattedTime}
        paused={paused}
        mode={mode}
        onPauseToggle={() => setPaused(!paused)}
        onUndo={handleUndo}
        onEndTurn={handleEndTurn}
        onReset={handleReset}
        canUndo={false}
        canEndTurn={false}
      />
    </div>
  );
};

export default GameWindow;

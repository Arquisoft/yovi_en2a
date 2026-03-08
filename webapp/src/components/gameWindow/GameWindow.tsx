import "./GameWindow.css";
import { useEffect, useState } from "react";
import TopLeftHeader from "./topLeftHeader/TopLeftHeader";
import TopRightMenu from "../topRightMenu/TopRightMenu";
import Board from "./board/Board";
import RightPanel from "./rightPanel/RightPanel";
import { createMatch, sendMove, requestBotMove } from "../../api/GameApi";
import { Game, toXYZ, fromXYZ } from "./Game";
import { useTimer } from "./rightPanel/Timer";

type Props = {
  size?: number;
  mode?: "bot" | "multi";
};

export type Move = {
  row: number;
  col: number;
  player: 0 | 1;
};

const GameWindow = ({ size = 8, mode = "bot" }: Props) => {
  const player1 = "Player 1";
  const player2 = mode === "bot" ? "Bot" : "Player 2";

  const [game, setGame] = useState<Game>(new Game(size, player1, player2));
  const [loading, setLoading] = useState(false);
  const [paused, setPaused] = useState(false);

  const { formattedTime, resetTimer } = useTimer(!paused && !game.gameOver);

  useEffect(() => { createGame(); }, [size]);

  //create a new reference to the game
  function cloneGame(source: Game): Game {
    const newGame = new Game(source.size, source.player1, source.player2);

    newGame.setMatchId(source.matchId || "");
    newGame.moves = [...source.moves];
    newGame.turn = source.turn;
    newGame.gameOver = source.gameOver;

    return newGame;
  }


  async function createGame() {
    // block board while waiting for response
    setLoading(true);

    // conection to backend and get game state
    createMatch(player1, player2, size)
      .then((data) => {
        if (!data) return;

        // set match id and game state
        const newGame = new Game(size, player1, player2);
        newGame.setMatchId(data.match_id);

        setGame(newGame);
        setPaused(false);
        resetTimer();
      })
      .finally(() => setLoading(false)); // unblock board
  }


  async function handlePlace(row: number, col: number) {
    if (!game.matchId || game.gameOver) return;
    if (game.isOccupied(row, col)) return;

    const coords = toXYZ(row, col, game.size);
    // block board while waiting for response
    setLoading(true);

    // send move to backend and get updated game state
    sendMove(game.matchId, coords.x, coords.y, coords.z)
    .then((data) => {
      if (!data) return;

      const updatedGame = cloneGame(game);
      updatedGame.addMove(row, col);
      updatedGame.setGameOver(data.game_over);
      setGame(updatedGame);

      if (!data.game_over && mode === "bot" && updatedGame.matchId) {
        // Handle bot's turn
        handleBotPlace(updatedGame);
      } else {
        setLoading(false);
      }
    });
  }

  function handleBotPlace(currentGame: Game){
    requestBotMove(currentGame.matchId!)
      .then((botData) => {
      if (!botData) return;

      const pos = fromXYZ(
        botData.coordinates.x,
        botData.coordinates.y,
        botData.coordinates.z,
        game.size
      );

      const botGame = cloneGame(game);
        botGame.addMove(pos.row, pos.col);
        botGame.setGameOver(botData.game_over);
        setGame(botGame);
      })
      .finally(() => setLoading(false));
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
          size={game.size}
          moves={game.moves}
          blocked={loading || game.gameOver}
          onPlace={handlePlace}
        />
      </div>

      <RightPanel
        turn={game.turn === 0 ? 1 : 2}
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

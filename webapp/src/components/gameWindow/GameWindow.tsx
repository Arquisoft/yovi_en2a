import "./GameWindow.css";
import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import TopLeftHeader from "../topLeftHeader/TopLeftHeader";
import TopRightMenu from "../topRightMenu/TopRightMenu";
import Board from "./board/Board";
import RightPanel from "./rightPanel/RightPanel";
import { createMatch, sendMove, requestBotMove, updateScore, saveMatch } from "../../api/GameApi";
import { Game, toXYZ, fromXYZ } from "./Game";
import { useTimer } from "./rightPanel/Timer";
import modalStyles from "./GameModal.module.css";
import { useUser } from "../../contexts/UserContext";
import { useAudio } from "../../contexts/AudioContext";

export type Move = {
  row: number;
  col: number;
  player: 0 | 1;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const timeToSeconds = (timeStr: string) => {
  const [mins, secs] = timeStr.split(":").map(Number);
  return mins * 60 + secs;
};

const GameWindow = () => {
  const { t } = useTranslation();
  const { size: urlSize, mode: urlMode } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user: currentUser } = useUser();
  const { playMoveSound, playGameOverSound, playGameStartSound, playGameVictorySound } = useAudio();

  const size = urlSize ? Number.parseInt(urlSize, 10) : 8;
  const mode = urlMode;
  const localModes = ["multi", "why_not", "master_y", "fortune_y", "tabu_y", "holey_y"];
  const isMultiplayer = localModes.includes(mode ?? "");
  const holeCount: number | undefined = location.state?.holeCount;
  const player1 = currentUser ? currentUser.username : t('rightPanel.player1');
  const player2 = isMultiplayer ? t('rightPanel.player2') : mode+"";

  const [game, setGame] = useState<Game>(new Game(size, player1, player2));
  const [loading, setLoading] = useState(false);
  const [paused, setPaused] = useState(false);
  const [showMobilePanel, setShowMobilePanel] = useState(false);

  const [modalMessage, setModalMessage] = useState<string | null>(null);

  const { formattedTime, resetTimer } = useTimer(!paused && !game.gameOver);

  useEffect(() => { createGame(); }, [size, mode]);

  function cloneGame(source: Game): Game {
    const newGame = new Game(source.size, source.player1, source.player2);
    newGame.setMatchId(source.matchId || "");
    newGame.moves = [...source.moves];
    newGame.turn = source.turn;
    newGame.gameOver = source.gameOver;
    newGame.holeCells = new Set(source.holeCells);
    newGame.blockedCells = new Set(source.blockedCells);
    return newGame;
  }

  async function createGame() {
    setLoading(true);
    setModalMessage(null);
    try {
      const variant = isMultiplayer && mode !== "multi" ? mode : undefined;
      const data = await createMatch(player1, player2, size, variant, holeCount);
      if (data?.match_id) {
        const newGame = new Game(size, player1, player2);
        newGame.setMatchId(data.match_id);
        if (data.hole_cells?.length) newGame.setHoleCells(data.hole_cells);
        setGame(newGame);
        setPaused(false);
        resetTimer();
        playGameStartSound();
      }
    } finally {
      setLoading(false);
    }
  }

  const handleGameOver = (isPlayer1Winner: boolean, finishedMoves: Move[]) => {
    const winnerName = isPlayer1Winner ? player1 : player2;
    setModalMessage(t('gameWindow.gameFinished', { winner: winnerName }));
    if (isPlayer1Winner) {
      playGameVictorySound();
    } else {
      playGameOverSound();
    }

    if (currentUser && game.matchId) {
      const timeInSeconds = timeToSeconds(formattedTime);
      const resultString = isPlayer1Winner ? "Win" : "Loss";

      updateScore(currentUser.email, currentUser.username, isPlayer1Winner, timeInSeconds);

      const movesAsCoords = finishedMoves.map(m => toXYZ(m.row, m.col, size));
      saveMatch(game.matchId, currentUser.email, player2, resultString, timeInSeconds, movesAsCoords);
    }
  };

  async function handlePlace(row: number, col: number) {
    if (!game.matchId || game.gameOver || loading) return;
    if (game.isOccupied(row, col)) return;

    const coords = toXYZ(row, col, game.size);
    setLoading(true);

    try {
      const data = await sendMove(game.matchId, coords.x, coords.y, coords.z);
      if (!data) return;

      const updatedGame = cloneGame(game);
      updatedGame.addMove(row, col);
      if (data.turn !== undefined) updatedGame.setTurn(data.turn as 0 | 1);
      if (data.hole_cells) updatedGame.setHoleCells(data.hole_cells);
      if (data.blocked_cells) updatedGame.setBlockedCells(data.blocked_cells);
      updatedGame.setGameOver(data.game_over);
      setGame(updatedGame);
      playMoveSound();

      if (data.game_over) {
        const moverIsP1 = game.turn === 0;
        const isP1Winner = mode === "why_not" ? !moverIsP1 : moverIsP1;
        handleGameOver(isP1Winner, updatedGame.moves);
        return;
      }

      if (!isMultiplayer && updatedGame.matchId) {
        await handleBotPlace(updatedGame);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleBotPlace(currentGame: Game) {
    try {
      let t1 = Date.now();
      const botData = await requestBotMove(currentGame.matchId!);
      let t2 = Date.now();
      if(t2-t1 < 500) await sleep(crypto.getRandomValues(new Uint32Array(1))[0] / 0xFFFFFFFF * 500 + 500)
      if (!botData) return;

      const x = botData.coordinates?.x ?? botData.coord_x ?? botData.x;
      const y = botData.coordinates?.y ?? botData.coord_y ?? botData.y;
      const z = botData.coordinates?.z ?? botData.coord_z ?? botData.z;

      if (x === undefined || y === undefined || z === undefined) return;

      const pos = fromXYZ(x, y, z, game.size);
      const botGame = cloneGame(currentGame);

      botGame.addMove(pos.row, pos.col);
      botGame.setGameOver(botData.game_over);
      setGame(botGame);
      playMoveSound();

      if (botData.game_over) {
          handleGameOver(false, botGame.moves);
      }
    } finally {
    }
  }

  const isBotTurn = !isMultiplayer && game.turn !== 0;

  return (
    <div className="game-window">
      <TopRightMenu />
      <TopLeftHeader />

      <button className="mobile-menu-button"
            onClick={() => setShowMobilePanel(!showMobilePanel)}>
            {showMobilePanel ? "✕" : "☰"}
      </button>

      <div className="center-area">

        <Board
          size={game.size}
          moves={game.moves}
          blocked={loading || game.gameOver || isBotTurn}
          holeCells={game.holeCells}
          blockedCells={game.blockedCells}
          onPlace={handlePlace}
        />

        <div className={`rightpanel-container ${showMobilePanel ? "open" : ""}`}>
          <RightPanel
            turn={game.turn === 0 ? 1 : 2}
            time={formattedTime}
            mode={mode}
          />
        </div>
      </div>

      {modalMessage && (
          <div className={modalStyles.modalOverlay}>
            <div className={modalStyles.modalContent}>
              <button
                  className={modalStyles.closeBtn}
                  onClick={() => setModalMessage(null)}
              >
                ✕
              </button>
              <h2>{modalMessage}</h2>
              <p>{t('gameWindow.totalTime', { time: formattedTime })}</p>
              <button
                  className={modalStyles.returnBtn}
                  onClick={() => navigate('/gameSelection')}
              >
                {t('gameWindow.returnToSelection')}
              </button>
            </div>
          </div>
      )}
    </div>
  );
};

export default GameWindow;

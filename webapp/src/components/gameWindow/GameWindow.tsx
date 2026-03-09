import "./GameWindow.css";
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom"; 
import TopLeftHeader from "../topLeftHeader/TopLeftHeader";
import TopRightMenu from "../topRightMenu/TopRightMenu";
import Board from "./board/Board";
import RightPanel from "./rightPanel/RightPanel";
import { createMatch, sendMove, requestBotMove, updateScore, saveMatch } from "../../api/GameApi";
import { Game, toXYZ, fromXYZ } from "./Game";
import { useTimer } from "./rightPanel/Timer";
import modalStyles from "./GameModal.module.css";

export type Move = {
  row: number;
  col: number;
  player: 0 | 1;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Función auxiliar para leer la cookie de usuario
const getCookieUser = () => {
  const cookieMatch = document.cookie.match(/(?:^|; )user=([^;]*)/);
  return cookieMatch ? JSON.parse(decodeURIComponent(cookieMatch[1])) : null;
};

// Función para convertir "02:30" a 150 segundos
const timeToSeconds = (timeStr: string) => {
  const [mins, secs] = timeStr.split(":").map(Number);
  return mins * 60 + secs;
};

const GameWindow = () => {
  const { size: urlSize, mode: urlMode } = useParams();
  const navigate = useNavigate();

  const size = urlSize ? Number.parseInt(urlSize, 10) : 8;
  const mode = urlMode === "multi" ? "multi" : "bot";

  // Si el usuario está logueado, usamos su nombre, si no, "Player 1"
  const currentUser = getCookieUser();
  const player1 = currentUser ? currentUser.username : "Player 1";
  const player2 = mode === "bot" ? "random_bot" : "Player 2";

  const [game, setGame] = useState<Game>(new Game(size, player1, player2));
  const [loading, setLoading] = useState(false);
  const [paused, setPaused] = useState(false);
  
  // NUEVO ESTADO: Controla el mensaje del modal. Si es null, el modal está oculto.
  const [modalMessage, setModalMessage] = useState<string | null>(null);

  const { formattedTime, resetTimer } = useTimer(!paused && !game.gameOver);

  useEffect(() => { createGame(); }, [size, mode]);

  function cloneGame(source: Game): Game {
    const newGame = new Game(source.size, source.player1, source.player2);
    newGame.setMatchId(source.matchId || "");
    newGame.moves = [...source.moves];
    newGame.turn = source.turn;
    newGame.gameOver = source.gameOver;
    return newGame;
  }

  async function createGame() {
    setLoading(true);
    setModalMessage(null); // Ocultamos el modal al reiniciar
    try {
      const data = await createMatch(player1, player2, size);
      if (data?.match_id) {
        const newGame = new Game(size, player1, player2);
        newGame.setMatchId(data.match_id);
        setGame(newGame);
        setPaused(false);
        resetTimer();
      }
    } finally {
      setLoading(false);
    }
  }

  // --- NUEVA FUNCIÓN PARA GESTIONAR EL FINAL DEL JUEGO ---
  const handleGameOver = (isPlayer1Winner: boolean) => {
    const winnerName = isPlayer1Winner ? player1 : player2;
    setModalMessage(`Game finished! ${winnerName} won.`);

    // Solo guardamos datos si hay un usuario logueado
    if (currentUser && game.matchId) {
      const timeInSeconds = timeToSeconds(formattedTime);
      const resultString = isPlayer1Winner ? "Win" : "Loss";

      // 1. Actualizar el ranking del usuario
      updateScore(currentUser.email, currentUser.username, isPlayer1Winner, timeInSeconds);

      // 2. Guardar el historial de la partida (Requiere endpoint en Rust)
      saveMatch(game.matchId, currentUser.email, player2, resultString, timeInSeconds);
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
      updatedGame.setGameOver(data.game_over);
      setGame(updatedGame);

      if (data.game_over) {
        // game.turn era 0 (Player 1) al hacer el movimiento que dio la victoria
        handleGameOver(game.turn === 0);
        return;
      }

      if (mode === "bot" && updatedGame.matchId) {
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
      if(t2-t1 < 500) await sleep(Math.random()*500 + 500)
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

      if (botData.game_over) {
          handleGameOver(false); // Falso porque ganó el Bot (Jugador 2)
      }
    } finally {
      // Dejamos de cargar si el bot ha terminado
    }
  }

  const isBotTurn = mode === "bot" && game.turn !== 0;

  return (
    <div className="game-window">
      <TopRightMenu />
      <TopLeftHeader />

      <div className="center-area">
        <Board
          size={game.size}
          moves={game.moves}
          blocked={loading || game.gameOver || isBotTurn}
          onPlace={handlePlace}
        />
      </div>

      <RightPanel
        turn={game.turn === 0 ? 1 : 2}
        time={formattedTime}
        paused={paused}
        mode={mode}
        onPauseToggle={() => setPaused(!paused)}
      />

      {/* --- EL MODAL DE VICTORIA --- */}
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
              <p>Total time: {formattedTime}</p>
              <button
                  className={modalStyles.returnBtn}
                  onClick={() => navigate('/gameSelection')}
              >
                Return to game Selection
              </button>
            </div>
          </div>
      )}
    </div>
  );
};

export default GameWindow;
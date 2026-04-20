import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { type GameMode, Difficulty } from "./GameMode";
import { Difficulty as DifficultyValues } from "./GameMode";
import styles from "./GameModeContainer.module.css";
import imagenGameY from "../../../assets/background_image_gameY.png";
import { createOnlineMatch, joinOnlineMatch } from "../../online/online";
import { getPlayerId } from "../../online/playerId";

type Props = {
    mode: any; // Mantenemos 'any' para soportar las props dinámicas de los modos
};

export const GameModeContainer: React.FC<Props> = ({ mode }) => {
    const difficulties: Difficulty[] = Object.values(DifficultyValues);
    const navigate = useNavigate();
    const location = useLocation();
    const isGuest = location.state?.guest === true;

    // --- Estados ---
    const [currentDifficultyIndex, setCurrentDifficultyIndex] = useState(
        difficulties.indexOf(mode.currentLevel)
    );
    const [currentSize, setCurrentSize] = useState(mode.size || 8);
    const [matchId, setMatchId] = useState(mode.matchId || "");
    const [password, setPassword] = useState(mode.password || "");
    const [busy, setBusy] = useState<null | "create" | "join" | "play">(null);
    const [error, setError] = useState<string | null>(null);

    const minSize = 4;
    const maxSize = 12;

    // --- Handlers ---
    const decreaseDifficulty = () => setCurrentDifficultyIndex((prev) => Math.max(prev - 1, 0));
    const increaseDifficulty = () => setCurrentDifficultyIndex((prev) => Math.min(prev + 1, difficulties.length - 1));
    const decreaseSize = () => setCurrentSize((prev) => Math.max(prev - 1, minSize));
    const increaseSize = () => setCurrentSize((prev) => Math.min(prev + 1, maxSize));

    const currentDifficulty = difficulties[currentDifficultyIndex];

    // --- Navegación offline / single-player ---
    const handleLocalPlay = () => {
        mode.currentLevel = currentDifficulty;
        mode.size = currentSize;

        const navState = { state: { ...(isGuest && { guest: true }) } };

        if (mode.showDifficulty) {
            navigate(`/play/${currentSize}/${currentDifficulty[1]}`, navState);
        } else {
            navigate(`/play/${currentSize}/multi`, navState);
        }
    };

    // --- Crear partida online ---
    const handleCreate = async () => {
        setError(null);
        setBusy("create");
        try {
            const playerId = getPlayerId();
            const res = await createOnlineMatch({
                player1id: playerId,
                size: currentSize,
                match_id: matchId,     // "" → partida pública random
                match_password: password,
            });

            navigate(`/waiting/${res.match_id}`, {
                state: {
                    ...(isGuest && { guest: true }),
                    role: "create" as const,
                    turnNumber: res.turn_number,
                    size: currentSize,
                    isPrivate: !!mode.showMatchId,
                    password,
                },
            });
        } catch (e: any) {
            setError(e?.message || "Could not create match");
        } finally {
            setBusy(null);
        }
    };

    // --- Unirse a partida online ---
    const handleJoin = async () => {
        setError(null);
        setBusy("join");
        try {
            const playerId = getPlayerId();
            const res = await joinOnlineMatch({
                player2id: playerId,
                match_id: matchId,     // "" → cualquier partida pública
                match_password: password,
            });

            navigate(`/waiting/${res.match_id}`, {
                state: {
                    ...(isGuest && { guest: true }),
                    role: "join" as const,
                    turnNumber: res.turn_number,
                    size: currentSize,
                    isPrivate: !!mode.showMatchId,
                },
            });
        } catch (e: any) {
            setError(e?.message || "Could not join match");
        } finally {
            setBusy(null);
        }
    };

    return (
        <div className={styles.gameModeContainer}>
            <div className={styles.header}>
                <h2 className={styles.title}>{mode.label}</h2>
                <div className={styles.tooltipContainer}>
                    <button className={styles.infoButton}>?</button>
                    <div className={styles.tooltip}>{mode.description}</div>
                </div>
            </div>

      {/* Center: Image */}
      <div className={styles.imageContainer}>
        <img src={imagenGameY} alt={mode.label} />
      </div>

      {/* Controls Wrapper: Side-by-side layout to save vertical space */}
      <div className={styles.controlsWrapper}>
        
        {/* Difficulty Selector */}
        {mode.showDifficulty && (
          <div className={styles.difficultySection}>
            <span className={styles.difficultyLabel}>Difficulty</span>
            <div className={styles.difficultySelector}>
              <button
                className={styles.arrow}
                onClick={decreaseDifficulty}
                style={{ visibility: currentDifficultyIndex > 0 ? "visible" : "hidden" }}
              >
                ←
              </button>
              <div className={styles.difficultyBox}>{currentDifficulty[0]}</div>
              <button
                className={styles.arrow}
                onClick={increaseDifficulty}
                style={{
                  visibility: currentDifficultyIndex < difficulties.length - 1 ? "visible" : "hidden",
                }}
              >
                →
              </button>
            </div>
          </div>
        )}

        {/* Size Selector */}
        <div className={styles.sizeSection}>
          <span className={styles.difficultyLabel}>Size</span>
          <div className={styles.difficultySelector}>
            <button
              className={styles.arrow}
              onClick={decreaseSize}
              style={{ visibility: currentSize > minSize ? "visible" : "hidden" }}
            >
              ←
            </button>
            <div className={styles.difficultyBox}>{currentSize}</div>
            <button
              className={styles.arrow}
              onClick={increaseSize}
              style={{ visibility: currentSize < maxSize ? "visible" : "hidden" }}
            >
              →
            </button>
          </div>
        </div>

      </div>

      {/* Bottom: Play Button */}
      <button
        className={styles.playButton}
        onClick={() => {
          // Actualizamos el modelo por si lo necesitas en otro lado
          mode.currentLevel = currentDifficulty;
          mode.size = currentSize;

          const navState = isGuest ? { state: { guest: true } } : undefined;
          if (mode.showDifficulty) { navigate(`/play/${currentSize}/${currentDifficulty[1]}`, navState); }
          else { navigate(`/play/${currentSize}/multi`, navState); }
        }}
      >
        PLAY
      </button>
    </div>
  );
};
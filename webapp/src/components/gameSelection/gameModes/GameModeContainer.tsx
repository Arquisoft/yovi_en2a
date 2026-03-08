import React, { useState } from "react";
// 1. Importamos useNavigate
import { useNavigate } from "react-router-dom"; 
import type { GameMode, Difficulty } from "./GameMode";
import { Difficulty as DifficultyValues } from "./GameMode";
import styles from "./GameModeContainer.module.css";
import imagenGameY from "../../../assets/background_image_gameY.png";

type Props = {
  mode: GameMode;
};

export const GameModeContainer: React.FC<Props> = ({ mode }) => {
  const difficulties: Difficulty[] = Object.values(DifficultyValues);
  
  // 2. Inicializamos navigate
  const navigate = useNavigate();

  // State for Difficulty
  const [currentDifficultyIndex, setCurrentDifficultyIndex] = useState(
    difficulties.indexOf(mode.currentLevel)
  );
  
  // State for Size (fallback to 8 if not defined)
  const [currentSize, setCurrentSize] = useState(mode.size || 8);

  const minSize = 4;
  const maxSize = 12; // Prevents the grid from getting absurdly large

  // --- Difficulty Handlers ---
  const decreaseDifficulty = () => {
    setCurrentDifficultyIndex((prev) => Math.max(prev - 1, 0));
  };

  const increaseDifficulty = () => {
    setCurrentDifficultyIndex((prev) =>
      Math.min(prev + 1, difficulties.length - 1)
    );
  };

  // --- Size Handlers ---
  const decreaseSize = () => {
    setCurrentSize((prev) => Math.max(prev - 1, minSize));
  };

  const increaseSize = () => {
    setCurrentSize((prev) => Math.min(prev + 1, maxSize));
  };

  const currentDifficulty = difficulties[currentDifficultyIndex];

  return (
    <div className={styles.gameModeContainer}>
      {/* Top: Title and help */}
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
              <div className={styles.difficultyBox}>{currentDifficulty}</div>
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
          
          // 3. Navegamos directamente a la URL de juego pasándole el tamaño
          navigate(`/play/${currentSize}/${mode.mode}`);
        }}
      >
        PLAY
      </button>
    </div>
  );
};
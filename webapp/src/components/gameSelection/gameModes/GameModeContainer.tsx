import React, { useState } from "react";
import type { GameMode, Difficulty } from "./GameMode";
import { Difficulty as DifficultyValues } from "./GameMode";
// 1. Import styles as an object
import styles from "./GameModeContainer.module.css";
import imagenGameY from "../../../assets/background_image_gameY.png";

type Props = {
  mode: GameMode;
};

export const GameModeContainer: React.FC<Props> = ({ mode }) => {
  const difficulties: Difficulty[] = Object.values(DifficultyValues);

  const [currentDifficultyIndex, setCurrentDifficultyIndex] = useState(
    difficulties.indexOf(mode.currentLevel)
  );

  const decreaseDifficulty = () => {
    setCurrentDifficultyIndex((prev) => Math.max(prev - 1, 0));
  };

  const increaseDifficulty = () => {
    setCurrentDifficultyIndex((prev) =>
      Math.min(prev + 1, difficulties.length - 1)
    );
  };

  const currentDifficulty = difficulties[currentDifficultyIndex];

  return (
    <div className={styles.gameModeContainer}>
      {/* Superior: Título y Ayuda */}
      <div className={styles.header}>
        <h2 className={styles.title}>{mode.label}</h2>
        <div className={styles.tooltipContainer}>
          <button className={styles.infoButton}>?</button>
          <div className={styles.tooltip}>{mode.description}</div>
        </div>
      </div>

      {/* Centro: Imagen */}
      <div className={styles.imageContainer}>
        <img
          src={imagenGameY}
          alt={mode.label}
        />
      </div>

      {/* Inferior: Selector de Dificultad */}
      <div className={styles.difficultySection}>
        <span className={styles.difficultyLabel}>Difficulty</span>
        <div className={styles.difficultySelector}>
          <button 
            className={styles.arrow} 
            onClick={decreaseDifficulty}
            style={{ visibility: currentDifficultyIndex > 0 ? 'visible' : 'hidden' }}
          >
            ←
          </button>
          <div className={styles.difficultyBox}>{currentDifficulty}</div>
          <button 
            className={styles.arrow} 
            onClick={increaseDifficulty}
            style={{ visibility: currentDifficultyIndex < difficulties.length - 1 ? 'visible' : 'hidden' }}
          >
            →
          </button>
        </div>
      </div>

      {/* Fondo: Acción Principal */}
      <button
        className={styles.playButton}
        onClick={() => {
          mode.currentLevel = currentDifficulty;
          mode.start();
        }}
      >
        PLAY
      </button>
    </div>
  );
};
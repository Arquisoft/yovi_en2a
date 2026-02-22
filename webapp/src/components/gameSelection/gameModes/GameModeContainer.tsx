import React, { useState } from "react";
import type { GameMode, Difficulty } from "./GameMode";
import { Difficulty as DifficultyValues } from "./GameMode";
// 1. Import styles as an object
import styles from "./GameModeContainer.module.css";

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
    // 2. Apply styles using the styles object
    <div className={styles.gameModeContainer}>
      <div className={styles.header}>
        <h2 className={styles.title}>{mode.label}</h2>
        <div className={styles.tooltipContainer}>
          <button className={styles.infoButton}>?</button>
          <span className={styles.tooltip}>{mode.description}</span>
        </div>
      </div>

      <div className={styles.imageContainer}>
        <img
          src={`https://via.placeholder.com/400x200?text=${encodeURIComponent(
            mode.label
          )}`}
          alt={mode.label}
        />
      </div>

      <div className={styles.difficultyContainer}>
        {currentDifficultyIndex > 0 ? (
          <button className={styles.arrow} onClick={decreaseDifficulty}>
            ←
          </button>
        ) : (
          <div className={styles.arrow} style={{ visibility: 'hidden' }}>←</div>
        )}

        <div className={styles.difficultyBox}>{currentDifficulty}</div>

        {currentDifficultyIndex < difficulties.length - 1 ? (
          <button className={styles.arrow} onClick={increaseDifficulty}>
            →
          </button>
        ) : (
          <div className={styles.arrow} style={{ visibility: 'hidden' }}>→</div>
        )}
      </div>

      <button
        className={styles.playButton}
        onClick={() => {
          mode.currentLevel = currentDifficulty;
          mode.start();
        }}
      >
        Play
      </button>
    </div>
  );
};
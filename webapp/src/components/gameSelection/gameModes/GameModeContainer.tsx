import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { type GameMode, Difficulty } from "./GameMode";
import { Difficulty as DifficultyValues } from "./GameMode";
import styles from "./GameModeContainer.module.css";
import imagenGameY from "../../../assets/background_image_gameY.png";

type Props = {
  mode: GameMode;
};

export const GameModeContainer: React.FC<Props> = ({ mode }) => {
  const { t } = useTranslation();
  const difficulties: Difficulty[] = Object.values(DifficultyValues);

  const navigate = useNavigate();
  const location = useLocation();
  const isGuest = location.state?.guest === true;

  const [currentDifficultyIndex, setCurrentDifficultyIndex] = useState(
    difficulties.indexOf(mode.currentLevel)
  );

  const [currentSize, setCurrentSize] = useState(mode.size || 8);

  const minSize = 4;
  const maxSize = 12;

  const decreaseDifficulty = () => {
    setCurrentDifficultyIndex((prev) => Math.max(prev - 1, 0));
  };

  const increaseDifficulty = () => {
    setCurrentDifficultyIndex((prev) =>
      Math.min(prev + 1, difficulties.length - 1)
    );
  };

  const decreaseSize = () => {
    setCurrentSize((prev) => Math.max(prev - 1, minSize));
  };

  const increaseSize = () => {
    setCurrentSize((prev) => Math.min(prev + 1, maxSize));
  };

  const currentDifficulty = difficulties[currentDifficultyIndex];

  const label = t(`gameModes.${mode.id}.label`, { defaultValue: mode.label });
  const description = t(`gameModes.${mode.id}.description`, { defaultValue: mode.description });

  return (
    <div className={styles.gameModeContainer}>
      <div className={styles.header}>
        <h2 className={styles.title}>{label}</h2>
        <div className={styles.tooltipContainer}>
          <button className={styles.infoButton}>?</button>
          <div className={styles.tooltip}>{description}</div>
        </div>
      </div>

      <div className={styles.imageContainer}>
        <img src={mode.image ?? imagenGameY} alt={label} />
      </div>

      <div className={styles.controlsWrapper}>

        {mode.showDifficulty && (
          <div className={styles.difficultySection}>
            <span className={styles.difficultyLabel}>{t('gameSelection.difficulty')}</span>
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

        <div className={styles.sizeSection}>
          <span className={styles.difficultyLabel}>{t('gameSelection.size')}</span>
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

      <button
        className={styles.playButton}
        onClick={() => {
          mode.currentLevel = currentDifficulty;
          mode.size = currentSize;

          const navState = isGuest ? { state: { guest: true } } : undefined;
          if (mode.showDifficulty) { navigate(`/play/${currentSize}/${currentDifficulty[1]}`, navState); }
          else { navigate(`/play/${currentSize}/${mode.mode}`, navState); }
        }}
      >
        {t('gameSelection.play')}
      </button>
    </div>
  );
};

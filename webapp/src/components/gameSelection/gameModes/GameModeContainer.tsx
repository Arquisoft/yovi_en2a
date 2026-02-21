import React, { useState } from "react";
import type { GameMode, Difficulty } from "./GameMode";
import { Difficulty as DifficultyValues } from "./GameMode";
import "./GameModeContainer.css";

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
    <div className="game-mode-container">
      {/* Header with title and tooltip */}
      <div className="header">
        <h2 className="title">{mode.label}</h2>
        <div className="tooltip-container">
          <button className="info-button">?</button>
          <span className="tooltip">{mode.description}</span>
        </div>
      </div>

      {/* Placeholder Image */}
      <div className="image-container">
        <img
          src={`https://via.placeholder.com/400x200?text=${encodeURIComponent(
            mode.label
          )}`}
          alt={mode.label}
        />
      </div>

      {/* Difficulty selector */}
      <div className="difficulty-container">
        {currentDifficultyIndex > 0 && (
          <button className="arrow" onClick={decreaseDifficulty}>
            ←
          </button>
        )}

        <div className="difficulty-box">{currentDifficulty}</div>

        {currentDifficultyIndex < difficulties.length - 1 && (
          <button className="arrow" onClick={increaseDifficulty}>
            →
          </button>
        )}
      </div>

      {/* Play button */}
      <button
        className="play-button"
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

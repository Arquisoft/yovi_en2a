import React, { useState, useMemo } from 'react';
import type { GameMode } from '../gameModes/GameMode';

import { NormalMode } from '../gameModes/NormalMode';
import { GameModeContainer } from '../gameModes/GameModeContainer';

import './SelectionPanel.css';

const SelectionPanel: React.FC = () => {
  // Instantiate your game modes
  const gameModes = useMemo<GameMode[]>(() => [
    new NormalMode(),
    // You can add more modes here like new HardMode(), etc.
  ], []);

  const [currentIndex, setCurrentIndex] = useState(0);

  const currentMode = gameModes[currentIndex];

  const goLeft = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const goRight = () => {
    if (currentIndex < gameModes.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  return (
    <div className="selection-panel">
      {/* Left arrow */}
      {currentIndex > 0 && (
        <button className="arrow left" onClick={goLeft}>
          ←
        </button>
      )}

      {/* Current GameMode Container */}
      <GameModeContainer mode={currentMode} />

      {/* Right arrow */}
      {currentIndex < gameModes.length - 1 && (
        <button className="arrow right" onClick={goRight}>
          →
        </button>
      )}
    </div>
  );
};

export default SelectionPanel;

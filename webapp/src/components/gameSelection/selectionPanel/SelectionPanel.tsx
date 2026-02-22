import React, { useState, useMemo } from 'react';
import type { GameMode } from '../gameModes/GameMode';
import { NormalMode } from '../gameModes/NormalMode';
import { GameModeContainer } from '../gameModes/GameModeContainer';

// 1. Import the module styles
import styles from './SelectionPanel.module.css';

const SelectionPanel: React.FC = () => {
  const gameModes = useMemo<GameMode[]>(() => [
    new NormalMode(),
    // Add new modes here
  ], []);

  const [currentIndex, setCurrentIndex] = useState(0);
  const currentMode = gameModes[currentIndex];

  const goLeft = () => {
    if (currentIndex > 0) setCurrentIndex(prev => prev - 1);
  };

  const goRight = () => {
    if (currentIndex < gameModes.length - 1) setCurrentIndex(prev => prev + 1);
  };

  return (
    <div className={styles.selectionPanel}>
      {/* Left arrow or spacer to maintain center alignment */}
      {currentIndex > 0 ? (
        <button className={`${styles.arrow} ${styles.left}`} onClick={goLeft}>
          ←
        </button>
      ) : (
        <div className={styles.arrow} style={{ visibility: 'hidden' }}>←</div>
      )}

      {/* Current GameMode Container */}
      <GameModeContainer mode={currentMode} />

      {/* Right arrow or spacer */}
      {currentIndex < gameModes.length - 1 ? (
        <button className={`${styles.arrow} ${styles.right}`} onClick={goRight}>
          →
        </button>
      ) : (
        <div className={styles.arrow} style={{ visibility: 'hidden' }}>→</div>
      )}
    </div>
  );
};

export default SelectionPanel;
import React, { useMemo, useRef } from 'react';
import type { GameMode } from '../gameModes/GameMode';
import { NormalMode } from '../gameModes/NormalMode';
import { GameModeContainer } from '../gameModes/GameModeContainer';
import styles from './SelectionPanel.module.css';

const SelectionPanel: React.FC = () => {
  const gameModes = useMemo<GameMode[]>(() => [
    new NormalMode(),
    // Add more modes here to see the scroll
  ], []);

  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 400; // Adjust based on your card width
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className={styles.selectionPanelContainer}>
      <button className={`${styles.arrow} ${styles.left}`} onClick={() => scroll('left')}>
        ←
      </button>

      <div className={styles.carouselViewport} ref={scrollRef}>
        <div className={styles.modesWrapper}>
          {gameModes.map((mode) => (
            <div key={mode.id} className={styles.modeItem}>
              <GameModeContainer mode={mode} />
            </div>
          ))}
        </div>
      </div>

      <button className={`${styles.arrow} ${styles.right}`} onClick={() => scroll('right')}>
        →
      </button>
    </div>
  );
};

export default SelectionPanel;
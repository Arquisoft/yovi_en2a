import React from 'react';
import styles from './RankingTableLocal.module.css';
import type { RankingElementLocal } from "./rankingElements/RankingElementLocal";

const RankingTableLocal: React.FC<{ data: RankingElementLocal[], title: string }> = ({ data, title }) => {
  return (
    <div className={styles.rankingContainer}>
      <h3 className={styles.rankingSubtitle}>{title}</h3>
      
      {/* Fixed Header Row: Stays at the top while the list scrolls */}
      <div className={styles.rankingHeaderRow}>
        <span>PLAYER 1</span>
        <span className={styles.vsLabel}></span> {/* Placeholder to align with the VS column */}
        <span>PLAYER 2</span>
        <span>RESULT</span>
      </div>

      {/* Scrollable Container: This div handles the vertical scroll via CSS overflow-y */}
      <div className={styles.rankingList}>
        {data.map((item, index) => {
          return (
            <div 
              key={`rank-${index}-${item.player1Name}`} 
              className={styles.rankingItem}
            >
              {/* 1. Left Side: Player 1 Name */}
              <span className={styles.rankName}>{item.player1Name}</span>
              
              {/* 2. Center: VS Label */}
              <span className={styles.vsLabel}>VS</span>
              
              {/* 3. Middle/Right: Player 2 Name */}
              <span className={styles.rankName}>{item.player2Name}</span>
              
              {/* 4. Far Right: Match Result (e.g., WIN/LOSS) */}
              <span className={styles.rankTime}>{item.result}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RankingTableLocal;
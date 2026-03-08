import React from 'react';
import styles from './RankingTable.module.css';
import type { RankingElement } from "./RankingElement";

const RankingTable: React.FC<{ data: RankingElement[], title: string }> = ({ data, title }) => {
  return (
    <div className={styles.rankingContainer}>
      <h3 className={styles.rankingSubtitle}>{title}</h3>
      
      <div className={styles.rankingHeaderRow}>
        <span>POS</span>
        <span>PLAYER 1</span>
        <span className={styles.vsHeader}></span> {/* Empty or "VS" label */}
        <span>PLAYER 2</span>
        <span>TIME</span>
      </div>

      <div className={styles.rankingList}>
        {data.map((item) => {
          const positionHighlight = styles[`pos-${item.position}`] || '';
          
          return (
            <div 
              key={item.position} 
              className={`${styles.rankingItem} ${positionHighlight}`}
            >
              <span className={styles.rankPos}>#{item.position}</span>
              <span className={styles.rankName}>{item.player1Name}</span>
              <span className={styles.rankVs}>VS</span>
              <span className={styles.rankName}>{item.player2Name}</span>
              <span className={styles.rankTime}>{item.time}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RankingTable;
import React from 'react';
import styles from './RankingTable.module.css';
import type { RankingElement } from "./RankingElement";

const RankingTable: React.FC<{ data: RankingElement[], title: string }> = ({ data, title }) => {
  return (
    <div className={styles.rankingContainer}>
      <h3 className={styles.rankingSubtitle}>{title}</h3>
      
      <div className={styles.rankingHeaderRow}>
        <span>POS</span>
        <span>PLAYER</span>
        <span>TIME</span>
      </div>

      <div className={styles.rankingList}>
        {data.map((item) => {
          // Access the position highlight class (pos-1, pos-2, etc)
          const positionClass = styles[`pos-${item.position}`] || '';
          
          return (
            <div 
              key={item.position} 
              className={`${styles.rankingItem} ${positionClass}`}
            >
              <span className={styles.rankPos}>#{item.position}</span>
              <span className={styles.rankName}>{item.playerName}</span>
              <span className={styles.rankTime}>{item.time}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RankingTable;
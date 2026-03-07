<<<<<<< HEAD
import React from 'react';
import styles from './RankingTable.module.css';
=======
import './RankingTable.css';
import './RankingElement.css';
>>>>>>> feature/gameWindow
import type { RankingElement } from "./RankingElement";

const RankingTable: React.FC<{ data: RankingElement[], title: string }> = ({ data, title }) => {
  return (
<<<<<<< HEAD
    <div className={styles.rankingContainer}>
      <h3 className={styles.rankingSubtitle}>{title}</h3>
      
      <div className={styles.rankingHeaderRow}>
=======
    /* The ranking-container must have a fixed or relative height to allow internal scrolling */
    <div className="ranking-container">
      <h3 className="ranking-subtitle">{title}</h3>
      
      {/* Fixed Header: This won't move when scrolling */}
      <div className="ranking-header-row">
>>>>>>> feature/gameWindow
        <span>POS</span>
        <span>PLAYER</span>
        <span>TIME</span>
      </div>

<<<<<<< HEAD
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
=======
      {/* Scrollable List: Only this section will scroll */}
      <div className="ranking-list">
        {data.map((item) => (
          <div key={item.position} className={`ranking-item pos-${item.position}`}>
            <span className="rank-pos">#{item.position}</span>
            <span className="rank-name">{item.playerName}</span>
            <span className="rank-time">{item.time}</span>
          </div>
        ))}
>>>>>>> feature/gameWindow
      </div>
    </div>
  );
};

export default RankingTable;
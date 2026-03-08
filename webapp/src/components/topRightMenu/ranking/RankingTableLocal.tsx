import React from 'react';
import styles from './RankingTableLocal.module.css';
import type { RankingElementLocal } from "./rankingElements/RankingElementLocal";

const RankingTableLocal: React.FC<{ data: RankingElementLocal[], title: string }> = ({ data, title }) => {
  return (
    <div className={styles.rankingContainer}>
      <h3 className={styles.rankingSubtitle}>{title}</h3>
      
      <div className={styles.rankingHeaderRow}>
        <span>PLAYER 1</span>
        <span className={styles.vsLabel}></span> {/* Espacio para alinear el VS */}
        <span>PLAYER 2</span>
        <span>RESULT</span>
      </div>

      <div className={styles.rankingList}>
        {data.map((item, index) => {
            return (
            <div 
                key={`rank-${index}-${item.player1Name}`} 
                className={styles.rankingItem}
            >
                {/* 1. Extremo Izquierdo */}
                <span className={styles.rankName}>{item.player1Name}</span>
                
                {/* 2. Centro entre los jugadores (NUEVO) */}
                <span className={styles.vsLabel}>VS</span>
                
                {/* 3. Medio / Derecha */}
                <span className={styles.rankName}>{item.player2Name}</span>
                
                {/* 4. Extremo Derecho */}
                <span className={styles.rankTime}>{item.result}</span>
            </div>
            );
        })}
        </div>
    </div>
  );
};

export default RankingTableLocal;
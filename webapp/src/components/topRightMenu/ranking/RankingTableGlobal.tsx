import React from 'react';
import styles from './RankingTableGlobal.module.css';
import type { RankingElementGlobal } from "./rankingElements/RankingElementGlobal";

const RankingTableGlobal: React.FC<{ data: RankingElementGlobal[], title: string }> = ({ data, title }) => {
  
  // Extraemos el nombre dinámico del primer elemento. 
  // Si la tabla está vacía, ponemos 'RESULT' (o lo que prefieras) por defecto.
  const dynamicMetricName = data.length > 0 ? data[0].metricName : 'RESULT';

  return (
    <div className={styles.rankingContainer}>
      <h3 className={styles.rankingSubtitle}>{title}</h3>
      
      <div className={styles.rankingHeaderRow}>
        <span>POS</span>
        <span>PLAYER 1</span>
        {/* Usamos nuestra variable dinámica aquí */}
        <span>{dynamicMetricName}</span>
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
              <span className={styles.rankTime}>{item.metric}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RankingTableGlobal;
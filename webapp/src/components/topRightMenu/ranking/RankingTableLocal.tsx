import React from 'react';
import styles from './RankingTableLocal.module.css';
import type { RankingElementLocal } from "./rankingElements/RankingElementLocal";
import Pagination, { usePagination } from './Pagination';

const formatTime = (seconds: number): string => {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

interface Props {
  data: RankingElementLocal[];
  title: string;
  onReplay?: (item: RankingElementLocal) => void;
}

const RankingTableLocal: React.FC<Props> = ({ data, title, onReplay }) => {
  const { currentPage, setCurrentPage, totalPages, pageData, visiblePages } = usePagination(data);

  return (
    <div className={styles.rankingContainer}>
      <h3 className={styles.rankingSubtitle}>{title}</h3>

      <div className={styles.rankingHeaderRow}>
        <span>PLAYER 1</span>
        <span className={styles.vsLabel}></span>
        <span>PLAYER 2</span>
        <span>RESULT</span>
        <span>TIME</span>
        <span></span>
      </div>

      <div className={styles.rankingList}>
        {pageData.map((item, index) => (
          <div key={`rank-${index}-${item.player1Name}`} className={styles.rankingItem}>
            <span className={styles.rankName}>{item.player1Name}</span>
            <span className={styles.vsLabel}>VS</span>
            <span className={styles.rankName}>{item.player2Name}</span>
            <span className={styles.rankResult}>{item.result}</span>
            <span className={styles.rankTime}>{formatTime(item.time)}</span>
            <span className={styles.replayCell}>
              {onReplay && (item.moves?.length ?? 0) > 0 && (
                <button
                  className={styles.replayBtn}
                  onClick={() => onReplay(item)}
                  title="Watch replay"
                >
                  ▶
                </button>
              )}
            </span>
          </div>
        ))}
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        visiblePages={visiblePages}
        onPageChange={setCurrentPage}
      />
    </div>
  );
};

export default RankingTableLocal;

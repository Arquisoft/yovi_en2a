import React from 'react';
import { useTranslation } from 'react-i18next';
import styles from './RankingTableGlobal.module.css';
import type { RankingElementGlobal } from "./rankingElements/RankingElementGlobal";
import Pagination from './Pagination';
import { usePagination } from './usePagination';

const RankingTableGlobal: React.FC<{ data: RankingElementGlobal[], title: string }> = ({ data, title }) => {
  const { t } = useTranslation();
  const { currentPage, setCurrentPage, totalPages, pageData, visiblePages } = usePagination(data);

  const dynamicMetricName = data.length > 0 ? data[0].metricName : 'RESULT';

  return (
    <div className={styles.rankingContainer}>
      <h3 className={styles.rankingSubtitle}>{title}</h3>

      <div className={styles.rankingHeaderRow}>
        <span>{t('rankings.table.pos')}</span>
        <span className={styles.rankName}>{t('rankings.table.player1')}</span>
        <span>{dynamicMetricName}</span>
      </div>

      <div className={styles.rankingList}>
        {pageData.map((item) => {
          const positionHighlight = styles[`pos-${item.position}`] || '';
          return (
            <div
              key={item.player1Name}
              className={`${styles.rankingItem} ${positionHighlight}`}
            >
              <span className={styles.rankPos}>#{item.position}</span>
              <span className={styles.rankName}>{item.player1Name}</span>
              <span className={styles.rankTime}>{item.metric}</span>
            </div>
          );
        })}
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

export default RankingTableGlobal;

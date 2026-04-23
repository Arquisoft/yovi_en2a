import React from 'react';
import { useTranslation } from 'react-i18next';
import styles from './RankingTableLocal.module.css';
import type { RankingElementLocal } from "./rankingElements/RankingElementLocal";
import Pagination from './Pagination';
import { usePagination } from './usePagination';

const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
};

interface Props {
    data: RankingElementLocal[];
    title: string;
    onReplay?: (item: RankingElementLocal) => void;
    showPosition?: boolean;
}

const RankingTableLocal: React.FC<Props> = ({ data, title, onReplay, showPosition }) => {
    const { t } = useTranslation();
    const { currentPage, setCurrentPage, totalPages, pageData, visiblePages } = usePagination(data);

    const rowClass = (extra = '') =>
        [styles.rankingItem, showPosition ? styles.withPosition : '', extra].filter(Boolean).join(' ');

    return (
        <div className={styles.rankingContainer}>
            <h3 className={styles.rankingSubtitle}>{title}</h3>

            <div className={`${styles.rankingHeaderRow} ${showPosition ? styles.withPosition : ''}`}>
                {showPosition && <span>{t('rankings.table.pos')}</span>}
                <span className={styles.rankName}>{t('rankings.table.player1')}</span>
                <span className={styles.vsLabel}></span>
                <span className={styles.rankName}>{t('rankings.table.player2')}</span>
                <span>{t('rankings.table.result')}</span>
                <span>{t('rankings.table.time')}</span>
                {onReplay && <span className={styles.replayColHeader}></span>}
            </div>

            <div className={styles.rankingList}>
                {pageData.map((item, index) => onReplay ? (
                    <button
                        key={`rank-${index}-${item.player1Name}`}
                        type="button"
                        className={`${rowClass()} ${styles.clickableRow} ${styles.buttonRow}`}
                        onClick={() => onReplay(item)}
                    >
                        {showPosition && <span className={styles.rankPos}>#{item.position}</span>}
                        <span className={styles.rankName}>{item.player1Name}</span>
                        <span className={styles.vsLabel}>VS</span>
                        <span className={styles.rankName}>{item.player2Name}</span>
                        <span className={styles.rankResult}>{item.result}</span>
                        <span className={styles.rankTime}>{formatTime(item.time)}</span>
                        <span className={styles.replayCell}>
                            <span className={styles.replayBtnMobile}>{t('rankings.table.replay')}</span>
                        </span>
                    </button>
                ) : (
                    <div
                        key={`rank-${index}-${item.player1Name}`}
                        className={rowClass()}
                    >
                        {showPosition && <span className={styles.rankPos}>#{item.position}</span>}
                        <span className={styles.rankName}>{item.player1Name}</span>
                        <span className={styles.vsLabel}>VS</span>
                        <span className={styles.rankName}>{item.player2Name}</span>
                        <span className={styles.rankResult}>{item.result}</span>
                        <span className={styles.rankTime}>{formatTime(item.time)}</span>
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

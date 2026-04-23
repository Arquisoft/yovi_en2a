import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './Ranking.module.css';
import { LocalRanking } from './rankingTypes/LocalRanking';
import { GlobalRanking } from './rankingTypes/GlobalRanking';

const Ranking: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { t } = useTranslation();
  const [activeTabId, setActiveTabId] = useState<'local' | 'global'>('local');

  const RANKING_TYPES = [
    { id: 'local'  as const, labelKey: 'rankings.local',  Component: LocalRanking  },
    { id: 'global' as const, labelKey: 'rankings.global', Component: GlobalRanking },
  ];

  const current = RANKING_TYPES.find(r => r.id === activeTabId)!;

  return (
    <div className="top-right-menu-overlay">
      <div className="top-right-menu-container">
        <button className="top-right-menu-close-btn" onClick={onClose} aria-label="Close">✕</button>

        <header className="top-right-menu-global-header">
          <h2 className="top-right-menu-title">{t('rankings.title')}</h2>
        </header>

        <div className={`top-right-menu-body ${styles.rankingBody}`}>
          <main className={styles.rankingPanel}>

            <header className={styles.rankingNavHeader}>
              <div className={styles.rankingTabs}>
                {RANKING_TYPES.map(type => (
                  <button
                    key={type.id}
                    className={`${styles.rankingTabBtn} ${activeTabId === type.id ? styles.active : ''}`}
                    onClick={() => setActiveTabId(type.id)}
                  >
                    {t(type.labelKey)}
                  </button>
                ))}
              </div>
            </header>

            <div className={`tab-content ${styles.rankingContent}`}>
              <current.Component />
            </div>

          </main>
        </div>
      </div>
    </div>
  );
};

export default Ranking;

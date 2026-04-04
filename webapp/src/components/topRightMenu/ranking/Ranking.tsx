import React, { useState } from 'react';
import styles from './Ranking.module.css';
import { LocalRanking } from './rankingTypes/LocalRanking';
import { GlobalRanking } from './rankingTypes/GlobalRanking';

const RANKING_TYPES = [
  { id: 'local',  label: 'Local',  Component: LocalRanking  },
  { id: 'global', label: 'Global', Component: GlobalRanking },
] as const;

const Ranking: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [activeTabId, setActiveTabId] = useState<string>(RANKING_TYPES[0].id);
  const current = RANKING_TYPES.find(r => r.id === activeTabId)!;

  return (
    <div className="top-right-menu-overlay">
      <div className="top-right-menu-container">
        <button className="top-right-menu-close-btn" onClick={onClose} aria-label="Close">✕</button>

        <header className="top-right-menu-global-header">
          <h2 className="top-right-menu-title">RANKINGS</h2>
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
                    {type.label}
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

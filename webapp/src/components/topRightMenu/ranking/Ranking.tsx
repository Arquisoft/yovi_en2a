import React, { useState, useMemo } from 'react';
import styles from './Ranking.module.css';
import { LocalRanking } from './rankingTypes/LocalRanking';
import { GlobalRanking } from './rankingTypes/GlobalRanking';

const Ranking: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  // Memoize strategies
  const rankingTypes = useMemo(() => [
    new LocalRanking(),
    new GlobalRanking()
  ], []);

  const [activeTabId, setActiveTabId] = useState(rankingTypes[0].id);
  const currentRanking = rankingTypes.find(r => r.id === activeTabId);

  return (
    <div className="top-right-menu-overlay">
      <div className="top-right-menu-container">
        
        {/* GLOBAL HEADER */}
        <header className="top-right-menu-global-header">
          <h2 className="top-right-menu-title">RANKINGS</h2>
        </header>

        <div className={`top-right-menu-body ${styles.rankingBody}`}>
          {/* MAIN PANEL */}
          <main className={styles.rankingPanel}>
            
            {/* SUB-HEADER: Selection Buttons */}
            <header className={styles.rankingNavHeader}>
              <div className={styles.rankingTabs}>
                {rankingTypes.map(type => (
                  <button 
                    key={type.id}
                    className={`${styles.rankingTabBtn} ${activeTabId === type.id ? styles.active : ''}`} 
                    onClick={() => setActiveTabId(type.id)}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
              <button className={styles.closeButton} onClick={onClose} aria-label="Close">✕</button>
            </header>
            
            {/* SCROLLABLE CONTENT */}
            <div className={`tab-content ${styles.rankingContent}`}>
              {currentRanking?.render()}
            </div>

          </main>
        </div>
      </div>
    </div>
  );
};

export default Ranking;
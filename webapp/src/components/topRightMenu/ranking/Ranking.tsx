<<<<<<< HEAD
import React, { useState, useMemo } from 'react';
import styles from './Ranking.module.css';
=======
import './Ranking.css';
import React, { useState, useMemo } from 'react';
>>>>>>> feature/gameWindow
import { LocalRanking } from './rankingTypes/LocalRanking';
import { GlobalRanking } from './rankingTypes/GlobalRanking';

const Ranking: React.FC<{ onClose: () => void }> = ({ onClose }) => {
<<<<<<< HEAD
  // Memoize strategies
=======
  // Memoize ranking strategies
>>>>>>> feature/gameWindow
  const rankingTypes = useMemo(() => [
    new LocalRanking(),
    new GlobalRanking()
  ], []);

<<<<<<< HEAD
  const [activeTabId, setActiveTabId] = useState(rankingTypes[0].id);
=======
  // Default to the first ranking type (Local)
  const [activeTabId, setActiveTabId] = useState(rankingTypes[0].id);

  // Find current active strategy
>>>>>>> feature/gameWindow
  const currentRanking = rankingTypes.find(r => r.id === activeTabId);

  return (
    <div className="top-right-menu-overlay">
      <div className="top-right-menu-container">
        
        {/* GLOBAL HEADER */}
        <header className="top-right-menu-global-header">
          <h2 className="top-right-menu-title">RANKINGS</h2>
        </header>

<<<<<<< HEAD
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
=======
        <div className="top-right-menu-body">
          {/* MAIN PANEL */}
          <main className="ranking-panel">
            
            {/* SUB-HEADER: Selection Buttons (Local vs Global) */}
            <header className="ranking-nav-header">
              <div className="ranking-tabs">
                {rankingTypes.map(type => (
                  <button 
                    key={type.id}
                    className={`ranking-tab-btn ${activeTabId === type.id ? 'active' : ''}`} 
>>>>>>> feature/gameWindow
                    onClick={() => setActiveTabId(type.id)}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
<<<<<<< HEAD
              <button className={styles.closeButton} onClick={onClose} aria-label="Close">✕</button>
            </header>
            
            {/* SCROLLABLE CONTENT */}
            <div className={`tab-content ${styles.rankingContent}`}>
=======
              <button className="close-button" onClick={onClose} aria-label="Close">✕</button>
            </header>
            
            {/* SCROLLABLE CONTENT: Here goes the ranking list */}
            <div className="tab-content ranking-content">
>>>>>>> feature/gameWindow
              {currentRanking?.render()}
            </div>

          </main>
        </div>
      </div>
    </div>
  );
};

export default Ranking;
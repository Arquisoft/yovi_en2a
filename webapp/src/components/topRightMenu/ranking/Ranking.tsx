import './Ranking.css';
import React, { useState, useMemo } from 'react';
import { LocalRanking } from './rankingTypes/LocalRanking';
import { GlobalRanking } from './rankingTypes/GlobalRanking';

const Ranking: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  // Memoize ranking strategies
  const rankingTypes = useMemo(() => [
    new LocalRanking(),
    new GlobalRanking()
  ], []);

  // Default to the first ranking type (Local)
  const [activeTabId, setActiveTabId] = useState(rankingTypes[0].id);

  // Find current active strategy
  const currentRanking = rankingTypes.find(r => r.id === activeTabId);

  return (
    <div className="top-right-menu-overlay">
      <div className="top-right-menu-container">
        
        {/* GLOBAL HEADER */}
        <header className="top-right-menu-global-header">
          <h2 className="top-right-menu-title">RANKINGS</h2>
        </header>

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
                    onClick={() => setActiveTabId(type.id)}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
              <button className="close-button" onClick={onClose} aria-label="Close">✕</button>
            </header>
            
            {/* SCROLLABLE CONTENT: Here goes the ranking list */}
            <div className="tab-content ranking-content">
              {currentRanking?.render()}
            </div>

          </main>
        </div>
      </div>
    </div>
  );
};

export default Ranking;
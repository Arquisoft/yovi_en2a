import React, { useState, useMemo } from 'react';
import styles from './Settings.module.css';
import { AudioSettings } from './settingsSections/AudioSettings';
import { GameSettings } from './settingsSections/GameSettings';
import { AccountSettings } from './settingsSections/AccountSettings';

const SettingsMenu: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  // Memoize strategies to prevent re-instantiation on every render
  const sections = useMemo(() => [
    new AudioSettings(),
    new GameSettings(),
    new AccountSettings()
  ], []);

  const [activeTabId, setActiveTabId] = useState(sections[0].id);
  const currentSection = sections.find(s => s.id === activeTabId);

  return (
    <div className="top-right-menu-overlay">
      <div className="top-right-menu-container">
        
        {/* GLOBAL HEADER */}
        <header className="top-right-menu-global-header">
          <h2 className="top-right-menu-title">SETTINGS</h2>
        </header>

        <div className={styles.settingsBody}>
          {/* SIDEBAR */}
          <nav className={styles.settingsSidebar}>
            <div className={styles.sidebarButtons}>
              {sections.map(section => (
                <button 
                  key={section.id}
                  /* Toggle logic using the styles object */
                  className={activeTabId === section.id ? styles.active : ''} 
                  onClick={() => setActiveTabId(section.id)}
                >
                  {section.label}
                </button>
              ))}
            </div>
          </nav>

        {/* MAIN PANEL */}
        <main className={styles.settingsPanel}>
        <header className={styles.settingsPanelHeader}>
            <h2 className={styles.sectionLabel}>{currentSection?.label}</h2>
            <button 
            className={styles.closeButton} 
            onClick={onClose} 
            aria-label="Close"
            >
            ✕
            </button>
        </header>
        
        <div className={styles.tabContent}>
            {currentSection?.render()}
        </div>
        </main>
        </div>
      </div>
    </div>
  );
};

export default SettingsMenu;
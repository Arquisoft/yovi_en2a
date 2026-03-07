<<<<<<< HEAD
import React, { useState, useMemo } from 'react';
import styles from './Settings.module.css';
=======
import './Settings.css';
import React, { useState, useMemo } from 'react';
>>>>>>> feature/gameWindow
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

<<<<<<< HEAD
  const [activeTabId, setActiveTabId] = useState(sections[0].id);
=======
  // State to track the currently selected section ID
  const [activeTabId, setActiveTabId] = useState(sections[0].id);

  // Find the strategy object that matches the active ID
>>>>>>> feature/gameWindow
  const currentSection = sections.find(s => s.id === activeTabId);

  return (
    <div className="top-right-menu-overlay">
<<<<<<< HEAD
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
=======
        <div className="top-right-menu-container">
        
        {/* GLOBAL HEADER: Top row */}
        <header className="top-right-menu-global-header">
            <h2 className="top-right-menu-title">SETTINGS</h2>
        </header>

        <div className="top-right-menu-body">
            {/* SIDEBAR: Navigation column */}
            <nav className="settings-sidebar">
            <div className="sidebar-buttons">
                {sections.map(section => (
                <button 
                    key={section.id}
                    className={activeTabId === section.id ? 'active' : ''} 
                    onClick={() => setActiveTabId(section.id)}
                >
                    {section.label}
                </button>
                ))}
            </div>
            </nav>

            {/* MAIN PANEL: Content area with independent scrolling */}
            <main className="settings-panel">
            <header className="settings-panel-header">
                <h2 className="section-label">{currentSection?.label}</h2>
                <button className="close-button" onClick={onClose} aria-label="Close">✕</button>
            </header>
            
            <div className="tab-content">
                {currentSection?.render()}
            </div>
            </main>
        </div>
        </div>
    </div>
    );
>>>>>>> feature/gameWindow
};

export default SettingsMenu;
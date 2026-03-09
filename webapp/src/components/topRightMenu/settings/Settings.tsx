import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom'; // Import useNavigate hook
import styles from './Settings.module.css';
import { AudioSettings } from './settingsSections/AudioSettings';
import { GameSettings } from './settingsSections/GameSettings';
import { AccountSettings } from './settingsSections/AccountSettings';

const SettingsMenu: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  // Initialize the navigation hook
  const navigate = useNavigate();

  // Read the user state from the browser's cookies instead of localStorage
  const cookieMatch = document.cookie.match(/(?:^|; )user=([^;]*)/);
  const savedUser = cookieMatch ? JSON.parse(decodeURIComponent(cookieMatch[1])) : null;
  
  const isLoggedIn = savedUser !== null;
  const username = isLoggedIn ? savedUser.username : "";

  // Memoize strategies to prevent re-instantiation on every render
  const sections = useMemo(() => [
    new AudioSettings(),
    new GameSettings(),
    // Pass the required parameters to AccountSettings for navigation and status
    new AccountSettings(isLoggedIn, username, navigate)
  ], [isLoggedIn, username, navigate]); // Update dependencies for useMemo

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
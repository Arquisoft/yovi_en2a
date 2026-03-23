import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Settings.module.css';
import { AudioSettings } from './settingsSections/AudioSettings';
import { GameSettings } from './settingsSections/GameSettings';
import { AccountSettings } from './settingsSections/AccountSettings';
import { useUser } from '../../../contexts/UserContext';

const SettingsMenu: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const navigate = useNavigate();
  const { user, isLoggedIn, logout } = useUser();
  const username = user?.username ?? '';

  const sections = useMemo(() => [
    new AudioSettings(),
    new GameSettings(),
    new AccountSettings(isLoggedIn, username, navigate, logout)
  ], [isLoggedIn, username, navigate, logout]);

  const [activeTabId, setActiveTabId] = useState(sections[0].id);
  const currentSection = sections.find(s => s.id === activeTabId);

  return (
    <div className="top-right-menu-overlay">
      <div className="top-right-menu-container">
        <header className="top-right-menu-global-header">
          <h2 className="top-right-menu-title">SETTINGS</h2>
        </header>
        <div className={styles.settingsBody}>
          <nav className={styles.settingsSidebar}>
            <div className={styles.sidebarButtons}>
              {sections.map(section => (
                <button
                  key={section.id}
                  className={activeTabId === section.id ? styles.active : ''}
                  onClick={() => setActiveTabId(section.id)}
                >
                  {section.label}
                </button>
              ))}
            </div>
          </nav>
          <main className={styles.settingsPanel}>
            <header className={styles.settingsPanelHeader}>
              <h2 className={styles.sectionLabel}>{currentSection?.label}</h2>
              <button className={styles.closeButton} onClick={onClose} aria-label="Close">✕</button>
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

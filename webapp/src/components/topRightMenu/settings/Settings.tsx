import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styles from './Settings.module.css';
import { AudioSettings } from './settingsSections/AudioSettings';
import { AccountSettings } from './settingsSections/AccountSettings';
import { LanguageSettings } from './settingsSections/LanguageSettings';
import { useUser } from '../../../contexts/UserContext';

const SettingsMenu: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, isLoggedIn, logout } = useUser();
  const username = user?.username ?? '';

  const sections = useMemo(() => [
    new AudioSettings(),
    new AccountSettings(isLoggedIn, username, navigate, logout),
    new LanguageSettings(),
  ], [isLoggedIn, username, navigate, logout]);

  const [activeTabId, setActiveTabId] = useState(sections[0].id);
  const currentSection = sections.find(s => s.id === activeTabId);

  return (
    <div className="top-right-menu-overlay">
      <div className="top-right-menu-container">
        <button className="top-right-menu-close-btn" onClick={onClose} aria-label="Close">✕</button>

        <header className="top-right-menu-global-header">
          <h2 className="top-right-menu-title">{t('settings.title')}</h2>
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
                  {t(`settings.sections.${section.id}`)}
                </button>
              ))}
            </div>
          </nav>
          <main className={styles.settingsPanel}>
            <header className={styles.settingsPanelHeader}>
              <h2 className={styles.sectionLabel}>
                {currentSection ? t(`settings.sections.${currentSection.id}`) : ''}
              </h2>
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

import './Settings.css';
import React, { useState, useMemo } from 'react';
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

  // State to track the currently selected section ID
  const [activeTabId, setActiveTabId] = useState(sections[0].id);

  // Find the strategy object that matches the active ID
  const currentSection = sections.find(s => s.id === activeTabId);

  return (
    <div className="top-right-menu-overlay">
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
};

export default SettingsMenu;
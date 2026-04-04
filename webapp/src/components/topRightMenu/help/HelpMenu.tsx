import { useState } from 'react';
import './HelpMenu-module.css';
import MainMenuHelp from './tabs/MainMenuHelp';
import GameRulesHelp from './tabs/GameRulesHelp';
import AccountHelp from './tabs/AccountHelp';

type Tab = {
  id: string;
  label: string;
  component: React.ReactNode;
};

const tabs: Tab[] = [
  { id: 'mainMenu',   label: 'Main Menu',   component: <MainMenuHelp /> },
  { id: 'account',    label: 'Account',     component: <AccountHelp /> },
  { id: 'gameRules',  label: 'Game Rules',  component: <GameRulesHelp /> },
];

type NavItemsProps = {
  tabs: Tab[];
  activeTab: string;
  onTabClick: (id: string) => void;
};

/* Create navigation */
  const NavItems = ({ tabs, activeTab, onTabClick }: NavItemsProps) => (
    <>
      {tabs.map(tab => (
        <button
          key={tab.id}
          className={activeTab === tab.id ? 'active' : ''}
          onClick={() => onTabClick(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </>
  );

type Props = { readonly onClose: () => void };

export default function HelpMenu({ onClose }: Props) {
  const [activeTab, setActiveTab] = useState('mainMenu');
  const [menuOpen, setMenuOpen] = useState(false);
  const current = tabs.find(t => t.id === activeTab)!;

  const handleTabClick = (id: string) => {
    setActiveTab(id);
    setMenuOpen(false);
  };


  return (
    <div className="help-menu-overlay" onClick={onClose} onKeyDown={e => e.key === 'Escape' && onClose()} role="presentation">
      <div className="help-menu-panel" onClick={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()} role="dialog">
        <button className="help-close-btn" onClick={onClose}>✕</button>

        <nav className="help-sidebar">
            <p>HELP</p>
            <NavItems tabs={tabs} activeTab={activeTab} onTabClick={handleTabClick} />
        </nav>

        {/* Mobile */}
        <div className="help-mobile">
            <div className="help-mobile-header">
            <button onClick={() => setMenuOpen(!menuOpen)}>
                {menuOpen ? '✕' : '☰'}
            </button>
            <p>{current.label}</p>
            </div>

            {menuOpen && (
            <nav className="help-mobile-nav">
                <NavItems tabs={tabs} activeTab={activeTab} onTabClick={handleTabClick} />
            </nav>
            )}

            <div className="help-content">
            {current.component}
            </div>
        </div>

        {/* Desktop content */}
        <div className="help-content help-desktop-content">
            {current.component}
        </div>
      </div>
    </div>
  );
}
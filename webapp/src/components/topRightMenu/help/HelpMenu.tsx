import { useState } from 'react';
import styles from './HelpMenu.module.css';
import MainMenuHelp from './tabs/MainMenuHelp';
import GameModesHelp from './tabs/GameModesHelp';
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
  { id: 'gameModes',  label: 'Game Modes',  component: <GameModesHelp /> },
  { id: 'gameRules',  label: 'Game Rules',  component: <GameRulesHelp /> },
];

type Props = { onClose: () => void };

export default function HelpMenu({ onClose }: Props) {
  const [activeTab, setActiveTab] = useState('mainMenu');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const current = tabs.find(t => t.id === activeTab)!;

  const handleTabClick = (id: string) => {
    setActiveTab(id);
    setMobileMenuOpen(false);
  };

  const NavItems = () => (
    <>
      {tabs.map(tab => (
        <button
          key={tab.id}
          className={`${styles.navItem} ${activeTab === tab.id ? styles.navItemActive : ''}`}
          onClick={() => handleTabClick(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </>
  );

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={e => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onClose}>✕</button>

        {/* Desktop sidebar */}
        <nav className={styles.sidebar}>
          <p className={styles.sidebarTitle}>Help</p>
          <NavItems />
        </nav>

        {/* Mobile header + hamburger */}
        <div className={styles.mobileHeader}>
          <button
            className={styles.hamburger}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </button>
          <p className={styles.mobileTitle}>{current.label}</p>
        </div>

        {/* Mobile nav dropdown */}
        {mobileMenuOpen && (
          <nav className={styles.mobileSidebar}>
            <NavItems />
          </nav>
        )}

        {/* Content */}
        <div className={styles.content}>
          {current.component}
        </div>
      </div>
    </div>
  );
}
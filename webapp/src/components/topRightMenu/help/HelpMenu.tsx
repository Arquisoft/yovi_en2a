import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import './HelpMenu-module.css';
import MainMenuHelp from './tabs/MainMenuHelp';
import GameRulesHelp from './tabs/GameRulesHelp';
import AccountHelp from './tabs/AccountHelp';

type TabId = 'mainMenu' | 'account' | 'gameRules';

type NavItemsProps = {
  tabs: { id: TabId; labelKey: string }[];
  activeTab: string;
  onTabClick: (id: string) => void;
};

const NavItems = ({ tabs, activeTab, onTabClick }: NavItemsProps) => {
  const { t } = useTranslation();
  return (
    <>
      {tabs.map(tab => (
        <button
          key={tab.id}
          className={activeTab === tab.id ? 'active' : ''}
          onClick={() => onTabClick(tab.id)}
        >
          {t(tab.labelKey)}
        </button>
      ))}
    </>
  );
};

const TAB_DEFS: { id: TabId; labelKey: string; component: React.ReactNode }[] = [
  { id: 'mainMenu',  labelKey: 'help.tabs.mainMenu',   component: <MainMenuHelp /> },
  { id: 'account',   labelKey: 'help.tabs.account',    component: <AccountHelp /> },
  { id: 'gameRules', labelKey: 'help.tabs.gameRules',  component: <GameRulesHelp /> },
];

type Props = { readonly onClose: () => void };

export default function HelpMenu({ onClose }: Props) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabId>('mainMenu');
  const [menuOpen, setMenuOpen] = useState(false);
  const current = TAB_DEFS.find(tab => tab.id === activeTab)!;

  const handleTabClick = (id: string) => {
    setActiveTab(id as TabId);
    setMenuOpen(false);
  };

  return (
    <div className="help-menu-overlay" onClick={onClose} onKeyDown={e => e.key === 'Escape' && onClose()} role="presentation">
      <div className="help-menu-panel" onClick={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()} role="dialog">
        <button className="help-close-btn" onClick={onClose}>✕</button>

        <nav className="help-sidebar">
          <p>{t('help.title')}</p>
          <NavItems tabs={TAB_DEFS} activeTab={activeTab} onTabClick={handleTabClick} />
        </nav>

        {/* Mobile */}
        <div className="help-mobile">
          <div className="help-mobile-header">
            <button onClick={() => setMenuOpen(!menuOpen)}>
              {menuOpen ? '✕' : '☰'}
            </button>
            <p>{t(current.labelKey)}</p>
          </div>

          {menuOpen && (
            <nav className="help-mobile-nav">
              <NavItems tabs={TAB_DEFS} activeTab={activeTab} onTabClick={handleTabClick} />
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

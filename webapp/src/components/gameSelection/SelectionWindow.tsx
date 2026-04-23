import React from 'react';
import { useTranslation } from 'react-i18next';
import TopLeftHeader from '../topLeftHeader/TopLeftHeader';
import TopRightMenu from '../topRightMenu/TopRightMenu';
import SelectionPanel from './selectionPanel/SelectionPanel';
import styles from './SelectionWindow.module.css';

const SelectionWindow: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className={styles.selectionWindowContainer}>
      <div className={styles.topLeftCorner}>
        <TopLeftHeader />
      </div>

      <div className={styles.topRightCorner}>
        <TopRightMenu />
      </div>

      <header className={styles.mainTitle}>
        <h2>{t('gameSelection.title')}</h2>
      </header>

      <main className={styles.selectionPanelWrapper}>
        <SelectionPanel />
      </main>
    </div>
  );
};

export default SelectionWindow;

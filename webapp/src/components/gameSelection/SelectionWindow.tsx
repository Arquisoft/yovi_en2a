import React from 'react';
import TopLeftHeader from '../topLeftHeader/TopLeftHeader'; 
import TopRightMenu from '../topRightMenu/TopRightMenu';
import SelectionPanel from './selectionPanel/SelectionPanel';
import styles from './SelectionWindow.module.css';

const SelectionWindow: React.FC = () => {
  return (
    <div className={styles.selectionWindowContainer}>
      {/* 1. Branding (Top Left) */}
      <div className={styles.topLeftCorner}>
        <TopLeftHeader />
      </div>

      {/* 2. Utility Menu (Top Right) */}
      <div className={styles.topRightCorner}>
        <TopRightMenu />
      </div>

      {/* 3. Title Section */}
      <header className={styles.mainTitle}>
        <h2>SELECT YOUR GAME MODE</h2>
      </header>

      {/* 4. Container Section */}
      <main className={styles.selectionPanelWrapper}>
        <SelectionPanel />
      </main>
    </div>
  );
};

export default SelectionWindow;
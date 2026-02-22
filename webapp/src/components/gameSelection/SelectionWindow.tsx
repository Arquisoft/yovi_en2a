import React from 'react';
import TopRightMenu from '../topRightMenu/TopRightMenu';
import SelectionPanel from './selectionPanel/SelectionPanel';
import styles from './SelectionWindow.module.css';

const SelectionWindow: React.FC = () => {
  return (
    <div className={styles.selectionWindowContainer}>
      {/* 1. Utility Menu (Top Right) */}
      <div className={styles.topRightCorner}>
        <TopRightMenu />
      </div>

      {/* 2. Title Section */}
      <header className={styles.mainTitle}>
        <h2>SELECT YOUR GAME MODE</h2>
      </header>

      {/* 3. Container Section */}
      <main className={styles.selectionPanelWrapper}>
        <SelectionPanel />
      </main>
    </div>
  );
};

export default SelectionWindow;
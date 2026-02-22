import TopRightMenu from '../topRightMenu/TopRightMenu';
import SelectionPanel from './selectionPanel/SelectionPanel'
import styles from './SelectionWindow.module.css';

const SelectionWindow = () => {
  return (
    <div className={styles.selectionWindowContainer}>
      {/* Absolute positioned corner menu */}
      <div className={styles.topRightCorner}>
        <TopRightMenu />
      </div>

      {/* Title section */}
      <div className={styles.mainTitle}>
        <h2>SELECT YOUR GAME MODE</h2>
      </div>

      {/* Selection panel content */}
      <div className={styles.selectionPanelWrapper}>
        <SelectionPanel />
      </div>
    </div>
  );
};

export default SelectionWindow;
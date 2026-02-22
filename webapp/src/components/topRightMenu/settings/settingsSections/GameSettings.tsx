import styles from './SettingsSection.module.css';
import type { SettingsSection } from "./SettingsStrategy";

export class GameSettings implements SettingsSection {
  id = 'game';
  label = 'Game';

  render() {
    return (
      <div className={styles.tabPanel}>
        <h3>Game Preferences</h3>
        
        {/* Added the styles.controlGroup class */}
        <div className={`${styles.controlGroup} ${styles.checkbox}`}>
          <label htmlFor="show-hints">Show move hints</label>
          <input id="show-hints" type="checkbox" defaultChecked />
        </div>

        <div className={`${styles.controlGroup} ${styles.checkbox}`}>
          <label htmlFor="confirm-moves">Confirm moves</label>
          <input id="confirm-moves" type="checkbox" />
        </div>
      </div>
    );
  }
}
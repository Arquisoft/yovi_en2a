<<<<<<< HEAD
import styles from './SettingsSection.module.css';
=======
import './SettingsSection.css'
>>>>>>> feature/gameWindow
import type { SettingsSection } from "./SettingsStrategy";

export class GameSettings implements SettingsSection {
  id = 'game';
  label = 'Game';
<<<<<<< HEAD

  render() {
    return (
      <div className={styles.tabPanel}>
        <h3>Game Preferences</h3>
        
        {/* Added the styles.controlGroup class */}
        <div className={`${styles.controlGroup} ${styles.checkbox}`}>
=======
  render() {
    return (
      <div className="tab-panel">
        <h3>Game Preferences</h3>
        <div className="control-group checkbox">
>>>>>>> feature/gameWindow
          <label htmlFor="show-hints">Show move hints</label>
          <input id="show-hints" type="checkbox" defaultChecked />
        </div>

<<<<<<< HEAD
        <div className={`${styles.controlGroup} ${styles.checkbox}`}>
=======
        <div className="control-group checkbox">
>>>>>>> feature/gameWindow
          <label htmlFor="confirm-moves">Confirm moves</label>
          <input id="confirm-moves" type="checkbox" />
        </div>
      </div>
    );
  }
}
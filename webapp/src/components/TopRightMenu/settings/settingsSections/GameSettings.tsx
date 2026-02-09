import './SettingsSection.css'
import type { SettingsSection } from "./SettingsStrategy";

export class GameSettings implements SettingsSection {
  id = 'game';
  label = 'Game';
  render() {
    return (
      <div className="tab-panel">
        <h3>Game Preferences</h3>
        <div className="control-group checkbox">
          <label>Show move hints</label>
          <input type="checkbox" defaultChecked />
        </div>
        <div className="control-group checkbox">
          <label>Confirm moves</label>
          <input type="checkbox" />
        </div>
      </div>
    );
  }
}
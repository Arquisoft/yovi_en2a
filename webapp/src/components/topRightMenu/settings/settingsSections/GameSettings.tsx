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
          <label htmlFor="show-hints">Show move hints</label>
          <input id="show-hints" type="checkbox" defaultChecked />
        </div>

        <div className="control-group checkbox">
          <label htmlFor="confirm-moves">Confirm moves</label>
          <input id="confirm-moves" type="checkbox" />
        </div>
      </div>
    );
  }
}
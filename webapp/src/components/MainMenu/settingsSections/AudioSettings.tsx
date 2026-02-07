import './SettingsSection.css'
import type { SettingsSection } from "./SettingsStrategy";

export class AudioSettings implements SettingsSection {
  id = 'audio';
  label = 'Audio';
  render() {
    return (
      <div className="tab-panel">
        <h3>Sound Settings</h3>
        <div className="control-group">
          <label>Master Volume</label>
          <input type="range" min="0" max="100" defaultValue="80" />
        </div>
        <div className="control-group">
          <label>Music Volume</label>
          <input type="range" min="0" max="100" defaultValue="50" />
        </div>
      </div>
    );
  }
}   
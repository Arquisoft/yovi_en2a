import './SettingsSection.css'
import type { SettingsSection } from "./SettingsStrategy";

export class AccountSettings implements SettingsSection {
  id = 'account';
  label = 'Account';
  render() {
    return (
      <div className="tab-panel">
        <h3>Profile Management</h3>
        <div className="account-info">
          <p>Logged in as: <strong>Guest</strong></p>
        </div>
        <button className="danger-btn">Log Out</button>
      </div>
    );
  }
}
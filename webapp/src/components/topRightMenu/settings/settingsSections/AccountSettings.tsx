import baseStyles from './SettingsSection.module.css';
import accountStyles from './AccountSettings.module.css';
import type { SettingsSection } from "./SettingsStrategy";

export class AccountSettings implements SettingsSection {
  id = 'account';
  label = 'Account';
  render() {
    return (
      <div className={baseStyles.tabPanel}>
        <h3>Profile Management</h3>
        <div className={accountStyles.accountInfo}>
          <p>Logged in as: <strong>Guest</strong></p>
        </div>
        <button className={accountStyles.dangerBtn}>Log Out</button>
      </div>
    );
  }
}
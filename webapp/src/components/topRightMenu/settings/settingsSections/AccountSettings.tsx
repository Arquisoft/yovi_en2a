import styles from './SettingsSection.module.css';
import accountStyles from './AccountSettings.module.css';
import type { SettingsSection } from "./SettingsStrategy";
import { ClearUserCookie } from '../../../../utils/CookieRetriever';

export class AccountSettings implements SettingsSection {
  id = 'account';
  label = 'Account';

  private readonly isLoggedIn: boolean;
  private readonly username: string;
  private readonly navigate: (path: string) => void;

  constructor(isLoggedIn: boolean, username: string, navigate: (path: string) => void) {
    this.isLoggedIn = isLoggedIn;
    this.username = username;
    this.navigate = navigate;
  }

  render() {
    if (!this.isLoggedIn) {
      return (
        <div className={styles.tabPanel}>
          <h3>Profile Management</h3>
          
          <div className={styles.controlGroup}>
            <span className={styles.labelLike}>Account Status</span>
            <span style={{ color: '#aaa' }}>Guest (Not logged in)</span>
          </div>

          <div className={styles.controlGroup}>
            <span className={styles.labelLike}>Cloud Saving</span>
            <span style={{ fontSize: '0.85rem', color: '#888', textAlign: 'right', maxWidth: '60%' }}>
              Log in to save your game records and appear in the leaderboards.
            </span>
          </div>
          
          <div className={styles.controlGroup}>
            <label htmlFor="auth-button">Authentication</label>
            <button 
              id="auth-button"
              className={accountStyles.primaryBtn}
              onClick={() => this.navigate("/login")}
            >
              Log in
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className={styles.tabPanel}>
        <h3>Profile Management</h3>
        
        <div className={styles.controlGroup}>
          <span className={styles.labelLike}>Logged in as</span>
          <span style={{ color: 'white', fontWeight: 'bold' }}>{this.username}</span>
        </div>
        
        <div className={styles.controlGroup}>
          <label htmlFor="logout-button">Session</label>
          <button 
            id="logout-button"
            className={accountStyles.dangerBtn}
            onClick={() => {
              ClearUserCookie();
              this.navigate("/");
            }}
          >
            Log Out
          </button>
        </div>
      </div>
    );
  }
}
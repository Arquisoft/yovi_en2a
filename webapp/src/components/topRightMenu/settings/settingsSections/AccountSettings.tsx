import baseStyles from './SettingsSection.module.css';
import accountStyles from './AccountSettings.module.css';
import type { SettingsSection } from "./SettingsStrategy";

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
    // STATE 1: User NOT logged in (Guest)
    if (!this.isLoggedIn) {
      return (
        <div className={baseStyles.tabPanel}>
          <h3>Profile Management</h3>
          <div className={accountStyles.accountInfo}>
            <p>You are not logged in yet</p>
          </div>
          <button 
            // Using primaryBtn (if defined) or dangerBtn as a fallback for the login button
            className={accountStyles.primaryBtn || accountStyles.dangerBtn} 
            onClick={() => {
              // Navigate to the login route
              this.navigate("/login"); 
            }}
          >
            Log in
          </button>
        </div>
      );
    }

    // STATE 2: User is logged in
    return (
      <div className={baseStyles.tabPanel}>
        <h3>Profile Management</h3>
        <div className={accountStyles.accountInfo}>
          <p>Logged in as: <strong>{this.username}</strong></p>
        </div>
        <button 
          className={accountStyles.dangerBtn}
          onClick={() => {
            // Delete the cookie by setting an expiration date in the past (max-age=0)
            document.cookie = "user=; path=/; max-age=0; SameSite=Lax;";
            
            // Navigate back to the Home page
            this.navigate("/"); 
          }}
        >
          Log Out
        </button>
      </div>
    );
  }
}
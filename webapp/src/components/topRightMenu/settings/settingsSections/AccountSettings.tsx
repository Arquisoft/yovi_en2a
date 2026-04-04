import accountStyles from './AccountSettings.module.css';
import type { SettingsSection } from "./SettingsStrategy";

export class AccountSettings implements SettingsSection {
  id = 'account';
  label = 'Account';

  private readonly isLoggedIn: boolean;
  private readonly username: string;
  private readonly navigate: (path: string) => void;
  private readonly logout: () => Promise<void>;

  constructor(
    isLoggedIn: boolean,
    username: string,
    navigate: (path: string) => void,
    logout: () => Promise<void>
  ) {
    this.isLoggedIn = isLoggedIn;
    this.username = username;
    this.navigate = navigate;
    this.logout = logout;
  }

  render() {
    if (!this.isLoggedIn) {
      return (
        <div className={accountStyles.accountPanel}>
          <div className={accountStyles.profileCard}>
            <div className={accountStyles.avatarGuest}>?</div>
            <div className={accountStyles.profileInfo}>
              <span className={accountStyles.profileName}>Guest</span>
              <span className={accountStyles.profileStatus}>Not logged in</span>
            </div>
          </div>

          <p className={accountStyles.hint}>
            Log in to save your match history and appear in global rankings.
          </p>

          <button
            className={accountStyles.primaryBtn}
            onClick={() => this.navigate('/login')}
          >
            Log In
          </button>
        </div>
      );
    }

    const initial = this.username?.[0]?.toUpperCase() ?? '?';

    return (
      <div className={accountStyles.accountPanel}>
        <div className={accountStyles.profileCard}>
          <div className={accountStyles.avatar}>{initial}</div>
          <div className={accountStyles.profileInfo}>
            <span className={accountStyles.profileName}>{this.username}</span>
            <span className={accountStyles.profileBadge}>● Active session</span>
          </div>
        </div>

        <button
          className={accountStyles.dangerBtn}
          onClick={async () => {
            this.navigate('/');
            await this.logout();
          }}
        >
          Log Out
        </button>
      </div>
    );
  }
}

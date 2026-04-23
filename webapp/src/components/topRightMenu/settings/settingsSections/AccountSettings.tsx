import type { SettingsSection } from "./SettingsStrategy";
import AccountSettingsPanel from "./AccountSettingsPanel";

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
    return (
      <AccountSettingsPanel
        isLoggedIn={this.isLoggedIn}
        username={this.username}
        navigate={this.navigate}
        logout={this.logout}
      />
    );
  }
}

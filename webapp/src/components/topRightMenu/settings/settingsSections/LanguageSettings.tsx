import type { SettingsSection } from './SettingsStrategy';
import LanguageSettingsPanel from './LanguageSettingsPanel';

export class LanguageSettings implements SettingsSection {
  id = 'language';
  label = 'Language';

  render() {
    return <LanguageSettingsPanel />;
  }
}

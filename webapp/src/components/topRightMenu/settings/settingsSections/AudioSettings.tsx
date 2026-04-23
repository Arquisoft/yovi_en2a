import type { SettingsSection } from "./SettingsStrategy";
import AudioSettingsPanel from "./AudioSettingsPanel";

export class AudioSettings implements SettingsSection {
  id = 'audio';
  label = 'Audio';

  render() {
    return <AudioSettingsPanel />;
  }
}

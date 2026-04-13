import React, { useState } from 'react';
import baseStyles from './SettingsSection.module.css';
import audioStyles from './AudioSettings.module.css';
import type { SettingsSection } from "./SettingsStrategy";
import { useAudio } from '../../../../contexts/AudioContext';

const VolumeSlider: React.FC<{ label: string; value: number; onChange: (v: number) => void }> = ({ label, value, onChange }) => {
  const [isActive, setIsActive] = useState(false);

  return (
    <div className={baseStyles.controlGroup}>
      <div className={audioStyles.labelRow}>
        <label>{label}</label>
      </div>

      <div className={audioStyles.sliderContainer}>
        <input
          type="range"
          min="0"
          max="100"
          value={value}
          className={audioStyles.volumeRange}
          onInput={(e) => onChange(Number.parseInt(e.currentTarget.value))}
          onMouseDown={() => setIsActive(true)}
          onMouseUp={() => setIsActive(false)}
          onTouchStart={() => setIsActive(true)}
          onTouchEnd={() => setIsActive(false)}
          style={{
            background: `linear-gradient(to right, var(--primary-color) ${value}%, rgba(255, 255, 255, 0.1) ${value}%)`
          }}
        />
        <div
          className={`${audioStyles.volumeTooltip} ${isActive ? audioStyles.visible : ''}`}
          style={{ left: `${value}%` }}
        >
          {value}
        </div>
      </div>
    </div>
  );
};

const AudioSettingsPanel: React.FC = () => {
  const { masterVolume, musicVolume, setMasterVolume, setMusicVolume } = useAudio();

  return (
    <div className={baseStyles.tabPanel}>
      <h3>Sound Settings</h3>
      <VolumeSlider label="Master Volume" value={masterVolume} onChange={setMasterVolume} />
      <VolumeSlider label="Music Volume"  value={musicVolume}  onChange={setMusicVolume}  />
    </div>
  );
};

export class AudioSettings implements SettingsSection {
  id = 'audio';
  label = 'Audio';

  render() {
    return <AudioSettingsPanel />;
  }
}

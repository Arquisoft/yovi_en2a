import React, { useState } from 'react';
import baseStyles from './SettingsSection.module.css';
import audioStyles from './AudioSettings.module.css';
import type { SettingsSection } from "./SettingsStrategy";

const VolumeSlider: React.FC<{ label: string; defaultValue: number }> = ({ label, defaultValue }) => {
  const [value, setValue] = useState(defaultValue);
  const [isActive, setIsActive] = useState(false);

  return (
    <div className={baseStyles.controlGroup}>
      <div className={audioStyles.labelRow}>
        {/* The base module handles the generic label styling */}
        <label>{label}</label>
      </div>
      
      <div className={audioStyles.sliderContainer}>
        <input 
          type="range" 
          min="0" 
          max="100" 
          value={value}
          className={audioStyles.volumeRange}
          onInput={(e) => setValue(Number.parseInt(e.currentTarget.value))}
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

export class AudioSettings implements SettingsSection {
  id = 'audio';
  label = 'Audio';
  
  render() {
    return (
      <div className={baseStyles.tabPanel}>
        <h3>Sound Settings</h3>
        <VolumeSlider label="Master Volume" defaultValue={80} />
        <VolumeSlider label="Music Volume" defaultValue={50} />
      </div>
    );
  }
}
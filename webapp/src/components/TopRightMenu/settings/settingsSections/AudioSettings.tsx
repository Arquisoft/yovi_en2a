import  { useState } from 'react';
import './SettingsSection.css';
import type { SettingsSection } from "./SettingsStrategy";

const VolumeSlider: React.FC<{ label: string; defaultValue: number }> = ({ label, defaultValue }) => {
  const [value, setValue] = useState(defaultValue);
  const [isActive, setIsActive] = useState(false);

  return (
    <div className="control-group">
      <div className="label-row">
        <label>{label}</label>
      </div>
      
      <div className="slider-container">
        <input 
          type="range" 
          min="0" 
          max="100" 
          value={value}
          className="volume-range"
          onInput={(e) => setValue(parseInt(e.currentTarget.value))}
          onMouseDown={() => setIsActive(true)}
          onMouseUp={() => setIsActive(false)}
          onTouchStart={() => setIsActive(true)}
          onTouchEnd={() => setIsActive(false)}
          style={{
            // Dynamic track fill
            background: `linear-gradient(to right, var(--primary-color) ${value}%, rgba(255, 255, 255, 0.1) ${value}%)`
          }}
        />
        
        {/* The Tooltip */}
        <div 
          className={`volume-tooltip ${isActive ? 'visible' : ''}`}
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
      <div className="tab-panel">
        <h3>Sound Settings</h3>
        <VolumeSlider label="Master Volume" defaultValue={80} />
        <VolumeSlider label="Music Volume" defaultValue={50} />
      </div>
    );
  }
}
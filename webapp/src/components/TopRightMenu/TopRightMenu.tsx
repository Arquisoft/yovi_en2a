import './TopRightMenu.css'
import '../../styles/layout/TopRightMenuLayout.css'
import React, { useState } from 'react';
import MenuButtons from '../MainMenu/MenuButtons';
import helpIcon from '../../assets/help_icon.svg';
import rankingIcon from '../../assets/ranking_icon.svg';
import volumeUnmuteIcon from '../../assets/volume_unmute_icon.svg';
import volumeMuteIcon from '../../assets/volume_mute_icon.svg';
import configIcon from '../../assets/settings_icon.svg';
import userIcon from '../../assets/user_icon.svg';

// Component imports
import SettingsMenu from './settings/Settings.tsx';
import Ranking from './ranking/Ranking.tsx';

/** * Defines the possible active menu states. 
 * Using a Union Type ensures type safety and prevents typos.
 */
type MenuType = 'settings' | 'rankings' | 'help' | 'user' | null;

const TopRightMenu: React.FC = () => {
  // Sound state: separate from menu visibility as it's a toggle logic
  const [isMuted, setIsMuted] = useState(false);
  
  /** * Single state to manage UI modal visibility.
   * This prevents multiple overlays from stacking and optimizes memory.
   */
  const [activeMenu, setActiveMenu] = useState<MenuType>(null);

  /**
   * Toggles the global volume state.
   */
  const handleVolumeClick = () => {
    setIsMuted(!isMuted);
    // Logic for actual sound engine control should be triggered here
  };

  /**
   * Universal close handler to reset the active menu.
   */
  const closeMenu = () => setActiveMenu(null);

  return (
    <div className='top-right-menu'>
      {/* Navigation section */}
      <MenuButtons
        label="Help"
        onClick={() => setActiveMenu('help')}
        img={helpIcon}
      />
      
      <MenuButtons
        label="Rankings"
        onClick={() => setActiveMenu('rankings')}
        img={rankingIcon}
      />
      
      <MenuButtons
        label="Volume"
        onClick={handleVolumeClick}
        img={isMuted ? volumeMuteIcon : volumeUnmuteIcon}
      />
      
      <MenuButtons
        label="Settings"
        onClick={() => setActiveMenu('settings')}
        img={configIcon}
      />

      <MenuButtons
        label="User"
        onClick={() => setActiveMenu('user')}
        img={userIcon}
      />

      {/* --- MODAL RENDERING LOGIC --- */}
      {activeMenu === 'settings' && (
        <SettingsMenu onClose={closeMenu} />
      )}

      {activeMenu === 'rankings' && (
        <Ranking onClose={closeMenu} />
      )}

    </div>
  );
};

export default TopRightMenu;
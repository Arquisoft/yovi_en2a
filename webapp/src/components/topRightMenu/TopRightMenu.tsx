import React, { useState } from 'react';
// 1. Import the module styles
import styles from './TopRightMenu.module.css';
// Keep global layout styles if they aren't modules yet
import '../../styles/layout/TopRightMenuLayout.css';

import MenuButtons from '../generalComponents/MenuButtons.tsx';
import helpIcon from '../../assets/help_icon.svg';
import rankingIcon from '../../assets/ranking_icon.svg';
import volumeUnmuteIcon from '../../assets/volume_unmute_icon.svg';
import volumeMuteIcon from '../../assets/volume_mute_icon.svg';
import configIcon from '../../assets/settings_icon.svg';
import userIcon from '../../assets/user_icon.svg';

import SettingsMenu from './settings/Settings.tsx';
import Ranking from './ranking/Ranking.tsx';

type MenuType = 'settings' | 'rankings' | 'help' | 'user' | null;

const TopRightMenu: React.FC = () => {
  const [isMuted, setIsMuted] = useState(false);
  const [activeMenu, setActiveMenu] = useState<MenuType>(null);

  const handleVolumeClick = () => {
    setIsMuted(!isMuted);
  };

  const closeMenu = () => setActiveMenu(null);

  return (
    // 2. Apply the module class
    <div className={styles.topRightMenu}>
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
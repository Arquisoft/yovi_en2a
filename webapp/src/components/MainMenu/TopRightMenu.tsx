import './TopRightMenu.css'
import React, { useState } from 'react';
import MenuButtons from './MenuButtons';
import helpIcon from '../../assets/help_icon.svg';
import rankingIcon from '../../assets/ranking_icon.svg';
import volumeUnmuteIcon from '../../assets/volume_unmute_icon.svg';
import volumeMuteIcon from '../../assets/volume_mute_icon.svg';
import configIcon from '../../assets/settings_icon.svg';
import userIcon from '../../assets/user_icon.svg';
import SettingsMenu from './Settings';

interface TopRightMenuProps {}

const TopRightMenu: React.FC<TopRightMenuProps> = () => {
  const [isMuted, setIsMuted] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleVolumeClick = () => {
    setIsMuted(!isMuted);
    console.log(isMuted ? 'Sound Unmuted' : 'Sound Muted');
  };

  return (
    <div className='top-right-menu'>
      <MenuButtons
        label="Help"
        onClick={() => console.log('Help clicked')}
        img={helpIcon}
      />
      <MenuButtons
        label="Rankings"
        onClick={() => console.log('Rankings clicked')}
        img={rankingIcon}
      />
      <MenuButtons
        label="Volume"
        onClick={handleVolumeClick}
        img={isMuted ? volumeMuteIcon : volumeUnmuteIcon}
      />
      <MenuButtons
        label="Settings"
        onClick={() => setIsSettingsOpen(true)}
        img={configIcon}
      />

      {isSettingsOpen && (
        <SettingsMenu onClose={() => setIsSettingsOpen(false)} />
      )}
      
      <MenuButtons
        label="User"
        onClick={() => console.log('User clicked')}
        img={userIcon}
      />
    </div>
  );
};

export default TopRightMenu;
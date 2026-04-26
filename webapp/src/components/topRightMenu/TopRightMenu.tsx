import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './TopRightMenu.module.css';
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
import UserMenu from './user/UserMenu.tsx';
import HelpMenu from './help/HelpMenu';
import { useAudio } from '../../contexts/AudioContext';

type MenuType = 'settings' | 'rankings' | 'help' | 'user' | null;

const TopRightMenu: React.FC = () => {
  const { t } = useTranslation();
  const { isMuted, toggleMute } = useAudio();
  const [activeMenu, setActiveMenu] = useState<MenuType>(null);

  const closeMenu = () => setActiveMenu(null);

  return (
    <div className={styles.topRightMenu}>
      <MenuButtons
        label={t('topRightMenu.help')}
        onClick={() => setActiveMenu('help')}
        img={helpIcon}
      />

      <MenuButtons
        label={t('topRightMenu.rankings')}
        onClick={() => setActiveMenu('rankings')}
        img={rankingIcon}
      />

      <MenuButtons
        label={isMuted ? t('topRightMenu.unmute') : t('topRightMenu.mute')}
        onClick={toggleMute}
        img={isMuted ? volumeMuteIcon : volumeUnmuteIcon}
      />

      <MenuButtons
        label={t('topRightMenu.settings')}
        onClick={() => setActiveMenu('settings')}
        img={configIcon}
      />

      <MenuButtons
        label={t('topRightMenu.user')}
        onClick={() => setActiveMenu('user')}
        img={userIcon}
      />

      {activeMenu === 'settings' && (
        <SettingsMenu onClose={closeMenu} />
      )}

      {activeMenu === 'rankings' && (
        <Ranking onClose={closeMenu} />
      )}

      {activeMenu === 'user' && (
        <UserMenu onClose={closeMenu} />
      )}

      {activeMenu === 'help' && (
        <HelpMenu onClose={closeMenu} />
      )}
    </div>
  );
};

export default TopRightMenu;

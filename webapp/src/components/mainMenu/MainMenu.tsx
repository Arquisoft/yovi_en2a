import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import MenuButtons from '../generalComponents/MenuButtons';
import TopRightMenu from '../topRightMenu/TopRightMenu';
import styles from './MainMenu.module.css';

const MainMenu = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className={styles.mainMenu}>
      <TopRightMenu/>

      <div className={styles.mainTitle}>
        <h2>GAMEY</h2>
        <p className={styles.subtitle}>{t('mainMenu.subtitle')}</p>
      </div>

      <div className={styles.mainMenuButtons}>
        <MenuButtons
          label={t('mainMenu.logIn')}
          onClick={() => navigate("/login")}
        />
        <MenuButtons
          label={t('mainMenu.playAsGuest')}
          onClick={() => navigate("/gameSelection", { state: { guest: true } })}
        />
      </div>
    </div>
  );
};

export default MainMenu;

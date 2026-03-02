  import { useNavigate } from 'react-router-dom';
  import MenuButtons from '../generalComponents/MenuButtons';
  import TopRightMenu from '../topRightMenu/TopRightMenu';
  // 1. Import the styles object
  import styles from './MainMenu.module.css';

  const MainMenu = () => {
    const navigate = useNavigate();

    return (
      <div className={styles.mainMenu}>
        {/* Right most section*/}
        <TopRightMenu/>

        {/* Title and Subtitle */}
        <div className={styles.mainTitle}>
          <h2>GAMEY</h2>
          <p className={styles.subtitle}>Three sides, one goal</p>
        </div>

        {/* Principal action buttons */}
        <div className={styles.mainMenuButtons}>
          <MenuButtons 
            label="Log In" 
            onClick={() => console.log('Log In')} 
          />
          <MenuButtons 
            label="Play as Guest" 
            onClick={() => navigate("/gameSelection")} 
          />
        </div>
      </div>
    );
  };

  export default MainMenu;
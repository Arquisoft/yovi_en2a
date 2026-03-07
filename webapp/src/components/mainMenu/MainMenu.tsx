<<<<<<< HEAD
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
            onClick={() => navigate("/login")} 
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
=======
// MainMenu.tsx
import './MainMenu.css'
import MenuButtons from '../generalComponents/MenuButtons';
import TopRightMenu from '../topRightMenu/TopRightMenu';

const MainMenu = () => {
  return (
    <div className="main-menu">
      {/* Right most section*/}
      <TopRightMenu/>

      {/* Title and Subtitle */}
      <div className="main-title">
        <h2>GAMEY</h2>
        <p className="subtitle">Three sides, one goal</p>
      </div>

      {/* Principal action buttons */}
      <div className="main-menu-buttons">
        <MenuButtons 
          label="Log In" 
          onClick={() => console.log('Log In')} 
        />
        <MenuButtons 
          label="Play as Guest" 
          onClick={() => console.log('Play as Guest')} 
        />
      </div>
    </div>
  );
};

export default MainMenu;
>>>>>>> feature/gameWindow

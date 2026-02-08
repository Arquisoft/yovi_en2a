// MainMenu.tsx
import './MainMenu.css'
import MenuButtons from './MenuButtons';
import TopRightMenu from '../TopRightMenu/TopRightMenu';

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
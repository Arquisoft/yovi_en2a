// MainMenu.tsx
import MenuButtons from './MenuButtons';

const MainMenu = () => {
  return (
    <div className="main-menu">
      <MenuButtons label="Log In" onClick={() => console.log('Log In')} />
      <MenuButtons label="Play as a Guest" onClick={() => console.log('Play as a Guest')} />
    </div>
  );
};

export default MainMenu;

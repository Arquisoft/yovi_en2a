<<<<<<< HEAD
import React from 'react';
import styles from './MenuButtons.module.css';
=======
import './MenuButtons.css'
import React from 'react';
>>>>>>> feature/gameWindow

interface MenuButtonsProps { 
  label: string;
  onClick: () => void;
  disabled?: boolean;
  img?: string | null;
}

<<<<<<< HEAD
const MenuButtons: React.FC<MenuButtonsProps> = ({ label, onClick, disabled, img }) => {
  return (
    <button
      // We add a 'static' class name along with the module class
      // This allows the parent CSS to target 'mainMenuOption' reliably
      className={`${styles.mainMenuOption} mainMenuOption`} 
=======
const MenuButtons: React.FC<MenuButtonsProps> = ({
  label,
  onClick,
  disabled = false,
  img = null
}) => {
  return (
    <button
      className="main-menu-option"
>>>>>>> feature/gameWindow
      onClick={onClick}
      disabled={disabled}
      name={label}
    >
      {img ? (
<<<<<<< HEAD
        <img src={img} alt={label} className={`${styles.menuButtonImage} menuButtonImage`} />
      ) : label}
=======
        <img src={img} alt={label} className="menu-button-image" />
      ) : (
        label
      )}
>>>>>>> feature/gameWindow
    </button>
  );
};

export default MenuButtons;
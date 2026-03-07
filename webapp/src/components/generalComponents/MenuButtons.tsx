import React from 'react';
import styles from './MenuButtons.module.css';

interface MenuButtonsProps { 
  label: string;
  onClick: () => void;
  disabled?: boolean;
  img?: string | null;
}

const MenuButtons: React.FC<MenuButtonsProps> = ({ label, onClick, disabled, img }) => {
  return (
    <button
      // We add a 'static' class name along with the module class
      // This allows the parent CSS to target 'mainMenuOption' reliably
      className={`${styles.mainMenuOption} mainMenuOption`} 
      onClick={onClick}
      disabled={disabled}
      name={label}
    >
      {img ? (
        <img src={img} alt={label} className={`${styles.menuButtonImage} menuButtonImage`} />
      ) : label}
    </button>
  );
};

export default MenuButtons;
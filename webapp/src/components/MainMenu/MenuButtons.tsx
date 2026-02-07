import './MenuButtons.css'
import React from 'react';

interface MenuButtonsProps { 
  label: string;
  onClick: () => void;
  disabled?: boolean;
  img?: string | null;
}

const MenuButtons: React.FC<MenuButtonsProps> = ({
  label,
  onClick,
  disabled = false,
  img = null
}) => {
  return (
    <button
      className="main-menu-option"
      onClick={onClick}
      disabled={disabled}
      name={label}
    >
      {img ? (
        <img src={img} alt={label} className="menu-button-image" />
      ) : (
        label
      )}
    </button>
  );
};

export default MenuButtons;
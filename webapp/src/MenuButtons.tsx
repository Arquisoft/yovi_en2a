import React from 'react';

interface MainMenuOptionProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  img?: string | null; // Nuevo parámetro opcional
}

const MainMenuOption: React.FC<MainMenuOptionProps> = ({
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
    >
      {img ? (
        <img src={img} alt={label} className="menu-button-image" />
      ) : (
        label
      )}
    </button>
  );
};

export default MainMenuOption;

import "./HexButton.css";

type Props = {
  onClick?: () => void;
  isDisabled?: boolean;
  // Cambiamos el tipo para aceptar la nueva notación YEN
  owner?: string | null; 
};

export default function HexButton({ onClick, isDisabled, owner }: Readonly<Props>) {
  // Actualizamos la lógica para mapear "B" y "R" a tus clases CSS existentes
  const ownerClass = 
    owner === "B" ? "hex--player1" : 
    owner === "R" ? "hex--player2" : 
    "hex--empty";
    
  return (
    <button
      type="button"
      className={`hex ${ownerClass}`}
      onClick={onClick}
      disabled={isDisabled}
    >
    </button>
  );
}
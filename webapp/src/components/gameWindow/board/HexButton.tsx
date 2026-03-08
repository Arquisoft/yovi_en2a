import "./HexButton.css";

type Props = {
  onClick?: () => void;
  isDisabled?: boolean;
  // HexButton contains an owner to determine the color of the button
  owner?: 0 | 1 | null;
};

export default function HexButton({ onClick, isDisabled, owner }: Props) {
  const ownerClass = 
    owner === 0 ? "hex--player1" : 
    owner === 1 ? "hex--player2" : 
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
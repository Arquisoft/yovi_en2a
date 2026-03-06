import "./HexButton.css";

type Props = {
  onClick?: () => void;
  isDisabled?: boolean;
  owner?: 1 | 2 | null;

};


export default function HexButton({ onClick, isDisabled, owner }: Props) {
  const ownerClass = 
    owner === 1 ? "hex--player1" : 
    owner === 2 ? "hex--player2" : 
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
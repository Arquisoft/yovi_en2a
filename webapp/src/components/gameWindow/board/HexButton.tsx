import "./HexButton.css";

type Props = {
  onClick?: () => void;
  isDisabled?: boolean;
  owner?: 0 | 1 | null;
  isHole?: boolean;
  isTabuBlocked?: boolean;
};

export default function HexButton({ onClick, isDisabled, owner, isHole, isTabuBlocked }: Readonly<Props>) {
  let ownerClass = "hex--empty";
  if (owner === 0) ownerClass = "hex--player1";
  else if (owner === 1) ownerClass = "hex--player2";
  else if (isHole) ownerClass = "hex--hole";
  else if (isTabuBlocked) ownerClass = "hex--tabu-blocked";

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
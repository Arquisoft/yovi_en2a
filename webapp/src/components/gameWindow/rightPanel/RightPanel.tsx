import "./RightPanel.css";
import { useUser } from "../../../contexts/UserContext";

type Props = {
  turn: 1 | 2;
  time?: string;
  mode: string | undefined;
};

export default function RightPanel({ turn, time = "00:00", mode }: Readonly<Props>) {
  const { user } = useUser();
  const isP1 = turn === 1;

  const Player = ({ name, isBlue, isActive, meta }: { name: string; isBlue: boolean; isActive: boolean; meta: string }) => (
    <div className={`rightpanel-player ${isActive ? "active" : ""}`}>
    <div className="rightpanel-left">
      <span className={`dot ${isBlue ? "blue" : "red"}`} />
      <div>
        <div className="rightpanel-name">{name}</div>
        <div className="rightpanel-meta">{meta}</div>
      </div>
    </div>
    <span className="rightpanel-chip">{isActive ? "YOUR TURN" : "WAITING"}</span>
  </div>
  );

  return (
    <div className="rightpanel">
      <section className="rightpanel-card">
        <h4 className="rightpanel-title">Timer</h4>
        <div className="rightpanel-time">{time}</div>
      </section>

      <section className="rightpanel-card">
        <h4 className="rightpanel-title">Players</h4>
        <Player name={user?.username ?? "Player 1"} isBlue isActive={isP1} meta="Human" />
        <Player name="Player 2" isBlue={false} isActive={!isP1} meta={mode === "bot" ? "Bot" : "Human"} />
      </section>
    </div>
  );
}
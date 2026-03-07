import "./RightPanel.css";

type Props = {
  // 1. Cambiamos el tipo de 'turn' a string (ahora será "B" o "R")
  turn: string; 
  time?: string;
  onUndo: () => void;
  onEndTurn: () => void;
  onReset: () => void;
  canUndo: boolean;
  canEndTurn: boolean;
};

export default function RightPanel({
  turn,
  time = "00:00",
  onUndo,
  onEndTurn,
  onReset,
  canUndo,
  canEndTurn,
}: Readonly<Props>) {
  
  const isP1 = turn === "B";
  const isP2 = turn === "R";

  return (
    <div className="rightpanel">
      {/* Card Timer */}
      <section className="rightpanel-card">
        <h4 className="rightpanel-title">Timer</h4>

        <div className="rightpanel-timer">
          <div className="rightpanel-time">{time}</div>
        </div>
      </section>

      {/* Card Players */}
      <section className="rightpanel-card">
        <h4 className="rightpanel-title">Players</h4>

        {/* Player 1 (Blue - "B") */}
        <div className={`rightpanel-player ${isP1 ? "active" : ""}`}>
          <div className="rightpanel-left">
            <span className="dot blue" />
            <div>
              <div className="rightpanel-name">Player 1</div>
              <div className="rightpanel-meta">Human</div>
            </div>
          </div>
          <span className="rightpanel-chip">{isP1 ? "YOUR TURN" : "WAITING"}</span>
        </div>

        {/* Player 2 (Red - "R") */}
        <div className={`rightpanel-player ${isP2 ? "active" : ""}`}>
          <div className="rightpanel-left">
            <span className="dot red" />
            <div>
              <div className="rightpanel-name">Player 2</div>
              <div className="rightpanel-meta">Bot</div>
            </div>
          </div>
          <span className="rightpanel-chip">{isP2 ? "YOUR TURN" : "WAITING"}</span>
        </div>
      </section>

      {/* Card Actions */}
      <section className="rightpanel-card">
        <h4 className="rightpanel-title">Actions</h4>

        <div className="rightpanel-actions">
          <button
            className="rightpanel-btn primary"
            onClick={onUndo}
            disabled={!canUndo}
          >
            Undo
          </button>

          <button
            className="rightpanel-btn"
            onClick={onEndTurn}
            disabled={!canEndTurn}
          >
            End Turn
          </button>

          <button
            className="rightpanel-btn danger"
            onClick={onReset}
          >
            Reset
          </button>
        </div>
      </section>
    </div>
  );
}
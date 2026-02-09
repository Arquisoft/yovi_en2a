import React from "react";
import "./EndGame.css";
import type { GameResult } from "./types";


type Props = {
  result: GameResult;
};

function formatDuration(ms?: number) {
  if (!ms && ms !== 0) return "—";
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const EndGame: React.FC<Props> = ({result})=> {
    const title = result.outcome === "WIN" ? "YOU WIN!" : result.outcome === "LOSE" ? "GAME OVER" : "DRAW";
    const subtitle = result.outcome === "WIN" ? "Check the rankings to know your position!" : "Try again. You are close!";

    return (
        <div className="endgame">
            {/* Title */}
            <header className="endgame-title">
                <h2>{title}</h2>
                <p className="endgame-subtitle">{subtitle}</p>
            </header>


            <div className="endgame-stats">
                {/* Stats */}
                <section className="endgame-stats">
                    <h3 className="endgame-section-title">Stats</h3>

                    <div className="stat-card">
                        <div className="stat-label">Time</div>
                        <div className="stat-value">{formatDuration(result.durationMs)}</div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-label">Moves</div>
                        <div className="stat-value">{result.moves ?? "—"}</div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-label">Difficulty</div>
                        <div className="stat-value">{result.difficulty ?? "—"}</div>
                    </div>
                </section>
            </div>
            
            {/* Action Buttons */}
            <div className="endgame-buttons">
                <button className="endgame-play-again" onClick={() => console.log('Play Again')} >
                    Play Again
                </button>

                <button className="endgame-menu" onClick={() => console.log('Back to Menu')}>
                    Back to Menu
                </button>
            </div>        
        </div>
  );
};

export default EndGame;

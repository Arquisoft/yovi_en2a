// src/components/online/MobileCountdownBar.tsx
//
// Compact fixed bottom bar shown on tablet/mobile (< 1024 px).
// Mirrors the information from RightPanelOnline in a space-efficient strip.
// Hidden on desktop via .mobile-countdown-bar CSS class.

import "./MobileCountdownBar.css";

type Props = {
    isMyTurn: boolean;
    secondsLeft: number;
    fraction: number;
    totalTime: string;
    myName: string;
    opponentName: string;
    mySlot: 1 | 2;
    activeSlot: 1 | 2;
    gameOver: boolean;
};

export default function MobileCountdownBar({
    isMyTurn,
    secondsLeft,
    fraction,
    totalTime,
    myName,
    opponentName,
    mySlot,
    activeSlot,
    gameOver,
}: Readonly<Props>) {
    const critical = secondsLeft <= 3 && !gameOver;
    const pct = Math.max(0, Math.min(1, fraction)) * 100;

    const p1Name = mySlot === 1 ? myName : opponentName;
    const p2Name = mySlot === 2 ? myName : opponentName;
    const p1Active = activeSlot === 1;
    const p2Active = activeSlot === 2;

    return (
        <div
            className={[
                "mobile-countdown-bar",
                isMyTurn ? "is-mine" : "is-theirs",
                critical ? "is-critical" : "",
                gameOver ? "is-over" : "",
            ]
                .filter(Boolean)
                .join(" ")}
        >
            {/* Progress bar across the full width */}
            <div className="mcb-progress-track">
                <div className="mcb-progress-fill" style={{ width: `${pct}%` }} />
            </div>

            <div className="mcb-body">
                {/* Left: player info */}
                <div className="mcb-players">
                    <span className={`mcb-player ${p1Active ? "mcb-player--active" : ""}`}>
                        <span className="mcb-dot mcb-dot--blue" />
                        <span className="mcb-player-name">{p1Name}</span>
                    </span>
                    <span className="mcb-vs">vs</span>
                    <span className={`mcb-player ${p2Active ? "mcb-player--active" : ""}`}>
                        <span className="mcb-dot mcb-dot--red" />
                        <span className="mcb-player-name">{p2Name}</span>
                    </span>
                </div>

                {/* Center: big countdown */}
                <div className="mcb-countdown">
                    <span className="mcb-countdown-value">{gameOver ? "—" : secondsLeft}</span>
                    {!gameOver && <span className="mcb-countdown-unit">s</span>}
                </div>

                {/* Right: total time */}
                <div className="mcb-total">
                    <span className="mcb-total-label">TIME</span>
                    <span className="mcb-total-value">{totalTime}</span>
                </div>
            </div>
        </div>
    );
}

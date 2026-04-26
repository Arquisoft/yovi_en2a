import "../gameWindow/rightPanel/RightPanel.css";
import "./RightPanelOnline.css";

type Props = {
    /** Current active turn as "1" or "2". */
    turn: 1 | 2;
    /** Which of the two players is the local user. */
    mySlot: 1 | 2;
    /** Total elapsed game time, formatted "MM:SS". */
    totalTime: string;
    /** Seconds left in the active player's 10 s window, ceiled. */
    turnSecondsLeft: number;
    /** 0..1 for the progress bar. */
    turnFraction: number;
    /** Display name for the local user (respects guest aliases). */
    myName: string;
    /** Display name for the opponent (respects guest aliases). */
    opponentName: string;
};

export default function RightPanelOnline({
                                             turn,
                                             mySlot,
                                             totalTime,
                                             turnSecondsLeft,
                                             turnFraction,
                                             myName,
                                             opponentName,
                                         }: Readonly<Props>) {
    const isP1Active = turn === 1;
    const isMyTurn = turn === mySlot;
    const critical = turnSecondsLeft <= 3;

    const Player = ({
                        name,
                        isBlue,
                        isActive,
                        meta,
                    }: {
        name: string;
        isBlue: boolean;
        isActive: boolean;
        meta: string;
    }) => (
        <div className={`rightpanel-player ${isActive ? "active" : ""}`}>
            <div className="rightpanel-left">
                <span className={`dot ${isBlue ? "blue" : "red"}`} />
                <div>
                    <div className="rightpanel-name">{name}</div>
                    <div className="rightpanel-meta">{meta}</div>
                </div>
            </div>
            <span className="rightpanel-chip">
                {isActive ? "YOUR TURN" : "WAITING"}
            </span>
        </div>
    );

    const p1Name = mySlot === 1 ? myName : opponentName;
    const p2Name = mySlot === 2 ? myName : opponentName;

    return (
        <div className="rightpanel">
            <section
                className={`rightpanel-card turn-countdown ${
                    critical ? "is-critical" : ""
                } ${isMyTurn ? "is-mine" : "is-theirs"}`}
            >
                <h4 className="rightpanel-title">
                    {isMyTurn ? "Your turn" : "Opponent's turn"}
                </h4>
                <div className="turn-countdown-value">
                    {turnSecondsLeft}
                    <span className="turn-countdown-unit">s</span>
                </div>
                <div className="turn-countdown-bar">
                    <div
                        className="turn-countdown-bar-fill"
                        style={{ width: `${Math.max(0, Math.min(1, turnFraction)) * 100}%` }}
                    />
                </div>
            </section>

            <section className="rightpanel-card">
                <h4 className="rightpanel-title">Total time</h4>
                <div className="rightpanel-time">{totalTime}</div>
            </section>

            <section className="rightpanel-card">
                <h4 className="rightpanel-title">Players</h4>
                <Player
                    name={p1Name}
                    isBlue
                    isActive={isP1Active}
                    meta={mySlot === 1 ? "You" : "Opponent"}
                />
                <Player
                    name={p2Name}
                    isBlue={false}
                    isActive={!isP1Active}
                    meta={mySlot === 2 ? "You" : "Opponent"}
                />
            </section>
        </div>
    );
}
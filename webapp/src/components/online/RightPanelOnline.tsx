import "../gameWindow/rightPanel/RightPanel.css";
import "./RightPanelOnline.css";
import { useUser } from "../../contexts/UserContext";

type Props = {
    /** Current active turn as "1" or "2" (same semantics as RightPanel). */
    turn: 1 | 2;
    /** Which of the two players is the local user (1 = P1, 2 = P2). */
    mySlot: 1 | 2;
    /** Total elapsed game time, formatted "MM:SS". */
    totalTime: string;
    /** Seconds left in the active player's 10 s window, ceiled. */
    turnSecondsLeft: number;
    /** Same as above but as a 0..1 float so the bar can drain smoothly. */
    turnFraction: number;
};

export default function RightPanelOnline({
    turn,
    mySlot,
    totalTime,
    turnSecondsLeft,
    turnFraction,
}: Readonly<Props>) {
    const { user } = useUser();
    const isP1Active = turn === 1;
    const isMyTurn = turn === mySlot;

    // Critical ≤3 s: paint the countdown red and pulse it.
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

    return (
        <div className="rightpanel">
            {/* Turn countdown — the big, attention-grabbing one. */}
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

            {/* Total elapsed game time (kept from the offline panel). */}
            <section className="rightpanel-card">
                <h4 className="rightpanel-title">Total time</h4>
                <div className="rightpanel-time">{totalTime}</div>
            </section>

            <section className="rightpanel-card">
                <h4 className="rightpanel-title">Players</h4>
                <Player
                    name={
                        (mySlot === 1 ? (user?.username ?? "You") : "Opponent")
                    }
                    isBlue
                    isActive={isP1Active}
                    meta={mySlot === 1 ? "You" : "Human"}
                />
                <Player
                    name={mySlot === 2 ? (user?.username ?? "You") : "Opponent"}
                    isBlue={false}
                    isActive={!isP1Active}
                    meta={mySlot === 2 ? "You" : "Human"}
                />
            </section>
        </div>
    );
}

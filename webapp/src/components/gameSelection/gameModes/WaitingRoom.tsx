// src/components/WaitingRoom/WaitingRoom.tsx
//
// Full-screen screen shown between creating/joining an online match and
// entering the actual game board.
//
// Flow:
//   1. "Waiting for opponent…"  (only if we are the creator)
//   2. Once the opponent is detected → "Connected!" flash (~1.2 s)
//   3. "You are Player N – your turn / their turn" announcement (~1.5 s)
//   4. navigate(`/play/${size}/multi`, { state: { matchId, turnNumber, ... } })
//
// Animations are defined inline so we don't need to touch any .module.css.

import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { waitForTurn } from "../../api/online";

type Phase = "waiting" | "connected" | "announce";

interface LocationState {
    guest?: boolean;
    role: "create" | "join";
    turnNumber: number;
    size: number;
    isPrivate?: boolean;
    password?: string;
}

const WaitingRoom: React.FC = () => {
    const { matchId = "" } = useParams<{ matchId: string }>();
    const location = useLocation();
    const navigate = useNavigate();

    const state = location.state as LocationState | null;

    // If the user refreshes this page or lands here without state, bounce out.
    useEffect(() => {
        if (!state) {
            navigate("/", { replace: true });
        }
    }, [state, navigate]);

    const [phase, setPhase] = useState<Phase>(
        state?.role === "join" ? "connected" : "waiting"
    );

    // Keep a ref to the abort controller so cleanup works even across renders.
    const abortRef = useRef<AbortController | null>(null);

    // Phase 1 → wait for opponent (only creators poll).
    useEffect(() => {
        if (!state) return;
        if (state.role !== "create") return;

        const ctrl = new AbortController();
        abortRef.current = ctrl;

        (async () => {
            try {
                // We are the creator (turn 0). Once waitForTurn resolves with
                // a board whose turn == 0, it means the opponent joined and
                // the backend is back in our turn.
                await waitForTurn(
                    { match_id: matchId, turn_number: state.turnNumber },
                    ctrl.signal
                );
                setPhase("connected");
            } catch (err: any) {
                if (err?.name === "AbortError") return;
                // Navigate back on hard failure.
                navigate("/", { replace: true });
            }
        })();

        return () => ctrl.abort();
    }, [matchId, navigate, state]);

    // Phase 2 → "Connected!" flash for ~1.2 s, then move to announce.
    useEffect(() => {
        if (phase !== "connected") return;
        const t = setTimeout(() => setPhase("announce"), 1200);
        return () => clearTimeout(t);
    }, [phase]);

    // Phase 3 → "You are Player N" for ~1.5 s, then enter the game.
    useEffect(() => {
        if (phase !== "announce") return;
        if (!state) return;

        const t = setTimeout(() => {
            navigate(`/play/${state.size}/multi`, {
                state: {
                    ...(state.guest && { guest: true }),
                    matchId,
                    turnNumber: state.turnNumber,
                    online: true,
                },
                replace: true,
            });
        }, 1500);

        return () => clearTimeout(t);
    }, [phase, matchId, navigate, state]);

    const handleCancel = () => {
        abortRef.current?.abort();
        navigate("/", { replace: true });
        // Note: no backend "cancel match" endpoint exists yet. The abandoned
        // match entry in Redis will have to be cleaned up by a TTL or a new
        // endpoint later on.
    };

    if (!state) return null;

    const playerNumber = state.turnNumber + 1; // 0 → P1, 1 → P2
    const youStart = state.turnNumber === 0;

    return (
        <div style={styles.root}>
            {/* Scoped keyframes. No .module.css was harmed in the making. */}
            <style>{KEYFRAMES}</style>

            {phase === "waiting" && (
                <div style={styles.panel}>
                    <div style={styles.spinner} aria-hidden />
                    <h2 style={styles.title}>Waiting for opponent…</h2>

                    {state.isPrivate && matchId && (
                        <div style={styles.matchIdBlock}>
                            <span style={styles.matchIdLabel}>Share this Match ID</span>
                            <code style={styles.matchIdValue}>{matchId}</code>
                        </div>
                    )}

                    <button style={styles.cancelButton} onClick={handleCancel}>
                        Cancel
                    </button>
                </div>
            )}

            {phase === "connected" && (
                <div style={{ ...styles.panel, animation: "gm-pop 0.35s ease-out" }}>
                    <div style={styles.checkmark} aria-hidden>
                        ✓
                    </div>
                    <h2 style={{ ...styles.title, color: "#4ADE80" }}>Connected!</h2>
                </div>
            )}

            {phase === "announce" && (
                <div style={{ ...styles.panel, animation: "gm-fade-in 0.4s ease-out" }}>
                    <span style={styles.youAre}>You are</span>
                    <h1 style={styles.playerLabel}>Player {playerNumber}</h1>
                    <p style={{ ...styles.subtitle, animation: "gm-fade-in 0.6s ease-out 0.25s both" }}>
                        {youStart ? "Your turn first" : "Opponent moves first"}
                    </p>
                </div>
            )}
        </div>
    );
};

// ---------- Inline styles ----------

const styles: Record<string, React.CSSProperties> = {
    root: {
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(160deg, #1a1f1a 0%, #0f130f 100%)",
        color: "#eeeeee",
        fontFamily: "var(--font-heading, var(--font-main)), serif",
        padding: "2rem",
        boxSizing: "border-box",
        zIndex: 1000,
    },
    panel: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "1.25rem",
        padding: "2rem 2.5rem",
        border: "1px solid rgba(22, 163, 74, 0.2)",
        borderRadius: "1.25rem",
        background: "rgba(255, 255, 255, 0.03)",
        minWidth: "18rem",
        maxWidth: "28rem",
        textAlign: "center",
    },
    title: {
        fontSize: "1.4rem",
        fontWeight: 700,
        margin: 0,
        letterSpacing: "0.05rem",
    },
    spinner: {
        width: "3rem",
        height: "3rem",
        border: "3px solid rgba(255, 255, 255, 0.08)",
        borderTopColor: "#4ADE80",
        borderRadius: "50%",
        animation: "gm-spin 1s linear infinite",
    },
    matchIdBlock: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "0.3rem",
        marginTop: "0.5rem",
    },
    matchIdLabel: {
        fontSize: "0.7rem",
        textTransform: "uppercase",
        letterSpacing: "0.1rem",
        color: "#B0B7C3",
    },
    matchIdValue: {
        fontSize: "1.1rem",
        fontWeight: 700,
        color: "#4ADE80",
        background: "rgba(22, 163, 74, 0.08)",
        padding: "0.45rem 0.9rem",
        borderRadius: "0.5rem",
        letterSpacing: "0.04rem",
        userSelect: "all",
    },
    cancelButton: {
        marginTop: "0.75rem",
        padding: "0.6rem 1.4rem",
        fontSize: "0.85rem",
        fontWeight: 600,
        letterSpacing: "0.08rem",
        background: "transparent",
        color: "#D1D5DB",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        borderRadius: "0.5rem",
        cursor: "pointer",
    },
    checkmark: {
        width: "4rem",
        height: "4rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "2.5rem",
        fontWeight: 700,
        color: "#4ADE80",
        background: "rgba(22, 163, 74, 0.12)",
        border: "2px solid #4ADE80",
        borderRadius: "50%",
        animation: "gm-pop 0.45s ease-out",
    },
    youAre: {
        fontSize: "0.85rem",
        color: "#B0B7C3",
        textTransform: "uppercase",
        letterSpacing: "0.2rem",
    },
    playerLabel: {
        fontSize: "2.8rem",
        fontWeight: 800,
        margin: 0,
        color: "#4ADE80",
        letterSpacing: "0.08rem",
    },
    subtitle: {
        fontSize: "1rem",
        color: "#D1D5DB",
        margin: 0,
    },
};

const KEYFRAMES = `
@keyframes gm-spin {
    to { transform: rotate(360deg); }
}
@keyframes gm-pop {
    0%   { transform: scale(0.6); opacity: 0; }
    60%  { transform: scale(1.08); opacity: 1; }
    100% { transform: scale(1);    opacity: 1; }
}
@keyframes gm-fade-in {
    from { opacity: 0; transform: translateY(0.4rem); }
    to   { opacity: 1; transform: translateY(0);       }
}
`;

export default WaitingRoom;

// src/components/online/GameWindowOnline.tsx
//
// Online 1-vs-1 game view.
//
//   - Authoritative size is pulled from the server at mount (joiner inherits
//     the creator's size even if the URL param disagreed).
//   - Grace period (3…2…1…GO!) only shown when the server's turn_started_at
//     is still in the future — players joining an in-progress match skip it.
//   - Per-turn 10s countdown synced to server.
//   - If MY countdown hits 0 → auto-play random cell.
//   - If OPPONENT's countdown has been at 0, a visual forfeit countdown
//     (20→0s) is shown in a banner. When it hits 0 we POST /claimForfeit.
//   - Parallel /matchStatus polling so the loser sees the match end when
//     the winner's client settles it.

import "../gameWindow/GameWindow.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import TopLeftHeader from "../topLeftHeader/TopLeftHeader";
import TopRightMenu from "../topRightMenu/TopRightMenu";
import Board from "../gameWindow/board/Board";
import RightPanelOnline from "./RightPanelOnline";
import { Game, toXYZ, fromXYZ } from "../gameWindow/Game";
import type { Move } from "../gameWindow/GameWindow";
import { useTimer } from "../gameWindow/rightPanel/Timer";
import {useServerCountdown} from "./UseServerCountdown.ts";

import {
    claimForfeit,
    executeMoveOnline,
    extractOccupiedFromYen,
    getMatchStatus,
    getMatchTurnInfo,
    saveMatchToDb,
    updateScore,
    waitForTurn,
    type Yen,
} from "./online";
import { displayNameFor } from "./playerId";
import modalStyles from "../gameWindow/GameModal.module.css";
import { useUser } from "../../contexts/UserContext";

const FORFEIT_GRACE_MS = 10_000;

type OnlineNavState = {
    matchId?: string;
    turnNumber?: number;
    online?: boolean;
    guest?: boolean;
};

const GameWindowOnline = () => {
    const { size: urlSize } = useParams<{ size: string }>();
    const location = useLocation();
    const navigate = useNavigate();
    const { user: currentUser } = useUser();

    const state = (location.state ?? {}) as OnlineNavState;

    useEffect(() => {
        if (!state.matchId || state.turnNumber === undefined) {
            navigate("/gameSelection", { replace: true });
        }
    }, [state.matchId, state.turnNumber, navigate]);

    const mySeat: 0 | 1 = state.turnNumber === 1 ? 1 : 0;
    const mySlot: 1 | 2 = mySeat === 0 ? 1 : 2;

    // Initial size from the URL as a hint. Will be overwritten once the
    // server responds with the authoritative YEN size.
    const initialSize = urlSize ? Number.parseInt(urlSize, 10) : 8;

    const [game, setGame] = useState<Game>(() => {
        const g = new Game(initialSize, "Player 1", "Player 2");
        if (state.matchId) g.setMatchId(state.matchId);
        return g;
    });
    const [showMobilePanel, setShowMobilePanel] = useState(false);
    const [modalMessage, setModalMessage] = useState<string | null>(null);
    const [sending, setSending] = useState(false);

    const [player1Id, setPlayer1Id] = useState<string>("");
    const [player2Id, setPlayer2Id] = useState<string>("");

    // Grace state. `graceActive` flips to false either when the grace window
    // elapses locally or when we detect the server has already started.
    const [graceActive, setGraceActive] = useState(true);
    const [graceSecondsLeft, setGraceSecondsLeft] = useState(3);
    const matchStartRef = useRef<number>(Date.now());

    // Forfeit UI countdown state (visible 20→0 banner).
    const [forfeitCountdownLeft, setForfeitCountdownLeft] = useState<number | null>(null);

    const endedRef = useRef(false);

    const { formattedTime, resetTimer } = useTimer(!game.gameOver);

    const gameRef = useRef(game);
    gameRef.current = game;

    const sendingRef = useRef(false);
    sendingRef.current = sending;

    const turnExpireSentForRef = useRef<string | null>(null);

    // --- Bootstrap: fetch authoritative match info (size, turn start). ---
    useEffect(() => {
        if (!state.matchId) return;
        let cancelled = false;

        (async () => {
            try {
                // matchStatus gives us the player ids.
                const s = await getMatchStatus(state.matchId!);
                if (cancelled) return;
                setPlayer1Id(s.player1id ?? "");
                setPlayer2Id(s.player2id ?? "");

                // matchTurnInfo carries the server clock + turn_started_at,
                // which doubles as our grace anchor. We also sneak in the
                // authoritative board size via an extra getMatchStatus +
                // first waitForTurn; for size specifically we do one more
                // fetch so the joiner picks up the creator's choice.
                const turnInfo = await getMatchTurnInfo(state.matchId!);
                if (cancelled) return;

                // The server seeded turn_started_at with a +3s future offset
                // in join_online_match, so "real" grace end equals that stamp.
                // If it's already in the past, skip grace altogether.
                const startAt = turnInfo.turn_started_at;
                const nowLocal = Date.now();
                const nowServer = turnInfo.now_server;
                const offset = nowLocal - nowServer;
                const startOnClientClock = startAt + offset;

                matchStartRef.current = startOnClientClock;

                if (startOnClientClock <= nowLocal) {
                    // Grace already over — or first turn already started
                    // moves ago. Don't show the 3…2…1 overlay.
                    setGraceActive(false);
                }
            } catch {
                // Non-fatal. Leave default values; the rest of the UI will
                // still work.
            }
        })();

        return () => { cancelled = true; };
    }, [state.matchId]);

    // --- Authoritative board size from the first waitForTurn response. ---
    // The joiner may have arrived with the wrong URL size; the YEN always
    // knows the real one.
    useEffect(() => {
        if (!state.matchId) return;
        let cancelled = false;

        (async () => {
            try {
                // We read the raw YEN through a one-shot waitForTurn with the
                // current turn (0). Because the match starts on turn 0, this
                // returns immediately with the current state.
                const res = await waitForTurn(
                    { match_id: state.matchId!, turn_number: 0 }
                );
                if (cancelled) return;
                const yen = res.board_status;
                const realSize = typeof yen.size === "number" ? yen.size : null;
                if (realSize && realSize !== gameRef.current.size) {
                    // Rebuild the Game object with the correct size.
                    setGame((prev) => {
                        const g = new Game(realSize, prev.player1, prev.player2);
                        g.setMatchId(prev.matchId || "");
                        g.turn = prev.turn;
                        g.gameOver = prev.gameOver;
                        // Don't copy moves blindly — coords are size-scoped.
                        return g;
                    });
                }
            } catch {
                // ignore; fall back to the URL size
            }
        })();

        return () => { cancelled = true; };
    }, [state.matchId]);

    // --- Grace tick ---
    useEffect(() => {
        if (!graceActive) return;
        resetTimer();

        const id = setInterval(() => {
            const elapsed = Date.now() - matchStartRef.current;
            const left = Math.max(0, Math.ceil(-elapsed / 1000));
            // matchStartRef is the *start* moment (in the future during
            // grace), so `-elapsed` is "time until start".
            setGraceSecondsLeft(left);

            if (Date.now() >= matchStartRef.current) {
                setGraceActive(false);
                clearInterval(id);
            }
        }, 100);

        return () => clearInterval(id);
    }, [graceActive]); // eslint-disable-line react-hooks/exhaustive-deps

    const cloneGame = (source: Game): Game => {
        const g = new Game(source.size, source.player1, source.player2);
        g.setMatchId(source.matchId || "");
        g.moves = [...source.moves];
        g.turn = source.turn;
        g.gameOver = source.gameOver;
        return g;
    };

    const isMyTurn = !game.gameOver && game.turn === mySeat;

    // --- Display names ---
    const myPlayerId = mySeat === 0 ? player1Id : player2Id;
    const oppPlayerId = mySeat === 0 ? player2Id : player1Id;

    const meDisplay = currentUser?.username
        ?? displayNameFor(myPlayerId, mySeat);
    const oppDisplay = displayNameFor(oppPlayerId, (1 - mySeat) as 0 | 1);


    // --- Persist outcome in DB (winner only). ---
    const persistOutcome = useCallback(async (
        iWon: boolean,
        reason: "normal" | "forfeit"
    ) => {
        if (!iWon) return;              // only the winner writes.
        if (!currentUser) return;       // guests can't write their email anyway.
        if (!state.matchId) return;

        const meEmail = currentUser.email;
        const meIsP1 = mySeat === 0;

        const resultString = reason === "forfeit"
            ? "Forfeit win"
            : "Win";

        const totalTimeSec = Math.max(
            0,
            Math.round((Date.now() - matchStartRef.current) / 1000)
        );

        try {
            await saveMatchToDb({
                match_id: state.matchId,
                player1id: meIsP1 ? meEmail : "guest",
                player2id: meIsP1 ? "guest" : meEmail,
                result: resultString,
                time: totalTimeSec,
                moves: gameRef.current.moves.map((m) =>
                    toXYZ(m.row, m.col, gameRef.current.size)
                ),
            });
        } catch (err) {
            console.warn("[online] saveMatchToDb failed:", err);
        }

        try {
            await updateScore({
                playerid: meEmail,
                username: currentUser.username ?? meEmail,
                is_win: iWon,
                time: totalTimeSec,
            });
        } catch (err) {
            console.warn("[online] updateScore failed:", err);
        }
    }, [currentUser, mySeat, state.matchId]);

    const handleGameOver = useCallback(
        (iWon: boolean, reason: "normal" | "forfeit" = "normal") => {
            if (endedRef.current) return;
            endedRef.current = true;
            game.gameOver=true;

            if (reason === "forfeit") {
                setModalMessage(iWon ? "Opponent forfeited — you win!" : "You forfeited the match.");
            } else {
                setModalMessage(iWon ? "You won!" : "You lost.");
            }
            void persistOutcome(iWon, reason);
        },
        [persistOutcome]
    );

    // --- Apply opponent moves from YEN. ---
    const applyServerUpdate = useCallback((yen: Yen) => {
        const occupied = extractOccupiedFromYen(yen);
        const local = gameRef.current;
        if (occupied.length <= local.moves.length) return;

        const known = new Set(local.moves.map((m) => `${m.row},${m.col}`));
        const fresh = occupied.filter((c) => {
            const { row, col } = fromXYZ(c.x, c.y, c.z, local.size);
            return !known.has(`${row},${col}`);
        });
        if (fresh.length === 0) return;

        const updated = cloneGame(local);
        for (const cell of fresh) {
            const { row, col } = fromXYZ(cell.x, cell.y, cell.z, updated.size);
            updated.addMove(row, col);
        }
        if (typeof yen.turn === "number") {
            updated.turn = yen.turn === 0 ? 0 : 1;
        }
        setGame(updated);
    }, []);

    // --- Long-poll for opponent moves. ---
    useEffect(() => {
        if (!game.matchId || game.gameOver) return;
        if (isMyTurn) return;
        if (graceActive) return;

        const ctrl = new AbortController();

        (async () => {
            try {
                const res = await waitForTurn(
                    { match_id: game.matchId!, turn_number: mySeat },
                    ctrl.signal
                );
                applyServerUpdate(res.board_status);
            } catch (err: any) {
                if (err?.name === "AbortError") return;
                console.error("[online] waitForTurn failed:", err);
            }
        })();

        return () => ctrl.abort();
    }, [isMyTurn, game.matchId, game.gameOver, mySeat, graceActive, applyServerUpdate]);

    // --- Parallel /matchStatus poll — lets the loser learn the match ended. ---
    useEffect(() => {
        if (!game.matchId || game.gameOver) return;
        if (endedRef.current) return;

        const id = setInterval(async () => {
            if (!game.matchId || endedRef.current) return;
            try {
                const s = await getMatchStatus(game.matchId);
                if (s.status === "finished") {
                    const myId = mySeat === 0 ? player1Id : player2Id;
                    const iWon = !!s.winner && s.winner === myId;
                    const reason = s.end_reason === "forfeit" ? "forfeit" : "normal";
                    handleGameOver(iWon, reason as "normal" | "forfeit");
                }
            } catch {
                // non-fatal
            }
        }, 2000);

        return () => clearInterval(id);
    }, [game.matchId, game.gameOver, mySeat, player1Id, player2Id, handleGameOver]);

    // --- Send move ---
    const handlePlace = useCallback(
        async (row: number, col: number) => {
            const g = gameRef.current;
            if (!g.matchId || g.gameOver) return;
            if (g.turn !== mySeat) return;
            if (g.isOccupied(row, col)) return;
            if (sendingRef.current) return;

            setSending(true);
            try {
                const { x, y, z } = toXYZ(row, col, g.size);
                const res = await executeMoveOnline({
                    match_id: g.matchId,
                    coord_x: x,
                    coord_y: y,
                    coord_z: z,
                    player_id: mySeat,
                });

                const updated = cloneGame(g);
                updated.addMove(row, col);
                updated.setGameOver(res.game_over);
                setGame(updated);

                if (res.game_over) handleGameOver(true, "normal");
            } catch (err) {
                console.error("[online] executeMove failed:", err);
            } finally {
                setSending(false);
            }
        },
        [mySeat, handleGameOver]
    );

    // --- Auto-play at 0 for MY turn ---
    const pickRandomEmpty = useCallback((): { row: number; col: number } | null => {
        const g = gameRef.current;
        const empty: Array<{ row: number; col: number }> = [];
        for (let row = 0; row < g.size; row++) {
            for (let col = 0; col <= row; col++) {
                if (!g.isOccupied(row, col)) empty.push({ row, col });
            }
        }
        if (empty.length === 0) return null;
        return empty[Math.floor(Math.random() * empty.length)];
    }, []);

    // Momento en que este cliente entró en el turno actual (key = epoch).
    const myTurnEnteredAtRef = useRef<{ epoch: string; at: number } | null>(null);

// Mantener sincronizado: cada vez que cambia el epoch Y es mi turno, guarda el timestamp.
    useEffect(() => {
        if (game.gameOver || graceActive) return;
        if (game.turn !== mySeat) {
            // No es mi turno: resetea el "desde cuándo".
            myTurnEnteredAtRef.current = null;
            return;
        }
        const epoch = `${game.matchId}:${game.moves.length}`;
        if (myTurnEnteredAtRef.current?.epoch !== epoch) {
            myTurnEnteredAtRef.current = { epoch, at: Date.now() };
        }
    }, [game.turn, game.matchId, game.moves.length, game.gameOver, graceActive, mySeat]);


    const onTurnExpire = useCallback(() => {
        const g = gameRef.current;
        if (g.gameOver || g.turn !== mySeat) return;
        if (sendingRef.current) return;

        const epoch = `${g.matchId}:${g.moves.length}`;
        const entered = myTurnEnteredAtRef.current;
        if (!entered || entered.epoch !== epoch) return;
        if (Date.now() - entered.at < 2000) return;   // la defensa que ya tenías
        if (turnExpireSentForRef.current === epoch) return;
        turnExpireSentForRef.current = epoch;

        const cell = pickRandomEmpty();
        if (cell) void handlePlace(cell.row, cell.col);
    }, [mySeat, handlePlace, pickRandomEmpty]);

    const turnEpoch = `${game.matchId}:${game.moves.length}`;

    const { remaining, secondsLeft, fraction } = useServerCountdown({
        matchId: game.matchId ?? null,
        resetKey: turnEpoch,
        isRunning: !game.gameOver && !graceActive,
        onExpire: onTurnExpire,
    });

    // --- Forfeit detection + visual banner countdown ---
    // Drives the "Opponent forfeits in Ns" banner when the opponent's clock
    // has been at 0. Triggers claimForfeit when it reaches 0.
    //
    // IMPORTANT: this effect must NOT depend on `remaining` directly — that
    // changes every 100ms, which would tear down the interval before the
    // 20s threshold is ever reached. Instead we latch a boolean
    // "opponent is out of time right now" and resync it via a ref.
    const opponentAt0SinceRef = useRef<number | null>(null);
    const isOpponentOutOfTime =
        !game.gameOver && !graceActive && !isMyTurn && remaining <= 0;
    const outOfTimeLatch = isOpponentOutOfTime; // stable boolean for the dep list

    useEffect(() => {
        if (!outOfTimeLatch) {
            opponentAt0SinceRef.current = null;
            setForfeitCountdownLeft(null);
            return;
        }

        // We just entered the "opponent timed out" state.
        opponentAt0SinceRef.current = Date.now();
        setForfeitCountdownLeft(Math.ceil(FORFEIT_GRACE_MS / 1000));

        const id = setInterval(() => {
            if (opponentAt0SinceRef.current == null) return;
            const waited = Date.now() - opponentAt0SinceRef.current;
            const left = Math.max(0, Math.ceil((FORFEIT_GRACE_MS - waited) / 1000));
            setForfeitCountdownLeft(left);

            if (waited >= FORFEIT_GRACE_MS && !sendingRef.current && !endedRef.current) {
                clearInterval(id);
                opponentAt0SinceRef.current = null;
                const claimantId = mySeat === 0 ? player1Id : player2Id;
                if (!claimantId || !game.matchId) {
                    console.warn("[online] forfeit: missing claimant or matchId", { claimantId, matchId: game.matchId });
                    return;
                }

                (async () => {
                    try {
                        await claimForfeit(game.matchId!, claimantId);
                        handleGameOver(true, "forfeit");
                    } catch (err) {
                        console.warn("[online] claimForfeit failed:", err);
                    }
                })();
            }
        }, 250);

        return () => clearInterval(id);
    }, [outOfTimeLatch, mySeat, player1Id, player2Id, game.matchId, handleGameOver]);

    const boardBlocked = game.gameOver || !isMyTurn || sending || graceActive;
    const activeSlot: 1 | 2 = game.turn === 0 ? 1 : 2;

    return (
        <div className="game-window">
            <TopRightMenu />
            <TopLeftHeader />

            <button
                className="mobile-menu-button"
                onClick={() => setShowMobilePanel(!showMobilePanel)}
            >
                {showMobilePanel ? "✕" : "☰"}
            </button>

            <div className="center-area">
                <Board
                    size={game.size}
                    moves={game.moves as Move[]}
                    blocked={boardBlocked}
                    onPlace={handlePlace}
                />

                <div className={`rightpanel-container ${showMobilePanel ? "open" : ""}`}>
                    <RightPanelOnline
                        turn={activeSlot}
                        mySlot={mySlot}
                        totalTime={formattedTime}
                        turnSecondsLeft={secondsLeft}
                        turnFraction={fraction}
                        myName={meDisplay}
                        opponentName={oppDisplay}
                    />
                </div>
            </div>

            {/* Grace overlay 3…2…1…GO! */}
            {graceActive && (
                <div style={graceStyles.overlay}>
                    <style>{GRACE_KEYFRAMES}</style>
                    <div key={graceSecondsLeft} style={graceStyles.number}>
                        {graceSecondsLeft > 0 ? graceSecondsLeft : "GO!"}
                    </div>
                    <p style={graceStyles.subtitle}>Get ready…</p>
                </div>
            )}

            {/* Forfeit countdown banner */}
            {forfeitCountdownLeft != null && !game.gameOver && (
                <div style={forfeitStyles.banner}>
                    <div style={forfeitStyles.title}>Opponent is out of time</div>
                    <div style={forfeitStyles.big}>
                        {forfeitCountdownLeft}
                        <span style={forfeitStyles.unit}>s</span>
                    </div>
                    <div style={forfeitStyles.sub}>Claiming win by forfeit…</div>
                </div>
            )}

            {modalMessage && (
                <div className={modalStyles.modalOverlay}>
                    <div className={modalStyles.modalContent}>
                        <button
                            className={modalStyles.closeBtn}
                            onClick={() => setModalMessage(null)}
                        >
                            ✕
                        </button>
                        <h2>{modalMessage}</h2>
                        <p>Total time: {formattedTime}</p>
                        <button
                            className={modalStyles.returnBtn}
                            onClick={() => navigate("/gameSelection")}
                        >
                            Return to game Selection
                        </button>
                    </div>
                </div>
            )}

            <span style={{ display: "none" }}>{remaining}</span>
        </div>
    );
};

// ---- Grace overlay styles ----
const graceStyles: Record<string, React.CSSProperties> = {
    overlay: {
        position: "fixed",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0, 0, 0, 0.65)",
        backdropFilter: "blur(4px)",
        zIndex: 900,
        pointerEvents: "none",
    },
    number: {
        fontSize: "9rem",
        fontWeight: 900,
        color: "#4ADE80",
        textShadow: "0 0 40px rgba(74, 222, 128, 0.55)",
        fontFamily: "var(--font-heading, var(--font-main)), serif",
        letterSpacing: "-0.04em",
        lineHeight: 1,
        animation: "gm-grace-pop 0.9s ease-out",
    },
    subtitle: {
        marginTop: "1.5rem",
        fontSize: "1rem",
        color: "#D1D5DB",
        textTransform: "uppercase",
        letterSpacing: "0.3rem",
        fontWeight: 600,
    },
};

const GRACE_KEYFRAMES = `
@keyframes gm-grace-pop {
    0%   { transform: scale(0.4); opacity: 0; }
    30%  { transform: scale(1.15); opacity: 1; }
    70%  { transform: scale(1);    opacity: 1; }
    100% { transform: scale(0.85); opacity: 0; }
}
@keyframes gm-forfeit-pulse {
    0%, 100% { transform: scale(1); }
    50%      { transform: scale(1.04); }
}
`;

// ---- Forfeit banner styles ----
const forfeitStyles: Record<string, React.CSSProperties> = {
    banner: {
        position: "fixed",
        top: "5rem",
        left: "50%",
        transform: "translateX(-50%)",
        padding: "1rem 1.5rem",
        borderRadius: "1rem",
        background: "linear-gradient(160deg, rgba(239, 68, 68, 0.25) 0%, #1a1f1a 70%)",
        border: "2px solid #ef4444",
        boxShadow: "0 0 30px rgba(239, 68, 68, 0.35), 0 10px 30px rgba(0,0,0,0.5)",
        color: "#fff",
        fontFamily: "var(--font-heading, var(--font-main)), serif",
        textAlign: "center",
        zIndex: 850,
        animation: "gm-forfeit-pulse 0.9s ease-in-out infinite",
        minWidth: "14rem",
    },
    title: {
        fontSize: "0.75rem",
        fontWeight: 700,
        letterSpacing: "0.15rem",
        textTransform: "uppercase",
        color: "#fca5a5",
    },
    big: {
        fontSize: "3rem",
        fontWeight: 900,
        lineHeight: 1,
        color: "#ffe4e4",
        textShadow: "0 0 18px rgba(239, 68, 68, 0.8)",
        margin: "0.3rem 0",
        fontVariantNumeric: "tabular-nums",
    },
    unit: {
        fontSize: "1.2rem",
        fontWeight: 700,
        color: "rgba(255,255,255,0.6)",
        marginLeft: "0.15rem",
    },
    sub: {
        fontSize: "0.7rem",
        color: "#D1D5DB",
        textTransform: "uppercase",
        letterSpacing: "0.1rem",
    },
};

export default GameWindowOnline;
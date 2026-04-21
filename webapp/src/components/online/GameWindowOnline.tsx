// src/components/online/GameWindowOnline.tsx
//
// Online 1-vs-1 game view. Reuses the offline GameWindow layout/CSS.
//   - match is already created by the WaitingRoom (matchId arrives in state)
//   - we know our slot via turnNumber (0 = P1, 1 = P2)
//   - we long-poll /requestOnlineGameUpdate to learn the opponent's move
//   - each player has 10 s per turn; timeout → auto-play a random empty cell

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
import { useCountdown } from "./useCountdown";
import {
    executeMove,
    extractOccupiedFromYen,
    waitForTurn,
    type Yen,
} from "./online.ts";
import modalStyles from "../gameWindow/GameModal.module.css";
import { useUser } from "../../contexts/UserContext";

const TURN_SECONDS = 10;

type OnlineNavState = {
    matchId?: string;
    turnNumber?: number;    // 0 for creator, 1 for joiner
    online?: boolean;
    guest?: boolean;
};

const GameWindowOnline = () => {
    const { size: urlSize } = useParams<{ size: string }>();
    const location = useLocation();
    const navigate = useNavigate();
    const { user: currentUser } = useUser();

    const state = (location.state ?? {}) as OnlineNavState;
    const size = urlSize ? Number.parseInt(urlSize, 10) : 8;

    useEffect(() => {
        if (!state.matchId || state.turnNumber === undefined) {
            navigate("/gameSelection", { replace: true });
        }
    }, [state.matchId, state.turnNumber, navigate]);

    /** Our seat: 0 = P1 (first symbol in YEN.players), 1 = P2. */
    const mySeat: 0 | 1 = (state.turnNumber === 1 ? 1 : 0);
    const mySlot: 1 | 2 = mySeat === 0 ? 1 : 2;

    const player1 = mySeat === 0 ? (currentUser?.username ?? "You") : "Opponent";
    const player2 = mySeat === 1 ? (currentUser?.username ?? "You") : "Opponent";

    const [game, setGame] = useState<Game>(() => {
        const g = new Game(size, player1, player2);
        if (state.matchId) g.setMatchId(state.matchId);
        return g;
    });
    const [showMobilePanel, setShowMobilePanel] = useState(false);
    const [modalMessage, setModalMessage] = useState<string | null>(null);
    const [sending, setSending] = useState(false);

    const { formattedTime, resetTimer } = useTimer(!game.gameOver);

    const gameRef = useRef(game);
    gameRef.current = game;

    const sendingRef = useRef(false);
    sendingRef.current = sending;

    useEffect(() => {
        resetTimer();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const cloneGame = (source: Game): Game => {
        const g = new Game(source.size, source.player1, source.player2);
        g.setMatchId(source.matchId || "");
        g.moves = [...source.moves];
        g.turn = source.turn;
        g.gameOver = source.gameOver;
        return g;
    };

    const currentTurn: 0 | 1 = game.turn;
    const isMyTurn = !game.gameOver && currentTurn === mySeat;

    const handleGameOver = useCallback((iWon: boolean) => {
        setModalMessage(iWon ? "You won!" : "You lost.");
    }, []);

    /**
     * Reconcile the server board (YEN.layout) with our local move history.
     * Since the layout only tells us which cells are occupied (not the order),
     * we only reliably discover *new* cells — which is fine because online
     * play is append-only.
     */
    const applyServerUpdate = useCallback((yen: Yen) => {
        const occupied = extractOccupiedFromYen(yen);
        if (occupied.length === 0) return;

        const local = gameRef.current;
        if (occupied.length <= local.moves.length) return;

        // Build a set of cells we already know about.
        const known = new Set(local.moves.map((m) => `${m.row},${m.col}`));

        // Everything the server has that we don't know about yet.
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

        // Reconcile whose turn it is according to the server.
        if (typeof yen.turn === "number") {
            updated.turn = (yen.turn === 0 ? 0 : 1);
        }
        setGame(updated);
    }, []);

    // Long-poll for opponent moves when it's their turn.
    useEffect(() => {
        if (!game.matchId || game.gameOver) return;
        if (isMyTurn) return;

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
    }, [isMyTurn, game.matchId, game.gameOver, mySeat, applyServerUpdate]);

    // Send a move.
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
                const res = await executeMove({
                    match_id: g.matchId,
                    coord_x: x,
                    coord_y: y,
                    coord_z: z,
                });

                const updated = cloneGame(g);
                updated.addMove(row, col);
                updated.setGameOver(res.game_over);
                setGame(updated);

                if (res.game_over) handleGameOver(true);
            } catch (err) {
                console.error("[online] executeMove failed:", err);
            } finally {
                setSending(false);
            }
        },
        [mySeat, handleGameOver]
    );

    // 10 s per-turn countdown (Option B: auto-play random on timeout).
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

    const onTurnExpire = useCallback(() => {
        const g = gameRef.current;
        if (g.gameOver || g.turn !== mySeat) return;
        if (sendingRef.current) return;

        const cell = pickRandomEmpty();
        if (!cell) return;
        void handlePlace(cell.row, cell.col);
    }, [mySeat, handlePlace, pickRandomEmpty]);

    const countdownKey = `${game.matchId}:${game.moves.length}`;

    const { remaining, secondsLeft } = useCountdown(
        TURN_SECONDS,
        !game.gameOver,
        countdownKey,
        onTurnExpire
    );

    const turnFraction = remaining / TURN_SECONDS;

    const boardBlocked = game.gameOver || !isMyTurn || sending;

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
                        turn={game.turn === 0 ? 1 : 2}
                        mySlot={mySlot}
                        totalTime={formattedTime}
                        turnSecondsLeft={secondsLeft}
                        turnFraction={turnFraction}
                    />
                </div>
            </div>

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
        </div>
    );
};

export default GameWindowOnline;

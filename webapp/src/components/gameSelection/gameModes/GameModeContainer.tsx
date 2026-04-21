import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { type GameMode, Difficulty } from "./GameMode";
import { Difficulty as DifficultyValues } from "./GameMode";
import styles from "./GameModeContainer.module.css";
import imagenGameY from "../../../assets/background_image_gameY.png";
import {
    createOnlineMatch,
    joinOnlineMatch,
    isNoMatchesAvailable,
} from "../../online/online";
import { getPlayerId } from "../../online/playerId";

type Props = {
    mode: GameMode;
};

export const GameModeContainer: React.FC<Props> = ({ mode }) => {
    const difficulties: Difficulty[] = Object.values(DifficultyValues);
    const navigate = useNavigate();
    const location = useLocation();
    const isGuest = location.state?.guest === true;

    const [currentDifficultyIndex, setCurrentDifficultyIndex] = useState(
        difficulties.indexOf(mode.currentLevel)
    );
    const [currentSize, setCurrentSize] = useState(mode.size || 8);
    const [matchId, setMatchId] = useState(mode.matchId ?? "");
    const [password, setPassword] = useState(mode.password ?? "");
    const [busy, setBusy] = useState<null | "create" | "join" | "play">(null);
    const [error, setError] = useState<string | null>(null);

    const minSize = 4;
    const maxSize = 12;

    const decreaseDifficulty = () => setCurrentDifficultyIndex((prev) => Math.max(prev - 1, 0));
    const increaseDifficulty = () => setCurrentDifficultyIndex((prev) => Math.min(prev + 1, difficulties.length - 1));
    const decreaseSize = () => setCurrentSize((prev) => Math.max(prev - 1, minSize));
    const increaseSize = () => setCurrentSize((prev) => Math.min(prev + 1, maxSize));

    const currentDifficulty = difficulties[currentDifficultyIndex];

    const handleLocalPlay = () => {
        mode.currentLevel = currentDifficulty;
        mode.size = currentSize;

        const navState = { state: { ...(isGuest && { guest: true }) } };

        if (mode.showDifficulty) {
            navigate(`/play/${currentSize}/${currentDifficulty[1]}`, navState);
        } else {
            navigate(`/play/${currentSize}/multi`, navState);
        }
    };

    // --- Helper: navigate to waiting room after create/join success ---
    const goToWaiting = (
        matchIdValue: string,
        role: "create" | "join",
        turnNumber: number
    ) => {
        navigate(`/waiting/${matchIdValue}`, {
            state: {
                ...(isGuest && { guest: true }),
                role,
                turnNumber,
                size: currentSize,
                isPrivate: !!mode.showMatchId,
                password: role === "create" ? password : undefined,
            },
        });
    };

    // --- Create online match (used by both CREATE button and Join→Create fallback) ---
    const createFlow = async (): Promise<void> => {
        const playerId = getPlayerId();
        const res = await createOnlineMatch({
            player1id: playerId,
            size: currentSize,
            match_id: matchId,         // "" → random public match
            match_password: password,  // ignored by backend when match_id is ""
        });
        goToWaiting(res.match_id, "create", res.turn_number);
    };

    const handleCreate = async () => {
        setError(null);
        setBusy("create");
        try {
            await createFlow();
        } catch (e: any) {
            setError(e?.message || "Could not create match");
        } finally {
            setBusy(null);
        }
    };

    // --- Join (with auto-create fallback for public matches) ---
    const handleJoin = async () => {
        setError(null);
        setBusy("join");
        try {
            const playerId = getPlayerId();
            const res = await joinOnlineMatch({
                player2id: playerId,
                match_id: matchId,         // "" → any public waiting match
                match_password: password,
            });
            goToWaiting(res.match_id, "join", res.turn_number);
        } catch (e: any) {
            // Public-only scenario: nobody is waiting → create our own and wait.
            // We only do this when the user did NOT specify a match id, to
            // avoid silently creating private rooms with the wrong id/password.
            if (mode.showOnlyJoin && !matchId && isNoMatchesAvailable(e)) {
                try {
                    await createFlow();
                    return;
                } catch (e2: any) {
                    setError(e2?.message || "Could not create match");
                    return;
                }
            }
            setError(e?.message || "Could not join match");
        } finally {
            setBusy(null);
        }
    };

    const buttonMode: "play" | "createJoin" | "joinOnly" =
        mode.showJoinCreate ? "createJoin"
        : mode.showOnlyJoin ? "joinOnly"
        : "play";

    return (
        <div className={styles.gameModeContainer}>
            <div className={styles.header}>
                <h2 className={styles.title}>{mode.label}</h2>
                <div className={styles.tooltipContainer}>
                    <button className={styles.infoButton}>?</button>
                    <div className={styles.tooltip}>{mode.description}</div>
                </div>
            </div>

            <div className={styles.imageContainer}>
                <img src={imagenGameY} alt={mode.label} />
            </div>

            <div className={styles.controlsWrapper}>
                {mode.showDifficulty && (
                    <div className={styles.difficultySection}>
                        <span className={styles.difficultyLabel}>Difficulty</span>
                        <div className={styles.difficultySelector}>
                            <button
                                className={styles.arrow}
                                onClick={decreaseDifficulty}
                                style={{ visibility: currentDifficultyIndex > 0 ? "visible" : "hidden" }}
                            >
                                ←
                            </button>
                            <div className={styles.difficultyBox}>{currentDifficulty[0]}</div>
                            <button
                                className={styles.arrow}
                                onClick={increaseDifficulty}
                                style={{
                                    visibility: currentDifficultyIndex < difficulties.length - 1 ? "visible" : "hidden",
                                }}
                            >
                                →
                            </button>
                        </div>
                    </div>
                )}

                <div className={styles.sizeSection}>
                    <span className={styles.difficultyLabel}>Size</span>
                    <div className={styles.difficultySelector}>
                        <button
                            className={styles.arrow}
                            onClick={decreaseSize}
                            style={{ visibility: currentSize > minSize ? "visible" : "hidden" }}
                        >
                            ←
                        </button>
                        <div className={styles.difficultyBox}>{currentSize}</div>
                        <button
                            className={styles.arrow}
                            onClick={increaseSize}
                            style={{ visibility: currentSize < maxSize ? "visible" : "hidden" }}
                        >
                            →
                        </button>
                    </div>
                </div>

                {mode.showMatchId && (
                    <div className={styles.difficultySection}>
                        <span className={styles.difficultyLabel}>Match ID</span>
                        <div className={styles.difficultySelector}>
                            <input
                                className={styles.inputField}
                                type="text"
                                value={matchId}
                                onChange={(e) => setMatchId(e.target.value)}
                                placeholder="ID..."
                            />
                        </div>
                    </div>
                )}

                {mode.showPassword && (
                    <div className={styles.difficultySection}>
                        <span className={styles.difficultyLabel}>Password</span>
                        <div className={styles.difficultySelector}>
                            <input
                                className={styles.inputField}
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="****"
                            />
                        </div>
                    </div>
                )}
            </div>

            {error && (
                <div
                    style={{
                        color: "#fca5a5",
                        fontSize: "0.75rem",
                        textAlign: "center",
                        padding: "0.25rem 0",
                    }}
                    role="alert"
                >
                    {error}
                </div>
            )}

            {buttonMode === "createJoin" && (
                <div style={{ display: "flex", gap: "0.5rem", width: "100%" }}>
                    <button
                        className={styles.playButton}
                        onClick={handleCreate}
                        disabled={busy !== null}
                        style={{ flex: 1, opacity: busy !== null && busy !== "create" ? 0.6 : 1 }}
                    >
                        {busy === "create" ? "…" : "CREATE"}
                    </button>
                    <button
                        className={styles.playButton}
                        onClick={handleJoin}
                        disabled={busy !== null}
                        style={{ flex: 1, opacity: busy !== null && busy !== "join" ? 0.6 : 1 }}
                    >
                        {busy === "join" ? "…" : "JOIN"}
                    </button>
                </div>
            )}

            {buttonMode === "joinOnly" && (
                <button
                    className={styles.playButton}
                    onClick={handleJoin}
                    disabled={busy !== null}
                >
                    {busy === "join" ? "…" : "JOIN"}
                </button>
            )}

            {buttonMode === "play" && (
                <button
                    className={styles.playButton}
                    onClick={handleLocalPlay}
                    disabled={busy !== null}
                >
                    PLAY
                </button>
            )}
        </div>
    );
};

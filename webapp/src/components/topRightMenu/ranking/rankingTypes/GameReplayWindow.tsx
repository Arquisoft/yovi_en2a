import { useState, useEffect, useCallback } from 'react';
import Board from '../../../gameWindow/board/Board';
import { fromXYZ } from '../../../gameWindow/Game';
import type { RankingElementLocal } from '../rankingElements/RankingElementLocal';
import styles from './GameReplayWindow.module.css';

const PLAYER1_LABEL = 'Player 1';
const PLAYER2_LABEL = 'Player 2';
const PLAY_INTERVAL_MS = 1200;

const formatTime = (seconds: number): string => {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

interface Props {
  match: RankingElementLocal;
  onClose: () => void;
}

const GameReplayWindow = ({ match, onClose }: Props) => {
  const moves      = match.moves ?? [];
  const boardSize  = match.boardSize ?? 8;
  const totalSteps = moves.length;

  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying,   setIsPlaying]   = useState(false);

  // Auto-play: advance one step every PLAY_INTERVAL_MS
  useEffect(() => {
    if (!isPlaying) return;
    const id = setInterval(() => {
      setCurrentStep(s => {
        if (s >= totalSteps) {
          setIsPlaying(false);
          return s;
        }
        return s + 1;
      });
    }, PLAY_INTERVAL_MS);
    return () => clearInterval(id);
  }, [isPlaying, totalSteps]);

  // Stop playing when reaching the end
  useEffect(() => {
    if (currentStep >= totalSteps) setIsPlaying(false);
  }, [currentStep, totalSteps]);

  const goFirst = useCallback(() => { setCurrentStep(0);          setIsPlaying(false); }, []);
  const goPrev  = useCallback(() => { setCurrentStep(s => Math.max(0, s - 1));          setIsPlaying(false); }, []);
  const goNext  = useCallback(() => { setCurrentStep(s => Math.min(totalSteps, s + 1)); setIsPlaying(false); }, [totalSteps]);
  const goLast  = useCallback(() => { setCurrentStep(totalSteps); setIsPlaying(false); }, [totalSteps]);
  const togglePlay = useCallback(() => {
    if (currentStep >= totalSteps) setCurrentStep(0);
    setIsPlaying(p => !p);
  }, [currentStep, totalSteps]);

  // Build the Move[] for the Board at the current step
  const boardMoves = moves.slice(0, currentStep).map((coord, i) => {
    const { row, col } = fromXYZ(coord.x, coord.y, coord.z, boardSize);
    return { row, col, player: (i % 2) as 0 | 1 };
  });

  const hasNoMoves = totalSteps === 0;

  return (
    <div className="top-right-menu-overlay">
      <div className="top-right-menu-container">
        <button className="top-right-menu-close-btn" onClick={onClose} aria-label="Close">✕</button>

        <header className="top-right-menu-global-header">
          <h2 className="top-right-menu-title">REPLAY</h2>
        </header>

        <div className={styles.replayBody}>

          {/* ── Board area ── */}
          <div className={styles.boardArea}>
            {hasNoMoves ? (
              <p className={styles.noMovesMsg}>
                No move data available for this match.<br />
                Only games played after this feature was added can be replayed.
              </p>
            ) : (
              <div className={styles.boardScroll}>
                <Board
                  size={boardSize}
                  moves={boardMoves}
                  blocked={true}
                  onPlace={() => {}}
                />
              </div>
            )}
          </div>

          {/* ── Info panel ── */}
          <aside className={styles.infoPanel}>
            <div className={styles.players}>
              <div className={styles.playerRow}>
                <span className={styles.colorDot} style={{ background: 'rgba(77,163,255,0.9)' }} />
                <span className={styles.playerName}>{match.player1Name}</span>
                <span className={styles.playerRole}>{PLAYER1_LABEL}</span>
              </div>
              <span className={styles.vsText}>VS</span>
              <div className={styles.playerRow}>
                <span className={styles.colorDot} style={{ background: 'rgba(255,80,80,0.9)' }} />
                <span className={styles.playerName}>{match.player2Name}</span>
                <span className={styles.playerRole}>{PLAYER2_LABEL}</span>
              </div>
            </div>

            <div className={styles.matchInfo}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Result</span>
                <span className={styles.infoValue}>{match.result}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Duration</span>
                <span className={styles.infoValue}>{formatTime(match.time)}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Total moves</span>
                <span className={styles.infoValue}>{totalSteps}</span>
              </div>
            </div>

            {!hasNoMoves && (
              <div className={styles.stepIndicator}>
                Move <strong>{currentStep}</strong> / {totalSteps}
              </div>
            )}
          </aside>
        </div>

        {/* ── Playback controls ── */}
        {!hasNoMoves && (
          <div className={styles.controls}>
            <button
              className={styles.ctrlBtn}
              onClick={goFirst}
              disabled={currentStep === 0}
              title="First move"
            >⏮</button>
            <button
              className={styles.ctrlBtn}
              onClick={goPrev}
              disabled={currentStep === 0}
              title="Previous move"
            >◀</button>
            <button
              className={styles.ctrlBtn}
              onClick={goNext}
              disabled={currentStep === totalSteps}
              title="Next move"
            >▶</button>
            <button
              className={styles.ctrlBtn}
              onClick={goLast}
              disabled={currentStep === totalSteps}
              title="Last move"
            >⏭</button>
            <button
              className={`${styles.ctrlBtn} ${styles.playBtn}`}
              onClick={togglePlay}
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? '⏸' : '▶▶'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default GameReplayWindow;

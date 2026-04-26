import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import Board from '../../../gameWindow/board/Board';
import { fromXYZ } from '../../../gameWindow/Game';
import type { RankingElementLocal } from '../rankingElements/RankingElementLocal';
import styles from './GameReplayWindow.module.css';

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
  const { t } = useTranslation();
  const moves     = match.moves ?? [];
  const boardSize = match.boardSize ?? 8;
  const totalSteps = moves.length;

  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying,   setIsPlaying]   = useState(false);

  const boardAreaRef = useRef<HTMLDivElement>(null);
  const [boardScale, setBoardScale] = useState(1);
  const naturalBoardW = boardSize * 64;
  const naturalBoardH = boardSize * 49 + 15;

  useEffect(() => {
    const el = boardAreaRef.current;
    if (!el) return;
    const update = () => {
      const { width, height } = el.getBoundingClientRect();
      const pad = 40;
      const scale = Math.min(1, (width - pad) / naturalBoardW, (height - pad) / naturalBoardH);
      setBoardScale(Math.max(0.25, scale));
    };
    update();
    const obs = new ResizeObserver(update);
    obs.observe(el);
    return () => obs.disconnect();
  }, [naturalBoardW, naturalBoardH]);

  useEffect(() => {
    if (!isPlaying) return;
    const id = setInterval(() => {
      setCurrentStep(s => Math.min(s + 1, totalSteps));
    }, PLAY_INTERVAL_MS);
    return () => clearInterval(id);
  }, [isPlaying, totalSteps]);

  useEffect(() => {
    if (totalSteps > 0 && currentStep >= totalSteps) {
      const t = setTimeout(() => setIsPlaying(false), PLAY_INTERVAL_MS);
      return () => clearTimeout(t);
    }
  }, [currentStep, totalSteps]);

  const goFirst    = useCallback(() => { setCurrentStep(0);                                setIsPlaying(false); }, []);
  const goPrev     = useCallback(() => { setCurrentStep(s => Math.max(0, s - 1));         setIsPlaying(false); }, []);
  const goNext     = useCallback(() => { setCurrentStep(s => Math.min(totalSteps, s + 1)); setIsPlaying(false); }, [totalSteps]);
  const goLast     = useCallback(() => { setCurrentStep(totalSteps);                      setIsPlaying(false); }, [totalSteps]);
  const togglePlay = useCallback(() => {
    if (currentStep >= totalSteps) setCurrentStep(0);
    setIsPlaying(p => !p);
  }, [currentStep, totalSteps]);

  const boardMoves = moves.slice(0, currentStep).map((coord, i) => {
    const { row, col } = fromXYZ(coord.x, coord.y, coord.z, boardSize);
    return { row, col, player: (i % 2) as 0 | 1 };
  });

  const hasNoMoves  = totalSteps === 0;
  const progressPct = totalSteps > 0 ? (currentStep / totalSteps) * 100 : 0;

  return (
    <div className="top-right-menu-overlay">
      <div className="top-right-menu-container">
        <button className="top-right-menu-close-btn" onClick={onClose} aria-label="Close">✕</button>

        <header className="top-right-menu-global-header">
          <h2 className="top-right-menu-title">{t('replay.title')}</h2>
        </header>

        <div className={styles.replayBody}>

          <div className={styles.boardArea} ref={boardAreaRef}>
            {hasNoMoves ? (
              <p className={styles.noMovesMsg}>
                {t('replay.noMoveData').split('\n').map((line, i) => (
                  <span key={i}>{line}{i === 0 && <br />}</span>
                ))}
              </p>
            ) : (
              <div
                className={styles.boardWrapper}
                style={{ transform: `scale(${boardScale})`, transformOrigin: 'center center' }}
              >
                <Board size={boardSize} moves={boardMoves} blocked={true} holeCells={new Set()} blockedCells={new Set()} onPlace={() => {}} />
              </div>
            )}
          </div>

          <aside className={styles.infoPanel}>

            <div className={styles.playersSection}>
              <div className={styles.playerRow}>
                <span className={styles.colorDot} style={{ background: 'rgba(77,163,255,0.9)' }} />
                <span className={styles.playerName}>{match.player1Name}</span>
                <span className={styles.playerRole}>{t('rightPanel.player1')}</span>
              </div>
              <span className={styles.vsText}>VS</span>
              <div className={styles.playerRow}>
                <span className={styles.colorDot} style={{ background: 'rgba(255,80,80,0.9)' }} />
                <span className={styles.playerName}>{match.player2Name}</span>
                <span className={styles.playerRole}>{t('rightPanel.player2')}</span>
              </div>
            </div>

            <div className={styles.matchSection}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>{t('replay.result')}</span>
                <span className={`${styles.infoValue} ${styles.resultValue}`}>{match.result}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>{t('replay.duration')}</span>
                <span className={styles.infoValue}>{formatTime(match.time)}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>{t('replay.totalMoves')}</span>
                <span className={styles.infoValue}>{totalSteps > 0 ? totalSteps : '—'}</span>
              </div>
            </div>

            {!hasNoMoves && (
              <>
                <div className={styles.progressSection}>
                  <div className={styles.stepLabel}>
                    {t('replay.move')} <strong>{currentStep}</strong> / {totalSteps}
                  </div>
                  <div className={styles.progressTrack}>
                    <div className={styles.progressFill} style={{ width: `${progressPct}%` }} />
                  </div>
                </div>

                <div className={styles.controls}>
                  <div className={styles.controlsRow}>
                    <button className={styles.ctrlBtn} onClick={goFirst} disabled={currentStep === 0}          title="First move">⏮</button>
                    <button className={styles.ctrlBtn} onClick={goPrev}  disabled={currentStep === 0}          title="Previous">◀</button>
                    <button className={`${styles.ctrlBtn} ${styles.playBtn}`} onClick={togglePlay}             title={isPlaying ? 'Pause' : 'Play'}>
                      {isPlaying ? '⏸' : '▶'}
                    </button>
                    <button className={styles.ctrlBtn} onClick={goNext}  disabled={currentStep === totalSteps} title="Next">▶</button>
                    <button className={styles.ctrlBtn} onClick={goLast}  disabled={currentStep === totalSteps} title="Last move">⏭</button>
                  </div>
                </div>
              </>
            )}

          </aside>
        </div>
      </div>
    </div>
  );
};

export default GameReplayWindow;

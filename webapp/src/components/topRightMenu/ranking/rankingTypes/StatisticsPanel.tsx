import { useMemo } from 'react';
import type { RankingElementLocal } from '../rankingElements/RankingElementLocal';
import StatisticsPanelView, { RECENT_FORM_MAX, WIN_COLOR, LOSS_COLOR } from './StatisticsPanelView';
import styles from './StatisticsPanel.module.css';

interface Props {
  data: RankingElementLocal[];
  username: string;
}

const StatisticsPanel = ({ data, username }: Props) => {
  const stats = useMemo(() => {
    if (data.length === 0) return null;

    const wins   = data.filter(m => m.result.toLowerCase().includes('win')).length;
    const losses = data.length - wins;

    const avgTime = data.reduce((acc, m) => acc + m.time, 0) / data.length;

    // Fastest win
    const winMatches = data.filter(m => m.result.toLowerCase().includes('win'));
    const fastestWin = winMatches.length > 0
      ? Math.min(...winMatches.map(m => m.time))
      : null;

    // Current streak (walk backwards while result is the same)
    let currentStreak = 0;
    let streakIsWin   = false;
    for (let i = data.length - 1; i >= 0; i--) {
      const isWin = data[i].result.toLowerCase().includes('win');
      if (i === data.length - 1) {
        streakIsWin   = isWin;
        currentStreak = 1;
      } else if (isWin === streakIsWin) {
        currentStreak++;
      } else {
        break;
      }
    }

    // Win/loss count per opponent (top 5 by total games)
    const opponentMap: Record<string, { wins: number; losses: number }> = {};
    data.forEach(m => {
      const opponent = m.player1Name === username ? m.player2Name : m.player1Name;
      const isWin    = m.result.toLowerCase().includes('win');
      if (!opponentMap[opponent]) opponentMap[opponent] = { wins: 0, losses: 0 };
      if (isWin) opponentMap[opponent].wins++;
      else       opponentMap[opponent].losses++;
    });
    const topOpponents = Object.entries(opponentMap)
      .sort((a, b) => (b[1].wins + b[1].losses) - (a[1].wins + a[1].losses))
      .slice(0, 5)
      .map(([name, { wins: w, losses: l }]) => ({ name, wins: w, losses: l }));

    // ELO evolution — same formula as the backend: +20 win / -15 loss / floor 0
    let elo = 0;
    const eloHistory = data.map((m, i) => {
      const isWin = m.result.toLowerCase().includes('win');
      elo = Math.max(0, isWin ? elo + 20 : elo - 15);
      return { match: i + 1, elo };
    });

    // Last RECENT_FORM_MAX results as booleans (oldest → newest)
    const recentForm = data.slice(-RECENT_FORM_MAX).map(m => m.result.toLowerCase().includes('win'));

    return { wins, losses, avgTime, fastestWin, currentStreak, streakIsWin, topOpponents, eloHistory, recentForm };
  }, [data, username]);

  if (!stats) {
    return (
      <div className={styles.emptyState}>
        No match data yet. Play some games to see your statistics!
      </div>
    );
  }

  const winRatePct = Math.round((stats.wins / data.length) * 100);
  const pieData = [
    { name: 'Wins',   value: stats.wins,   fill: WIN_COLOR  },
    { name: 'Losses', value: stats.losses, fill: LOSS_COLOR },
  ];

  return (
    <StatisticsPanelView
      totalGames={data.length}
      winRatePct={winRatePct}
      pieData={pieData}
      {...stats}
    />
  );
};

export default StatisticsPanel;

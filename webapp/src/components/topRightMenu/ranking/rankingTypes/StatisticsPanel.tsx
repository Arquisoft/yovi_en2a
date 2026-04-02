import { useMemo } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line,
} from 'recharts';
import type { RankingElementLocal } from '../rankingElements/RankingElementLocal';
import styles from './StatisticsPanel.module.css';

const formatTime = (seconds: number): string => {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

const WIN_COLOR  = '#4ade80';
const LOSS_COLOR = '#f87171';
const ELO_COLOR  = '#60a5fa';

const TOOLTIP_STYLE = {
  contentStyle: { background: '#1a1a1a', border: '1px solid #333', borderRadius: 6 },
  itemStyle: { color: '#fff' },
};

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

    // Current streak (count from the last game backwards while result is the same)
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

    // ELO evolution — simulated with the same formula as the backend:
    // +20 on win, -15 on loss, floor at 0
    let elo = 0;
    const eloHistory = data.map((m, i) => {
      const isWin = m.result.toLowerCase().includes('win');
      elo = Math.max(0, isWin ? elo + 20 : elo - 15);
      return { match: i + 1, elo };
    });

    // Last 10 results as booleans (oldest → newest)
    const recentForm = data.slice(-10).map(m => m.result.toLowerCase().includes('win'));

    return {
      wins, losses, avgTime,
      fastestWin, currentStreak, streakIsWin,
      topOpponents, eloHistory, recentForm,
    };
  }, [data, username]);

  if (!stats) {
    return (
      <div className={styles.emptyState}>
        No match data yet. Play some games to see your statistics!
      </div>
    );
  }

  const pieData    = [
    { name: 'Wins',   value: stats.wins   },
    { name: 'Losses', value: stats.losses },
  ];
  const winRatePct = Math.round((stats.wins / data.length) * 100);

  return (
    <div className={styles.panel}>

      {/* ── Stat cards ── */}
      <div className={styles.cardRow}>
        <div className={styles.card}>
          <span className={styles.cardValue}>{data.length}</span>
          <span className={styles.cardLabel}>Total Games</span>
        </div>
        <div className={styles.card}>
          <span className={styles.cardValue} style={{ color: WIN_COLOR }}>{stats.wins}</span>
          <span className={styles.cardLabel}>Wins</span>
        </div>
        <div className={styles.card}>
          <span className={styles.cardValue}>{winRatePct}%</span>
          <span className={styles.cardLabel}>Win Rate</span>
        </div>
        <div className={styles.card}>
          <span
            className={styles.cardValue}
            style={{ color: stats.streakIsWin ? WIN_COLOR : LOSS_COLOR }}
          >
            {stats.currentStreak}{stats.streakIsWin ? 'W' : 'L'}
          </span>
          <span className={styles.cardLabel}>Streak</span>
        </div>
        <div className={styles.card}>
          <span className={styles.cardValue}>
            {stats.fastestWin !== null ? formatTime(stats.fastestWin) : '—'}
          </span>
          <span className={styles.cardLabel}>Fastest Win</span>
        </div>
        <div className={styles.card}>
          <span className={styles.cardValue}>{formatTime(Math.round(stats.avgTime))}</span>
          <span className={styles.cardLabel}>Avg Duration</span>
        </div>
      </div>

      {/* ── Charts row: donut + head-to-head ── */}
      <div className={styles.chartsRow}>

        {/* Win / Loss donut */}
        <div className={styles.chartBox}>
          <h4 className={styles.chartTitle}>Win / Loss Ratio</h4>
          <ResponsiveContainer width="100%" height={170}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={68}
                dataKey="value"
                paddingAngle={3}
              >
                {pieData.map((_, i) => (
                  <Cell key={i} fill={i === 0 ? WIN_COLOR : LOSS_COLOR} />
                ))}
              </Pie>
              <Tooltip {...TOOLTIP_STYLE} />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: '0.68rem', color: '#aaa' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Head-to-head vs top opponents (stacked wins/losses) */}
        <div className={styles.chartBox}>
          <h4 className={styles.chartTitle}>Head-to-Head vs Top Opponents</h4>
          {stats.topOpponents.length === 0 ? (
            <p className={styles.noData}>No opponent data</p>
          ) : (
            <ResponsiveContainer width="100%" height={170}>
              <BarChart
                data={stats.topOpponents}
                layout="vertical"
                margin={{ left: 8, right: 16, top: 4, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" horizontal={false} />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  tick={{ fill: '#666', fontSize: 10 }}
                  axisLine={{ stroke: '#333' }}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={64}
                  tick={{ fill: '#aaa', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip {...TOOLTIP_STYLE} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: '0.68rem', color: '#aaa' }} />
                <Bar dataKey="wins"   name="Wins"   stackId="a" fill={WIN_COLOR}  radius={[0, 0, 0, 0]} />
                <Bar dataKey="losses" name="Losses" stackId="a" fill={LOSS_COLOR} radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── ELO Evolution ── */}
      {stats.eloHistory.length > 1 && (
        <div className={styles.chartBoxFull}>
          <h4 className={styles.chartTitle}>ELO Evolution</h4>
          <ResponsiveContainer width="100%" height={120}>
            <LineChart
              data={stats.eloHistory}
              margin={{ left: 4, right: 16, top: 4, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
              <XAxis
                dataKey="match"
                tick={{ fill: '#555', fontSize: 9 }}
                axisLine={{ stroke: '#333' }}
                tickLine={false}
                label={{ value: 'Match #', position: 'insideBottomRight', offset: -4, fill: '#444', fontSize: 9 }}
              />
              <YAxis
                tick={{ fill: '#555', fontSize: 9 }}
                axisLine={{ stroke: '#333' }}
                tickLine={false}
                width={32}
              />
              <Tooltip
                {...TOOLTIP_STYLE}
                formatter={(v: number) => [v, 'ELO']}
              />
              <Line
                type="monotone"
                dataKey="elo"
                stroke={ELO_COLOR}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: ELO_COLOR }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Recent form ── */}
      <div className={styles.formBox}>
        <h4 className={styles.chartTitle}>
          Recent Form — last {stats.recentForm.length} games
        </h4>
        <div className={styles.formDots}>
          {stats.recentForm.map((win, i) => (
            <span
              key={i}
              className={styles.formDot}
              style={{ background: win ? WIN_COLOR : LOSS_COLOR }}
              title={win ? 'Win' : 'Loss'}
            />
          ))}
        </div>
      </div>

    </div>
  );
};

export default StatisticsPanel;

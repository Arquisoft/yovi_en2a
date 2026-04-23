import { useTranslation } from 'react-i18next';
import {
  PieChart, Pie, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line,
} from 'recharts';
import styles from './StatisticsPanel.module.css';

export const RECENT_FORM_MAX = 10;

const formatTime = (seconds: number): string => {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

export const WIN_COLOR  = '#4ade80';
export const LOSS_COLOR = '#f87171';
const ELO_COLOR  = '#60a5fa';

const TOOLTIP_STYLE = {
  contentStyle: { background: '#1a1a1a', border: '1px solid #333', borderRadius: 6 },
  itemStyle: { color: '#fff' },
};

export interface StatisticsPanelViewProps {
  totalGames: number;
  winRatePct: number;
  wins: number;
  losses: number;
  avgTime: number;
  fastestWin: number | null;
  currentStreak: number;
  streakIsWin: boolean;
  topOpponents: { name: string; wins: number; losses: number }[];
  eloHistory: { match: number; elo: number }[];
  recentForm: boolean[];
  pieData: { name: string; value: number; fill: string }[];
}

const StatisticsPanelView = ({
  totalGames, winRatePct, wins, avgTime,
  fastestWin, currentStreak, streakIsWin,
  topOpponents, eloHistory, recentForm, pieData,
}: StatisticsPanelViewProps) => {
  const { t } = useTranslation();

  return (
    <div className={styles.panel}>

      <div className={styles.cardRow}>
        <div className={styles.card}>
          <span className={styles.cardValue}>{totalGames}</span>
          <span className={styles.cardLabel}>{t('statistics.totalGames')}</span>
        </div>
        <div className={styles.card}>
          <span className={styles.cardValue} style={{ color: WIN_COLOR }}>{wins}</span>
          <span className={styles.cardLabel}>{t('statistics.wins')}</span>
        </div>
        <div className={styles.card}>
          <span className={styles.cardValue}>{winRatePct}%</span>
          <span className={styles.cardLabel}>{t('statistics.winRate')}</span>
        </div>
        <div className={styles.card}>
          <span
            className={styles.cardValue}
            style={{ color: streakIsWin ? WIN_COLOR : LOSS_COLOR }}
          >
            {currentStreak}{streakIsWin ? 'W' : 'L'}
          </span>
          <span className={styles.cardLabel}>{t('statistics.streak')}</span>
        </div>
        <div className={styles.card}>
          <span className={styles.cardValue}>
            {fastestWin === null ? '—' : formatTime(fastestWin)}
          </span>
          <span className={styles.cardLabel}>{t('statistics.fastestWin')}</span>
        </div>
        <div className={styles.card}>
          <span className={styles.cardValue}>{formatTime(Math.round(avgTime))}</span>
          <span className={styles.cardLabel}>{t('statistics.avgDuration')}</span>
        </div>
      </div>

      <div className={styles.chartsRow}>

        <div className={styles.chartBox}>
          <h4 className={styles.chartTitle}>{t('statistics.winLossRatio')}</h4>
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
              />
              <Tooltip {...TOOLTIP_STYLE} />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: '0.68rem', color: '#aaa' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className={styles.chartBox}>
          <h4 className={styles.chartTitle}>{t('statistics.headToHead')}</h4>
          {topOpponents.length === 0 ? (
            <p className={styles.noData}>{t('statistics.noOpponentData')}</p>
          ) : (
            <ResponsiveContainer width="100%" height={170}>
              <BarChart
                data={topOpponents}
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
                <Bar dataKey="wins"   name={t('statistics.wins')}   stackId="a" fill={WIN_COLOR}  radius={[0, 0, 0, 0]} />
                <Bar dataKey="losses" name="Losses" stackId="a" fill={LOSS_COLOR} radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {eloHistory.length > 1 && (
        <div className={styles.chartBoxFull}>
          <h4 className={styles.chartTitle}>{t('statistics.eloEvolution')}</h4>
          <ResponsiveContainer width="100%" height={120}>
            <LineChart
              data={eloHistory}
              margin={{ left: 4, right: 16, top: 4, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
              <XAxis
                dataKey="match"
                tick={{ fill: '#555', fontSize: 9 }}
                axisLine={{ stroke: '#333' }}
                tickLine={false}
                label={{ value: t('statistics.matchLabel'), position: 'insideBottomRight', offset: -4, fill: '#444', fontSize: 9 }}
              />
              <YAxis
                tick={{ fill: '#555', fontSize: 9 }}
                axisLine={{ stroke: '#333' }}
                tickLine={false}
                width={32}
              />
              <Tooltip
                {...TOOLTIP_STYLE}
                formatter={(v) => [v, 'ELO']}
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

      <div className={styles.formBox}>
        <h4 className={styles.chartTitle}>
          {t('statistics.recentForm', { count: Math.min(totalGames, RECENT_FORM_MAX) })}
        </h4>
        <div className={styles.formDots}>
          {recentForm.map((win, i) => (
            <span
              key={`form-${i}`}
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

export default StatisticsPanelView;

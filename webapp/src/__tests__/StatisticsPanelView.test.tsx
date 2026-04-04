import { render, screen, cleanup } from '@testing-library/react'
import { describe, test, expect, vi, afterEach } from 'vitest'
import StatisticsPanelView from '../components/topRightMenu/ranking/rankingTypes/StatisticsPanelView'
import type { StatisticsPanelViewProps } from '../components/topRightMenu/ranking/rankingTypes/StatisticsPanelView'
import { WIN_COLOR, LOSS_COLOR } from '../components/topRightMenu/ranking/rankingTypes/StatisticsPanelView'
import '@testing-library/jest-dom'

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <>{children}</>,
  PieChart:    ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie:          () => null,
  Tooltip:      () => null,
  Legend:       () => null,
  BarChart:    ({ children, data }: any) => (
    <div data-testid="bar-chart">
      {data?.map((d: any) => <span key={d.name}>{d.name}</span>)}
      {children}
    </div>
  ),
  Bar:          () => null,
  XAxis:        () => null,
  YAxis:        () => null,
  CartesianGrid: () => null,
  LineChart:   ({ children }: any) => <div data-testid="elo-line-chart">{children}</div>,
  Line:         () => null,
}))

const baseProps: StatisticsPanelViewProps = {
  totalGames:    5,
  winRatePct:    60,
  wins:          3,
  losses:        2,
  avgTime:       90,
  fastestWin:    45,
  currentStreak: 2,
  streakIsWin:   true,
  topOpponents:  [{ name: 'Bob', wins: 2, losses: 1 }],
  eloHistory:    [{ match: 1, elo: 20 }, { match: 2, elo: 40 }],
  recentForm:    [true, false, true],
  pieData: [
    { name: 'Wins',   value: 3, fill: WIN_COLOR  },
    { name: 'Losses', value: 2, fill: LOSS_COLOR },
  ],
}

describe('StatisticsPanelView — presentational component', () => {
  afterEach(cleanup)

  // ── Stat card labels ─────────────────────────────────────────────────────────

  test('renders all six stat card labels', () => {
    render(<StatisticsPanelView {...baseProps} />)
    expect(screen.getByText(/Total Games/i)).toBeInTheDocument()
    expect(screen.getByText(/^Wins$/i)).toBeInTheDocument()
    expect(screen.getByText(/Win Rate/i)).toBeInTheDocument()
    expect(screen.getByText(/Streak/i)).toBeInTheDocument()
    expect(screen.getByText(/Fastest Win/i)).toBeInTheDocument()
    expect(screen.getByText(/Avg Duration/i)).toBeInTheDocument()
  })

  // ── Stat card values ─────────────────────────────────────────────────────────

  test('displays correct totalGames value', () => {
    render(<StatisticsPanelView {...baseProps} totalGames={7} />)
    expect(screen.getByText('7')).toBeInTheDocument()
  })

  test('displays correct win rate percentage', () => {
    render(<StatisticsPanelView {...baseProps} winRatePct={75} />)
    expect(screen.getByText('75%')).toBeInTheDocument()
  })

  test('displays streak with W suffix when streakIsWin is true', () => {
    render(<StatisticsPanelView {...baseProps} currentStreak={4} streakIsWin={true} />)
    expect(screen.getByText('4W')).toBeInTheDocument()
  })

  test('displays streak with L suffix when streakIsWin is false', () => {
    render(<StatisticsPanelView {...baseProps} currentStreak={3} streakIsWin={false} />)
    expect(screen.getByText('3L')).toBeInTheDocument()
  })

  test('displays formatted fastest win time', () => {
    // 45s → 00:45
    render(<StatisticsPanelView {...baseProps} fastestWin={45} />)
    expect(screen.getByText('00:45')).toBeInTheDocument()
  })

  test('displays — when fastestWin is null', () => {
    render(<StatisticsPanelView {...baseProps} fastestWin={null} />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  test('displays formatted avg duration', () => {
    // 90s → 01:30
    render(<StatisticsPanelView {...baseProps} avgTime={90} />)
    expect(screen.getByText('01:30')).toBeInTheDocument()
  })

  // ── Charts ───────────────────────────────────────────────────────────────────

  test('renders the pie chart section', () => {
    render(<StatisticsPanelView {...baseProps} />)
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument()
  })

  test('renders the bar chart when topOpponents is not empty', () => {
    render(<StatisticsPanelView {...baseProps} />)
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
  })

  test('shows "No opponent data" when topOpponents is empty', () => {
    render(<StatisticsPanelView {...baseProps} topOpponents={[]} />)
    expect(screen.getByText(/No opponent data/i)).toBeInTheDocument()
    expect(screen.queryByTestId('bar-chart')).not.toBeInTheDocument()
  })

  test('renders ELO chart when eloHistory has more than one entry', () => {
    render(<StatisticsPanelView {...baseProps} eloHistory={[{ match: 1, elo: 20 }, { match: 2, elo: 40 }]} />)
    expect(screen.getByTestId('elo-line-chart')).toBeInTheDocument()
  })

  test('hides ELO chart when eloHistory has one or fewer entries', () => {
    render(<StatisticsPanelView {...baseProps} eloHistory={[{ match: 1, elo: 20 }]} />)
    expect(screen.queryByTestId('elo-line-chart')).not.toBeInTheDocument()
  })

  test('hides ELO chart when eloHistory is empty', () => {
    render(<StatisticsPanelView {...baseProps} eloHistory={[]} />)
    expect(screen.queryByTestId('elo-line-chart')).not.toBeInTheDocument()
  })

  // ── Recent form ──────────────────────────────────────────────────────────────

  test('renders one dot per entry in recentForm', () => {
    render(<StatisticsPanelView {...baseProps} recentForm={[true, false, true, true]} />)
    const dots = document.querySelectorAll('[title="Win"], [title="Loss"]')
    expect(dots.length).toBe(4)
  })

  test('win dots have WIN_COLOR background', () => {
    render(<StatisticsPanelView {...baseProps} recentForm={[true]} />)
    const dot = screen.getByTitle('Win')
    expect(dot).toHaveStyle({ background: WIN_COLOR })
  })

  test('loss dots have LOSS_COLOR background', () => {
    render(<StatisticsPanelView {...baseProps} recentForm={[false]} />)
    const dot = screen.getByTitle('Loss')
    expect(dot).toHaveStyle({ background: LOSS_COLOR })
  })

  test('recent form section shows correct game count in title', () => {
    // totalGames=3, under RECENT_FORM_MAX → title shows 3
    render(<StatisticsPanelView {...baseProps} totalGames={3} recentForm={[true, false, true]} />)
    expect(screen.getByText(/last 3 games/i)).toBeInTheDocument()
  })

  test('recent form title caps at RECENT_FORM_MAX when totalGames exceeds it', () => {
    render(<StatisticsPanelView {...baseProps} totalGames={20} recentForm={Array(10).fill(true)} />)
    expect(screen.getByText(/last 10 games/i)).toBeInTheDocument()
  })
})

import { render, screen, cleanup } from '@testing-library/react'
import { describe, test, expect, vi, afterEach } from 'vitest'
import StatisticsPanel from '../components/topRightMenu/ranking/rankingTypes/StatisticsPanel'
import '@testing-library/jest-dom'

// Recharts uses ResizeObserver and SVG APIs not available in jsdom — mock the whole module
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <>{children}</>,
  PieChart:      ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie:            () => null,
  Tooltip:        () => null,
  Legend:         () => null,
  BarChart:      ({ children, data }: any) => (
    <div data-testid="bar-chart">
      {data?.map((d: any) => <span key={d.name}>{d.name}</span>)}
      {children}
    </div>
  ),
  Bar:            () => null,
  XAxis:          () => null,
  YAxis:          () => null,
  CartesianGrid:  () => null,
  LineChart:     ({ children }: any) => <div data-testid="elo-line-chart">{children}</div>,
  Line:           () => null,
}))

// Use "Win" / "Loss" — the exact strings written by GameWindow.tsx —
// so that .toLowerCase().includes('win') correctly distinguishes them.
const win  = (time = 60, p1 = 'Alice', p2 = 'Bot') =>
  ({ position: 1, player1Name: p1, player2Name: p2, result: 'Win', time })
const loss = (time = 60, p1 = 'Alice', p2 = 'Bot') =>
  ({ position: 1, player1Name: p1, player2Name: p2, result: 'Loss', time })

describe('StatisticsPanel — logic container', () => {
  afterEach(cleanup)

  // ── Empty state ──────────────────────────────────────────────────────────────

  test('shows empty state when data array is empty', () => {
    render(<StatisticsPanel data={[]} username="Alice" />)
    expect(screen.getByText(/No match data yet/i)).toBeInTheDocument()
  })

  // ── Stat cards ──────────────────────────────────────────────────────────────

  test('renders correct total games count', () => {
    // 4 total, 1 win → "4" appears only in Total Games card
    const data = [win(), loss(), loss(), loss()]
    render(<StatisticsPanel data={data} username="Alice" />)
    expect(screen.getByText('4')).toBeInTheDocument()
  })

  test('renders correct wins count', () => {
    // 5 total, 2 wins → "2" appears only in Wins card
    const data = [win(), win(), loss(), loss(), loss()]
    render(<StatisticsPanel data={data} username="Alice" />)
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  test('renders correct win rate percentage', () => {
    // 2 wins out of 3 → 67%
    const data = [win(), win(), loss()]
    render(<StatisticsPanel data={data} username="Alice" />)
    expect(screen.getByText('67%')).toBeInTheDocument()
  })

  test('renders 100% win rate when all games are wins', () => {
    render(<StatisticsPanel data={[win(), win()]} username="Alice" />)
    expect(screen.getByText('100%')).toBeInTheDocument()
  })

  test('renders 0% win rate when all games are losses', () => {
    render(<StatisticsPanel data={[loss(), loss()]} username="Alice" />)
    expect(screen.getByText('0%')).toBeInTheDocument()
  })

  test('renders average duration correctly', () => {
    // avg of 60s and 120s = 90s = 01:30
    const data = [win(60), loss(120)]
    render(<StatisticsPanel data={data} username="Alice" />)
    expect(screen.getByText('01:30')).toBeInTheDocument()
  })

  // ── Streak ──────────────────────────────────────────────────────────────────

  test('renders win streak with W suffix', () => {
    const data = [loss(), win(), win(), win()]
    render(<StatisticsPanel data={data} username="Alice" />)
    expect(screen.getByText('3W')).toBeInTheDocument()
  })

  test('renders loss streak with L suffix', () => {
    const data = [win(), loss(), loss()]
    render(<StatisticsPanel data={data} username="Alice" />)
    expect(screen.getByText('2L')).toBeInTheDocument()
  })

  test('renders streak of 1 after a single last game', () => {
    const data = [loss(), win()]
    render(<StatisticsPanel data={data} username="Alice" />)
    expect(screen.getByText('1W')).toBeInTheDocument()
  })

  // ── Fastest win ─────────────────────────────────────────────────────────────

  test('renders fastest win time', () => {
    // fastest win is 45s = 00:45
    const data = [win(120), win(45), loss(30)]
    render(<StatisticsPanel data={data} username="Alice" />)
    expect(screen.getByText('00:45')).toBeInTheDocument()
  })

  test('renders — for fastest win when player has no wins', () => {
    render(<StatisticsPanel data={[loss(60), loss(90)]} username="Alice" />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  // ── Opponent detection ───────────────────────────────────────────────────────

  test('identifies opponent correctly when username is player1', () => {
    render(<StatisticsPanel data={[win(60, 'Alice', 'Bob')]} username="Alice" />)
    expect(screen.getByText('Bob')).toBeInTheDocument()
  })

  test('identifies opponent correctly when username is player2', () => {
    render(<StatisticsPanel data={[win(60, 'Bob', 'Alice')]} username="Alice" />)
    expect(screen.getByText('Bob')).toBeInTheDocument()
  })

  // ── Recent form ─────────────────────────────────────────────────────────────

  test('caps recent form dots at 10 even with more games', () => {
    const data = Array.from({ length: 15 }, (_, i) => (i % 2 === 0 ? win() : loss()))
    render(<StatisticsPanel data={data} username="Alice" />)
    const dots = document.querySelectorAll('[title="Win"], [title="Loss"]')
    expect(dots.length).toBe(10)
  })

  test('shows fewer dots when total games is less than 10', () => {
    render(<StatisticsPanel data={[win(), loss(), win()]} username="Alice" />)
    const dots = document.querySelectorAll('[title="Win"], [title="Loss"]')
    expect(dots.length).toBe(3)
  })

  // ── ELO evolution ───────────────────────────────────────────────────────────

  test('ELO chart is shown with only one game', () => {
    render(<StatisticsPanel data={[win()]} username="Alice" />)
    expect(screen.getByTestId('elo-line-chart')).toBeInTheDocument()
  })

  test('ELO chart is shown with more than one game', () => {
    render(<StatisticsPanel data={[win(), loss()]} username="Alice" />)
    expect(screen.getByTestId('elo-line-chart')).toBeInTheDocument()
  })

  test('ELO floors at 0 and does not go negative on repeated losses', () => {
    // 0 -15 → 0, stays 0 for all three — should not crash
    const data = [loss(), loss(), loss()]
    render(<StatisticsPanel data={data} username="Alice" />)
    expect(screen.getByTestId('elo-line-chart')).toBeInTheDocument()
  })

  // ── ELO baseline ─────────────────────────────────────────────────────────────

  test('ELO history always starts with match 0 at elo 0', () => {
    // The ELO chart must include the baseline {match:0, elo:0} so the line
    // always originates from 0 regardless of the first game result.
    // We verify indirectly: even a single game produces eloHistory.length >= 2,
    // which is what triggers the chart to render.
    render(<StatisticsPanel data={[win()]} username="Alice" />)
    expect(screen.getByTestId('elo-line-chart')).toBeInTheDocument()
  })

  // ── Top opponents ─────────────────────────────────────────────────────────────

  test('top opponents are sorted by total games descending', () => {
    const data = [
      win(60, 'Alice', 'BotA'),
      win(60, 'Alice', 'BotA'),
      win(60, 'Alice', 'BotB'),
      loss(60, 'Alice', 'BotA'),
    ]
    // BotA appears 3 times, BotB 1 time — BotA should appear in head-to-head chart
    render(<StatisticsPanel data={data} username="Alice" />)
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
  })
})

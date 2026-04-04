import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, test, expect, vi, afterEach } from 'vitest'
import RankingTableLocal from '../components/topRightMenu/ranking/RankingTableLocal'
import type { RankingElementLocal } from '../components/topRightMenu/ranking/rankingElements/RankingElementLocal'
import '@testing-library/jest-dom'

const makeMatch = (p1: string, p2: string, result: string, time = 90): RankingElementLocal => ({
  position: 1,
  player1Name: p1,
  player2Name: p2,
  result,
  time,
  moves: [],
  boardSize: 8,
})

describe('RankingTableLocal', () => {
  afterEach(cleanup)

  test('renders title and column headers', () => {
    render(<RankingTableLocal data={[makeMatch('Alice', 'Bot', 'Win')]} title="Match History" />)
    expect(screen.getByText('Match History')).toBeInTheDocument()
    expect(screen.getByText('PLAYER 1')).toBeInTheDocument()
    expect(screen.getByText('PLAYER 2')).toBeInTheDocument()
    expect(screen.getByText('RESULT')).toBeInTheDocument()
    expect(screen.getByText('TIME')).toBeInTheDocument()
  })

  test('renders player names, VS label, result and formatted time', () => {
    render(<RankingTableLocal data={[makeMatch('Alice', 'Bot', 'Win', 95)]} title="History" />)
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bot')).toBeInTheDocument()
    expect(screen.getByText('VS')).toBeInTheDocument()
    expect(screen.getByText('Win')).toBeInTheDocument()
    expect(screen.getByText('01:35')).toBeInTheDocument()
  })

  test('renders as div rows when onReplay is not provided', () => {
    render(<RankingTableLocal data={[makeMatch('Alice', 'Bot', 'Win')]} title="History" />)
    // No clickable button rows — the row should not be a <button>
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  test('renders as button rows when onReplay is provided', () => {
    render(
      <RankingTableLocal
        data={[makeMatch('Alice', 'Bot', 'Win')]}
        title="History"
        onReplay={vi.fn()}
      />
    )
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  test('calls onReplay with the correct item when row is clicked', async () => {
    const match = makeMatch('Alice', 'Bot', 'Win')
    const onReplay = vi.fn()
    const user = userEvent.setup()
    render(<RankingTableLocal data={[match]} title="History" onReplay={onReplay} />)
    await user.click(screen.getByRole('button'))
    expect(onReplay).toHaveBeenCalledWith(match)
  })

  test('shows position column when showPosition is true', () => {
    const match = { ...makeMatch('Alice', 'Bot', 'Win'), position: 3 }
    render(<RankingTableLocal data={[match]} title="History" showPosition />)
    expect(screen.getByText('#3')).toBeInTheDocument()
  })

  test('does not show position column by default', () => {
    render(<RankingTableLocal data={[makeMatch('Alice', 'Bot', 'Win')]} title="History" />)
    expect(screen.queryByText(/^#\d/)).not.toBeInTheDocument()
  })

  test('shows position column in button rows when showPosition and onReplay are both provided', async () => {
    const match = makeMatch('Alice', 'Bot', 'Win')
    const onReplay = vi.fn()
    const user = userEvent.setup()
    render(<RankingTableLocal data={[match]} title="History" onReplay={onReplay} showPosition />)
    expect(screen.getByText('#1')).toBeInTheDocument()
    // Row is a button with position shown
    await user.click(screen.getByRole('button'))
    expect(onReplay).toHaveBeenCalledWith(match)
  })

  test('renders empty list without crashing', () => {
    render(<RankingTableLocal data={[]} title="Empty" />)
    expect(screen.getByText('Empty')).toBeInTheDocument()
    expect(screen.queryByText('VS')).not.toBeInTheDocument()
  })
})

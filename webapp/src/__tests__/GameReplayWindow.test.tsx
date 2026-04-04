import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, test, expect, vi, afterEach, beforeEach } from 'vitest'
import GameReplayWindow from '../components/topRightMenu/ranking/rankingTypes/GameReplayWindow'
import type { RankingElementLocal } from '../components/topRightMenu/ranking/rankingElements/RankingElementLocal'
import '@testing-library/jest-dom'

// Mock Board so jsdom doesn't try to render canvas/SVG
vi.mock('../components/gameWindow/board/Board', () => ({
  default: () => <div data-testid="board" />,
}))

// Mock fromXYZ — we only care about UI behaviour, not coordinate maths
vi.mock('../components/gameWindow/Game', () => ({
  fromXYZ: () => ({ row: 0, col: 0 }),
}))

// ResizeObserver is not available in jsdom — stub it with a plain class
class ResizeObserverStub {
  observe()    {}
  unobserve()  {}
  disconnect() {}
}
beforeEach(() => {
  globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

// ─── Fixtures ───────────────────────────────────────────────────────────────

const MATCH_WITH_MOVES: RankingElementLocal = {
  position: 1,
  player1Name: 'Alice',
  player2Name: 'Bob',
  result: 'Win',
  time: 95, // → 01:35
  moves: [
    { x: 0, y: 0, z: 0 },
    { x: 1, y: -1, z: 0 },
    { x: 0, y: 1, z: -1 },
  ],
  boardSize: 5,
}

const MATCH_NO_MOVES: RankingElementLocal = {
  ...MATCH_WITH_MOVES,
  moves: [],
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('GameReplayWindow', () => {

  // ── Header & info ────────────────────────────────────────────────────────

  test('renders REPLAY title', () => {
    render(<GameReplayWindow match={MATCH_WITH_MOVES} onClose={vi.fn()} />)
    expect(screen.getByText('REPLAY')).toBeInTheDocument()
  })

  test('shows both player names', () => {
    render(<GameReplayWindow match={MATCH_WITH_MOVES} onClose={vi.fn()} />)
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
  })

  test('shows result value in the info panel', () => {
    render(<GameReplayWindow match={MATCH_WITH_MOVES} onClose={vi.fn()} />)
    expect(screen.getByText('Win')).toBeInTheDocument()
  })

  test('formats duration from seconds to MM:SS', () => {
    render(<GameReplayWindow match={MATCH_WITH_MOVES} onClose={vi.fn()} />)
    expect(screen.getByText('01:35')).toBeInTheDocument()
  })

  test('shows total move count in the info row', () => {
    render(<GameReplayWindow match={MATCH_WITH_MOVES} onClose={vi.fn()} />)
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  test('shows dash for total moves when moves array is missing', () => {
    const match = { ...MATCH_WITH_MOVES, moves: undefined }
    render(<GameReplayWindow match={match} onClose={vi.fn()} />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  // ── No-moves state ────────────────────────────────────────────────────────

  test('shows "No move data available" message when moves is empty', () => {
    render(<GameReplayWindow match={MATCH_NO_MOVES} onClose={vi.fn()} />)
    expect(screen.getByText(/No move data available/i)).toBeInTheDocument()
  })

  test('does NOT render control buttons when there are no moves', () => {
    render(<GameReplayWindow match={MATCH_NO_MOVES} onClose={vi.fn()} />)
    expect(screen.queryByTitle('Play')).not.toBeInTheDocument()
    expect(screen.queryByTitle('First move')).not.toBeInTheDocument()
  })

  // ── Board ─────────────────────────────────────────────────────────────────

  test('renders the board when moves are present', () => {
    render(<GameReplayWindow match={MATCH_WITH_MOVES} onClose={vi.fn()} />)
    expect(screen.getByTestId('board')).toBeInTheDocument()
  })

  test('does NOT render the board when there are no moves', () => {
    render(<GameReplayWindow match={MATCH_NO_MOVES} onClose={vi.fn()} />)
    expect(screen.queryByTestId('board')).not.toBeInTheDocument()
  })

  // ── Controls presence & initial state ────────────────────────────────────

  test('renders all five control buttons when moves are present', () => {
    render(<GameReplayWindow match={MATCH_WITH_MOVES} onClose={vi.fn()} />)
    expect(screen.getByTitle('First move')).toBeInTheDocument()
    expect(screen.getByTitle('Previous')).toBeInTheDocument()
    expect(screen.getByTitle('Play')).toBeInTheDocument()
    expect(screen.getByTitle('Next')).toBeInTheDocument()
    expect(screen.getByTitle('Last move')).toBeInTheDocument()
  })

  test('First and Previous are disabled at step 0 (initial state)', () => {
    render(<GameReplayWindow match={MATCH_WITH_MOVES} onClose={vi.fn()} />)
    expect(screen.getByTitle('First move')).toBeDisabled()
    expect(screen.getByTitle('Previous')).toBeDisabled()
  })

  test('Next and Last are enabled at step 0', () => {
    render(<GameReplayWindow match={MATCH_WITH_MOVES} onClose={vi.fn()} />)
    expect(screen.getByTitle('Next')).toBeEnabled()
    expect(screen.getByTitle('Last move')).toBeEnabled()
  })

  // ── Navigation ────────────────────────────────────────────────────────────

  test('clicking Next enables First and Previous', async () => {
    const user = userEvent.setup()
    render(<GameReplayWindow match={MATCH_WITH_MOVES} onClose={vi.fn()} />)
    await user.click(screen.getByTitle('Next'))
    expect(screen.getByTitle('First move')).toBeEnabled()
    expect(screen.getByTitle('Previous')).toBeEnabled()
  })

  test('clicking Last disables Next and Last', async () => {
    const user = userEvent.setup()
    render(<GameReplayWindow match={MATCH_WITH_MOVES} onClose={vi.fn()} />)
    await user.click(screen.getByTitle('Last move'))
    expect(screen.getByTitle('Next')).toBeDisabled()
    expect(screen.getByTitle('Last move')).toBeDisabled()
  })

  test('clicking First after Last re-disables First and Previous', async () => {
    const user = userEvent.setup()
    render(<GameReplayWindow match={MATCH_WITH_MOVES} onClose={vi.fn()} />)
    await user.click(screen.getByTitle('Last move'))
    await user.click(screen.getByTitle('First move'))
    expect(screen.getByTitle('First move')).toBeDisabled()
    expect(screen.getByTitle('Previous')).toBeDisabled()
  })

  test('clicking Previous after Next re-disables First and Previous', async () => {
    const user = userEvent.setup()
    render(<GameReplayWindow match={MATCH_WITH_MOVES} onClose={vi.fn()} />)
    await user.click(screen.getByTitle('Next'))
    await user.click(screen.getByTitle('Previous'))
    expect(screen.getByTitle('First move')).toBeDisabled()
    expect(screen.getByTitle('Previous')).toBeDisabled()
  })

  // ── Play / Pause ──────────────────────────────────────────────────────────

  test('clicking Play shows Pause button', async () => {
    const user = userEvent.setup()
    render(<GameReplayWindow match={MATCH_WITH_MOVES} onClose={vi.fn()} />)
    expect(screen.getByTitle('Play')).toBeInTheDocument()
    await user.click(screen.getByTitle('Play'))
    expect(screen.getByTitle('Pause')).toBeInTheDocument()
    expect(screen.queryByTitle('Play')).not.toBeInTheDocument()
  })

  test('clicking Pause stops playback and shows Play button again', async () => {
    const user = userEvent.setup()
    render(<GameReplayWindow match={MATCH_WITH_MOVES} onClose={vi.fn()} />)
    await user.click(screen.getByTitle('Play'))
    await user.click(screen.getByTitle('Pause'))
    expect(screen.getByTitle('Play')).toBeInTheDocument()
  })

  test('clicking Play from last step resets step to 0 before starting', async () => {
    const user = userEvent.setup()
    render(<GameReplayWindow match={MATCH_WITH_MOVES} onClose={vi.fn()} />)
    await user.click(screen.getByTitle('Last move'))
    // At last step, Next/Last are disabled
    expect(screen.getByTitle('Next')).toBeDisabled()
    await user.click(screen.getByTitle('Play'))
    // Should have reset: First/Previous should be disabled again (step = 0)
    expect(screen.getByTitle('First move')).toBeDisabled()
  })

  // ── Close button ─────────────────────────────────────────────────────────

  test('clicking the close button calls onClose', async () => {
    const mockClose = vi.fn()
    const user = userEvent.setup()
    render(<GameReplayWindow match={MATCH_WITH_MOVES} onClose={mockClose} />)
    await user.click(screen.getByLabelText('Close'))
    expect(mockClose).toHaveBeenCalledOnce()
  })

  // ── Default board size ────────────────────────────────────────────────────

  test('renders correctly when boardSize is undefined (defaults to 8)', () => {
    const match = { ...MATCH_WITH_MOVES, boardSize: undefined }
    render(<GameReplayWindow match={match} onClose={vi.fn()} />)
    expect(screen.getByTestId('board')).toBeInTheDocument()
  })
})

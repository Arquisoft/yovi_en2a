import { render, screen, waitFor, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, test, expect, vi, afterEach, beforeEach } from 'vitest'
import { LocalRanking } from '../components/topRightMenu/ranking/rankingTypes/LocalRanking'
import '@testing-library/jest-dom'

// Mock StatisticsPanel so recharts doesn't blow up in jsdom
vi.mock('../components/topRightMenu/ranking/rankingTypes/StatisticsPanel', () => ({
  default: () => <div data-testid="statistics-panel">StatisticsPanel</div>,
}))

// 1. Mock of React Router
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual as any, useNavigate: () => mockNavigate }
})

// 2. Mock of UserContext
vi.mock('../contexts/UserContext', () => ({
  useUser: vi.fn()
}))

import { useUser } from '../contexts/UserContext'

describe('LocalRanking Strategy & Fetcher', () => {
  beforeEach(() => {
    mockNavigate.mockClear()
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  test('renders "not logged in" state and navigates to login', async () => {
    vi.mocked(useUser).mockReturnValue({
      user: null,
      isLoggedIn: false,
      loading: false,
      error: null,
      refreshUser: vi.fn(),
      logout: vi.fn(),
      updateUsername: vi.fn()
    })

    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      json: async () => ({ matches: [] })
    } as any)

    render(<MemoryRouter><LocalRanking /></MemoryRouter>)

    await waitFor(() => {
      expect(screen.getByText(/You are not logged yet/i)).toBeInTheDocument()
    })

    const loginBtn = screen.getByRole('button', { name: /Login/i })
    const user = userEvent.setup()
    await user.click(loginBtn)

    expect(mockNavigate).toHaveBeenCalledWith('/login')
  })

  test('fetches and renders local matches for a logged in user', async () => {
    vi.mocked(useUser).mockReturnValue({
      user: { username: 'ProGamer', email: 'pro@gamer.com' },
      isLoggedIn: true,
      loading: false,
      error: null,
      refreshUser: vi.fn(),
      logout: vi.fn(),
      updateUsername: vi.fn()
    })

    const mockApiResponse = {
      matches: [
        { player1id: 'ProGamer', player2id: 'BotLevel3', result: 'WIN' },
      ]
    }

    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      json: async () => mockApiResponse
    } as any)

    render(<MemoryRouter><LocalRanking /></MemoryRouter>)

    await waitFor(() => {
      expect(screen.queryByText(/Loading history/i)).not.toBeInTheDocument()
    })

    expect(screen.getByText(/Match History \(ProGamer\)/i)).toBeInTheDocument()
    expect(screen.getByText('BotLevel3')).toBeInTheDocument()
    expect(screen.getByText('WIN')).toBeInTheDocument()
  })

  // ── Sub-tab switching ────────────────────────────────────────────────────

  /** Render LocalRanking logged in, with two pre-baked matches */
  const renderWithMatches = async () => {
    vi.mocked(useUser).mockReturnValue({
      user: { username: 'ProGamer', email: 'pro@gamer.com' },
      isLoggedIn: true,
      loading: false,
      error: null,
      refreshUser: vi.fn(),
      logout: vi.fn(),
      updateUsername: vi.fn()
    })

    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      json: async () => ({
        matches: [
          { player1id: 'pro@gamer.com', player2id: 'BotA', result: 'Win',  time: 90 },
          { player1id: 'pro@gamer.com', player2id: 'BotB', result: 'Loss', time: 30 },
        ]
      })
    } as any)

    render(<MemoryRouter><LocalRanking /></MemoryRouter>)

    await waitFor(() =>
      expect(screen.queryByText(/Loading history/i)).not.toBeInTheDocument()
    )
  }

  test('default tab shows match history title', async () => {
    await renderWithMatches()
    expect(screen.getByText(/Match History \(ProGamer\)/i)).toBeInTheDocument()
  })

  test('switching to Time tab shows correct title', async () => {
    const user = userEvent.setup()
    await renderWithMatches()
    await user.click(screen.getByRole('button', { name: /^Time$/i }))
    expect(screen.getByText(/By Duration/i)).toBeInTheDocument()
  })

  test('switching to Wins tab shows only Win results', async () => {
    const user = userEvent.setup()
    await renderWithMatches()
    await user.click(screen.getByRole('button', { name: /^Wins$/i }))
    expect(screen.getByText(/Wins — Most Recent First/i)).toBeInTheDocument()
    expect(screen.getByText('Win')).toBeInTheDocument()
    expect(screen.queryByText('Loss')).not.toBeInTheDocument()
  })

  test('switching to Loses tab shows only Loss results', async () => {
    const user = userEvent.setup()
    await renderWithMatches()
    await user.click(screen.getByRole('button', { name: /^Loses$/i }))
    expect(screen.getByText(/Loses — Most Recent First/i)).toBeInTheDocument()
    expect(screen.getByText('Loss')).toBeInTheDocument()
    expect(screen.queryByText('Win')).not.toBeInTheDocument()
  })

  test('switching to Statistics tab renders StatisticsPanel', async () => {
    const user = userEvent.setup()
    await renderWithMatches()
    await user.click(screen.getByRole('button', { name: /Statistics/i }))
    expect(screen.getByTestId('statistics-panel')).toBeInTheDocument()
  })

  test('email is replaced by username in player name', async () => {
    await renderWithMatches()
    // player1id === user.email → should show username, not email
    expect(screen.getByText('ProGamer')).toBeInTheDocument()
    expect(screen.queryByText('pro@gamer.com')).not.toBeInTheDocument()
  })

  test('handles fetch error gracefully and still stops loading', async () => {
    vi.mocked(useUser).mockReturnValue({
      user: { username: 'ProGamer', email: 'pro@gamer.com' },
      isLoggedIn: true,
      loading: false,
      error: null,
      refreshUser: vi.fn(),
      logout: vi.fn(),
      updateUsername: vi.fn()
    })

    globalThis.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'))
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(<MemoryRouter><LocalRanking /></MemoryRouter>)

    await waitFor(() => {
      expect(screen.queryByText(/Loading history/i)).not.toBeInTheDocument()
    })

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Error fetching local history:'),
      expect.any(Error)
    )
    consoleSpy.mockRestore()
  })
})

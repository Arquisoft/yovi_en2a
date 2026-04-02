import { render, screen, waitFor, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, test, expect, vi, afterEach } from 'vitest'
import { GlobalRanking } from '../components/topRightMenu/ranking/rankingTypes/GlobalRanking'
import '@testing-library/jest-dom'

// Full player objects used across multiple tests
const mockRankings = [
  { username: 'Alice',   playerid: 'a@a.com', wins: 10, losses: 2, best_time: 75,  total_matches: 12, win_rate: 0.83, elo: 180 },
  { username: 'Bob',     playerid: 'b@b.com', wins: 6,  losses: 5, best_time: 110, total_matches: 11, win_rate: 0.55, elo: 90  },
  { username: 'Charlie', playerid: 'c@c.com', wins: 6,  losses: 8, best_time: 95,  total_matches: 14, win_rate: 0.43, elo: 60  },
]

/** Render GlobalRanking with a pre-resolved fetch */
const renderWithMock = async () => {
  globalThis.fetch = vi.fn().mockResolvedValueOnce({
    json: async () => ({ rankings: mockRankings })
  }) as unknown as typeof fetch

  render(<GlobalRanking />)

  await waitFor(() =>
    expect(screen.queryByText(/Loading leaderboard/i)).not.toBeInTheDocument()
  )
}

describe('GlobalRanking Strategy & Fetcher', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  test('shows loading state initially', () => {
    globalThis.fetch = vi.fn(() => new Promise(() => {})) as unknown as typeof fetch

    render(<GlobalRanking />)

    expect(screen.getByText(/Loading leaderboard/i)).toBeInTheDocument()
  })

  test('fetches data, formats time, and renders the global table', async () => {
    const mockApiResponse = {
      rankings: [
        { username: 'SpeedRunner', best_time: 95 },
        { playerid: 'Guest123', best_time: 125 }
      ]
    }

    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      json: async () => mockApiResponse
    }) as unknown as typeof fetch

    render(<GlobalRanking />)

    // Esperamos a que desaparezca el mensaje de carga
    await waitFor(() => {
      expect(screen.queryByText(/Loading leaderboard/i)).not.toBeInTheDocument()
    })

    // Verificamos que se calculó bien el MM:SS y se renderizan los datos
    expect(screen.getByText('Fastest Games — Best Time (Top 20)')).toBeInTheDocument()
    expect(screen.getByText('SpeedRunner')).toBeInTheDocument()
    expect(screen.getByText('01:35')).toBeInTheDocument()
    
    expect(screen.getByText('Guest123')).toBeInTheDocument()
    expect(screen.getByText('02:05')).toBeInTheDocument()
  })

  // ── Wins tab ─────────────────────────────────────────────────────────────

  test('switching to Wins tab shows correct title and WINS column header', async () => {
    const user = userEvent.setup()
    await renderWithMock()
    await user.click(screen.getByRole('button', { name: /Wins/i }))
    expect(screen.getByText('Most Wins — World Top 20')).toBeInTheDocument()
    expect(screen.getByText('WINS')).toBeInTheDocument()
  })

  test('Wins tab renders player names', async () => {
    const user = userEvent.setup()
    await renderWithMock()
    await user.click(screen.getByRole('button', { name: /Wins/i }))
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
  })

  test('Wins tab shows win counts', async () => {
    const user = userEvent.setup()
    await renderWithMock()
    await user.click(screen.getByRole('button', { name: /Wins/i }))
    expect(screen.getByText('10')).toBeInTheDocument()
    expect(screen.getAllByText('6').length).toBeGreaterThanOrEqual(1)
  })

  test('Wins tab orders players by most wins first', async () => {
    const user = userEvent.setup()
    await renderWithMock()
    await user.click(screen.getByRole('button', { name: /Wins/i }))
    // Alice (10 wins) should be #1
    expect(screen.getByText('#1')).toBeInTheDocument()
    const names = screen.getAllByText(/Alice|Bob|Charlie/).map(el => el.textContent)
    expect(names[0]).toBe('Alice')
  })

  test('positions in Wins tab are assigned sequentially', async () => {
    const user = userEvent.setup()
    await renderWithMock()
    await user.click(screen.getByRole('button', { name: /Wins/i }))
    // Alice #1, Bob #2, Charlie #3
    expect(screen.getByText('#1')).toBeInTheDocument()
    expect(screen.getByText('#2')).toBeInTheDocument()
    expect(screen.getByText('#3')).toBeInTheDocument()
  })

  // ── Loses tab ─────────────────────────────────────────────────────────────

  test('switching to Loses tab shows correct title and LOSES column header', async () => {
    const user = userEvent.setup()
    await renderWithMock()
    await user.click(screen.getByRole('button', { name: /Loses/i }))
    expect(screen.getByText('Most Losses — World')).toBeInTheDocument()
    expect(screen.getByText('LOSES')).toBeInTheDocument()
  })

  test('Loses tab shows loss counts', async () => {
    const user = userEvent.setup()
    await renderWithMock()
    await user.click(screen.getByRole('button', { name: /Loses/i }))
    expect(screen.getByText('8')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  test('Loses tab orders players by most losses first', async () => {
    const user = userEvent.setup()
    await renderWithMock()
    await user.click(screen.getByRole('button', { name: /Loses/i }))
    // Charlie (8 losses) should be #1
    const names = screen.getAllByText(/Alice|Bob|Charlie/).map(el => el.textContent)
    expect(names[0]).toBe('Charlie')
  })

  // ── playerid fallback ─────────────────────────────────────────────────────

  test('uses playerid when username is absent', async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      json: async () => ({
        rankings: [{ username: '', playerid: 'anon@x.com', wins: 3, losses: 1, best_time: 60, total_matches: 4, win_rate: 0.75, elo: 45 }]
      })
    }) as unknown as typeof fetch

    render(<GlobalRanking />)
    await waitFor(() =>
      expect(screen.queryByText(/Loading leaderboard/i)).not.toBeInTheDocument()
    )

    expect(screen.getByText('anon@x.com')).toBeInTheDocument()
  })

  // ── Error handling ────────────────────────────────────────────────────────

  test('handles fetch error and stops loading', async () => {
    globalThis.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error')) as unknown as typeof fetch
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(<GlobalRanking />)

    await waitFor(() =>
      expect(screen.queryByText(/Loading leaderboard/i)).not.toBeInTheDocument()
    )

    consoleSpy.mockRestore()
  })

  // ── Empty rankings ────────────────────────────────────────────────────────

  test('renders without crash when rankings array is empty', async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      json: async () => ({ rankings: [] })
    }) as unknown as typeof fetch

    render(<GlobalRanking />)
    await waitFor(() =>
      expect(screen.queryByText(/Loading leaderboard/i)).not.toBeInTheDocument()
    )
    expect(screen.getByText('Fastest Games — Best Time (Top 20)')).toBeInTheDocument()
  })

  test('renders without crash when rankings field is missing', async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      json: async () => ({})
    }) as unknown as typeof fetch

    render(<GlobalRanking />)
    await waitFor(() =>
      expect(screen.queryByText(/Loading leaderboard/i)).not.toBeInTheDocument()
    )
    expect(screen.getByText('Fastest Games — Best Time (Top 20)')).toBeInTheDocument()
  })
})
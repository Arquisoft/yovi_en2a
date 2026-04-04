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
        { username: 'SpeedRunner', playerid: 'speed@x.com', best_time: 95,  wins: 1, losses: 0, total_matches: 1, win_rate: 1.0, elo: 20 },
        { username: '',            playerid: 'Guest123',    best_time: 125, wins: 0, losses: 1, total_matches: 1, win_rate: 0.0, elo: 0  },
      ]
    }

    // SpeedRunner sorted first (lower best_time), so its localRankings fetch comes first
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce({ json: async () => mockApiResponse })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ matches: [{ player1id: 'speed@x.com', player2id: 'bot', result: 'Win',  time: 95,  moves: [], board_status: { size: 8 } }] })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ matches: [{ player1id: 'Guest123',    player2id: 'bot', result: 'Loss', time: 125, moves: [], board_status: { size: 8 } }] })
      }) as unknown as typeof fetch

    render(<GlobalRanking />)

    await waitFor(() => {
      expect(screen.getByText('Fastest Games — World Top 20')).toBeInTheDocument()
      expect(screen.getByText('SpeedRunner')).toBeInTheDocument()
      expect(screen.getByText('01:35')).toBeInTheDocument()
      expect(screen.getByText('Guest123')).toBeInTheDocument()
      expect(screen.getByText('02:05')).toBeInTheDocument()
    })
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
    // All 3 players are rendered with sequential positions
    expect(screen.getAllByText('#1').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('#2').length).toBeGreaterThanOrEqual(1)
    // All three players appear in the table
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
    expect(screen.getByText('Charlie')).toBeInTheDocument()
  })

  // ── Loses tab ─────────────────────────────────────────────────────────────

  test('switching to Loses tab shows correct title and LOSES column header', async () => {
    const user = userEvent.setup()
    await renderWithMock()
    await user.click(screen.getByRole('button', { name: /Loses/i }))
    expect(screen.getByText('Fewest Losses — World Top 20')).toBeInTheDocument()
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

  test('Loses tab renders all players with their loss counts', async () => {
    const user = userEvent.setup()
    await renderWithMock()
    await user.click(screen.getByRole('button', { name: /Loses/i }))
    // All three players and their loss counts are visible
    await waitFor(() => {
      expect(screen.getByText('Charlie')).toBeInTheDocument()
      expect(screen.getByText('Alice')).toBeInTheDocument()
      expect(screen.getByText('8')).toBeInTheDocument()  // Charlie's losses
    })
  })

  // ── Elo tab ───────────────────────────────────────────────────────────────

  test('switching to Elo tab shows correct title and ELO column header', async () => {
    const user = userEvent.setup()
    await renderWithMock()
    await user.click(screen.getByRole('button', { name: /^Elo$/i }))
    expect(screen.getByText('Elo Ranking — World Top 20')).toBeInTheDocument()
    expect(screen.getByText('ELO')).toBeInTheDocument()
  })

  test('Elo tab renders elo values for all players', async () => {
    const user = userEvent.setup()
    await renderWithMock()
    await user.click(screen.getByRole('button', { name: /^Elo$/i }))
    expect(screen.getByText('180')).toBeInTheDocument()
    expect(screen.getByText('90')).toBeInTheDocument()
    expect(screen.getByText('60')).toBeInTheDocument()
  })

  test('Elo tab orders players by highest elo first', async () => {
    const user = userEvent.setup()
    await renderWithMock()
    await user.click(screen.getByRole('button', { name: /^Elo$/i }))
    const names = screen.getAllByText(/Alice|Bob|Charlie/).map(el => el.textContent)
    expect(names[0]).toBe('Alice') // Alice has 180 elo — should be first
  })

  test('Elo tab assigns tied players the same position', async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      json: async () => ({
        rankings: [
          { username: 'X', playerid: 'x@x.com', wins: 5, losses: 1, best_time: 60, total_matches: 6, win_rate: 0.83, elo: 80 },
          { username: 'Y', playerid: 'y@y.com', wins: 5, losses: 1, best_time: 70, total_matches: 6, win_rate: 0.83, elo: 80 },
          { username: 'Z', playerid: 'z@z.com', wins: 3, losses: 3, best_time: 90, total_matches: 6, win_rate: 0.50, elo: 30 },
        ]
      })
    }) as unknown as typeof fetch

    const user = userEvent.setup()
    render(<GlobalRanking />)
    await waitFor(() =>
      expect(screen.queryByText(/Loading leaderboard/i)).not.toBeInTheDocument()
    )
    await user.click(screen.getByRole('button', { name: /^Elo$/i }))

    // X and Y both have elo 80 → both get position #1
    expect(screen.getAllByText('#1').length).toBe(2)
    // Z gets position #2 (skips #1 due to tie)
    expect(screen.getByText('#2')).toBeInTheDocument()
  })

  // ── fetchBestMatch edge cases ────────────────────────────────────────────

  test('time tab filters out entries when fetch returns !ok', async () => {
    const player = { username: 'A', playerid: 'a@a.com', best_time: 60, wins: 1, losses: 0, total_matches: 1, win_rate: 1, elo: 20 }
    globalThis.fetch = (vi.fn()
      .mockResolvedValueOnce({ json: async () => ({ rankings: [player] }) })
      .mockResolvedValueOnce({ ok: false, json: async () => ({}) })) as unknown as typeof fetch

    render(<GlobalRanking />)

    await waitFor(() =>
      expect(screen.getByText('Fastest Games — World Top 20')).toBeInTheDocument()
    )
    // fetchBestMatch returned null (ok=false), so no rows
    expect(screen.queryByText('A')).not.toBeInTheDocument()
  })

  test('time tab filters out entries when localRankings returns empty matches', async () => {
    const player = { username: 'B', playerid: 'b@b.com', best_time: 90, wins: 1, losses: 0, total_matches: 1, win_rate: 1, elo: 20 }
    globalThis.fetch = (vi.fn()
      .mockResolvedValueOnce({ json: async () => ({ rankings: [player] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ matches: [] }) })) as unknown as typeof fetch

    render(<GlobalRanking />)

    await waitFor(() =>
      expect(screen.getByText('Fastest Games — World Top 20')).toBeInTheDocument()
    )
    // Empty matches → fetchBestMatch returns null → no row
    expect(screen.queryByText('B')).not.toBeInTheDocument()
  })

  test('time tab shows correct opponent when logged user is player2', async () => {
    const player = { username: 'C', playerid: 'c@c.com', best_time: 55, wins: 1, losses: 0, total_matches: 1, win_rate: 1, elo: 20 }
    globalThis.fetch = (vi.fn()
      .mockResolvedValueOnce({ json: async () => ({ rankings: [player] }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          matches: [{
            player1id: 'Opponent',
            player2id: 'c@c.com',
            result: 'Win',
            time: 55,
            moves: [],
            board_status: { size: 8 }
          }]
        })
      })) as unknown as typeof fetch

    render(<GlobalRanking />)

    await waitFor(() => expect(screen.getByText('C')).toBeInTheDocument())
    expect(screen.getByText('Opponent')).toBeInTheDocument()
  })

  test('time tab inverts result to Loss when user is player2 and match result is Win', async () => {
    const player = { username: 'D', playerid: 'd@d.com', best_time: 70, wins: 0, losses: 1, total_matches: 1, win_rate: 0, elo: 0 }
    globalThis.fetch = (vi.fn()
      .mockResolvedValueOnce({ json: async () => ({ rankings: [player] }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          matches: [{
            player1id: 'Winner',
            player2id: 'd@d.com',
            result: 'Win',
            time: 70,
            moves: [],
            board_status: { size: 8 }
          }]
        })
      })) as unknown as typeof fetch

    render(<GlobalRanking />)

    await waitFor(() => expect(screen.getByText('D')).toBeInTheDocument())
    // isP1=false, result='Win' → displayed as 'Loss'
    expect(screen.getByText('Loss')).toBeInTheDocument()
  })

  // ── playerid fallback ─────────────────────────────────────────────────────

  test('uses playerid when username is absent', async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      json: async () => ({
        rankings: [{ username: '', playerid: 'anon@x.com', wins: 3, losses: 1, best_time: 60, total_matches: 4, win_rate: 0.75, elo: 45 }]
      })
    }) as unknown as typeof fetch

    const user = userEvent.setup()
    render(<GlobalRanking />)
    await waitFor(() =>
      expect(screen.queryByText(/Loading leaderboard/i)).not.toBeInTheDocument()
    )
    await user.click(screen.getByRole('button', { name: /Wins/i }))

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
    expect(screen.getByText('Fastest Games — World Top 20')).toBeInTheDocument()
  })

  test('renders without crash when rankings field is missing', async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      json: async () => ({})
    }) as unknown as typeof fetch

    render(<GlobalRanking />)
    await waitFor(() =>
      expect(screen.queryByText(/Loading leaderboard/i)).not.toBeInTheDocument()
    )
    expect(screen.getByText('Fastest Games — World Top 20')).toBeInTheDocument()
  })
})
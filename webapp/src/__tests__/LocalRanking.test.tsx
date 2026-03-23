import { render, screen, waitFor, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, test, expect, vi, afterEach, beforeEach } from 'vitest'
import { LocalRanking } from '../components/topRightMenu/ranking/rankingTypes/LocalRanking'
import '@testing-library/jest-dom'

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
      refreshUser: vi.fn(),
      logout: vi.fn(),
      updateUsername: vi.fn()
    })

    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      json: async () => ({ matches: [] })
    } as any)

    const strategy = new LocalRanking()
    render(<MemoryRouter>{strategy.render()}</MemoryRouter>)

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

    const strategy = new LocalRanking()
    render(<MemoryRouter>{strategy.render()}</MemoryRouter>)

    await waitFor(() => {
      expect(screen.queryByText(/Cargando Historial/i)).not.toBeInTheDocument()
    })

    expect(screen.getByText(/Personal Records \(ProGamer\)/i)).toBeInTheDocument()
    expect(screen.getByText('BotLevel3')).toBeInTheDocument()
    expect(screen.getByText('WIN')).toBeInTheDocument()
  })
})

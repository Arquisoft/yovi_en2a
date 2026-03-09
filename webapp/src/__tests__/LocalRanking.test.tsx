import { render, screen, waitFor, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, test, expect, vi, afterEach, beforeEach } from 'vitest'
import { LocalRanking } from '../components/topRightMenu/ranking/rankingTypes/LocalRanking'
import * as CookieRetriever from '../utils/CookieRetriever'
import '@testing-library/jest-dom'

// 1. Mock of React Router
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual as any, useNavigate: () => mockNavigate }
})

// 2. Mockof Cookies Functions
vi.mock('../utils/CookieRetriever', () => ({
  GetEmailFromCookie: vi.fn(),
  GetUsernameFromCookie: vi.fn()
}))

describe('LocalRanking Strategy & Fetcher', () => {
  beforeEach(() => {
    mockNavigate.mockClear()
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  test('renders "not logged in" state and navigates to login', async () => {
    vi.mocked(CookieRetriever.GetUsernameFromCookie).mockReturnValue('User')
    vi.mocked(CookieRetriever.GetEmailFromCookie).mockReturnValue(null as any)
    
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
    vi.mocked(CookieRetriever.GetUsernameFromCookie).mockReturnValue('ProGamer')
    vi.mocked(CookieRetriever.GetEmailFromCookie).mockReturnValue('pro@gamer.com')
    
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

    // Check the title is the same as the one in the cookie
    expect(screen.getByText(/Personal Records \(ProGamer\)/i)).toBeInTheDocument()
    expect(screen.getByText('BotLevel3')).toBeInTheDocument()
    expect(screen.getByText('WIN')).toBeInTheDocument()
  })
})
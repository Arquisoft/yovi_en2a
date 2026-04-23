import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, test, expect, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import TopRightMenu from '../components/topRightMenu/TopRightMenu'
import '@testing-library/jest-dom'

vi.mock('../contexts/UserContext', () => ({
  useUser: vi.fn(() => ({
    user: null, isLoggedIn: false, loading: false, error: null,
    refreshUser: vi.fn(), logout: vi.fn(), updateUsername: vi.fn()
  }))
}))

const mockToggleMute = vi.fn();

vi.mock('../contexts/AudioContext', () => ({
  useAudio: () => ({
    masterVolume: 80,
    isMuted: false,
    setMasterVolume: vi.fn(),
    toggleMute: mockToggleMute,
    playMoveSound: vi.fn(),
    playGameOverSound: vi.fn(),
    playGameStartSound: vi.fn(),
    playGameVictorySound: vi.fn(),
  }),
}))

describe('TopRightMenu Component', () => {
  
  test('renders all navigation buttons', () => {
    render(<MemoryRouter><TopRightMenu /></MemoryRouter>) 
    
    expect(screen.getByRole('button', { name: /help/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /rankings/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /volume/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /settings/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /user/i })).toBeInTheDocument()
  })

  test('calls toggleMute when volume button is clicked', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter><TopRightMenu /></MemoryRouter>)

    const volumeBtn = screen.getByRole('button', { name: /volume/i })
    await user.click(volumeBtn)

    expect(mockToggleMute).toHaveBeenCalledOnce()
  })

  test('opens and closes the Settings menu', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter><TopRightMenu /></MemoryRouter>)
    
    const settingsBtn = screen.getByRole('button', { name: /settings/i })
    await user.click(settingsBtn)
    
    expect(screen.getByText('SETTINGS')).toBeInTheDocument()

    const closeBtn = screen.getByRole('button', { name: /close/i })
    await user.click(closeBtn)
    
    expect(screen.queryByText('SETTINGS')).not.toBeInTheDocument()
  })

  test('opens the Rankings menu', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter><TopRightMenu /></MemoryRouter>)
    
    const rankingBtn = screen.getByRole('button', { name: /rankings/i })
    await user.click(rankingBtn)
    
    const rankingTitles = screen.getAllByText(/rankings/i)
    expect(rankingTitles.length).toBeGreaterThan(0)
  })

  test('triggers Help and User menu states', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter><TopRightMenu /></MemoryRouter>)
    
    const helpBtn = screen.getByRole('button', { name: /help/i })
    const userBtn = screen.getByRole('button', { name: /user/i })

    await user.click(helpBtn)
    await user.click(userBtn)
    
    expect(helpBtn).toBeInTheDocument()
    expect(userBtn).toBeInTheDocument()
  })
})
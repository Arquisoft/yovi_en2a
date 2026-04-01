import { render, screen } from '@testing-library/react'
import { describe, test, expect, vi } from 'vitest'
import RightPanel from '../components/gameWindow/rightPanel/RightPanel'
import '@testing-library/jest-dom'

vi.mock('../contexts/UserContext', () => ({
  useUser: vi.fn()
}))

import { useUser } from '../contexts/UserContext'

const mockUser = (username: string | null) => {
  vi.mocked(useUser).mockReturnValue({
    user: username ? { username, email: 'test@test.com' } : null,
    isLoggedIn: username !== null, loading: false, error: null,
    refreshUser: vi.fn(), logout: vi.fn(), updateUsername: vi.fn()
  })
}

describe('RightPanel', () => {
  test('displays the timer', () => {
    mockUser('Alice')
    render(<RightPanel turn={1} time="01:23" mode="bot" />)
    expect(screen.getByText('01:23')).toBeInTheDocument()
  })

  test('defaults timer to 00:00 when not provided', () => {
    mockUser('Alice')
    render(<RightPanel turn={1} mode="bot" />)
    expect(screen.getByText('00:00')).toBeInTheDocument()
  })

  test('shows logged-in username for player 1', () => {
    mockUser('Alice')
    render(<RightPanel turn={1} mode="bot" />)
    expect(screen.getByText('Alice')).toBeInTheDocument()
  })

  test('falls back to "Player 1" when no user is logged in', () => {
    mockUser(null)
    render(<RightPanel turn={1} mode="bot" />)
    expect(screen.getByText('Player 1')).toBeInTheDocument()
  })

  test('shows YOUR TURN for player 1 when turn=1', () => {
    mockUser('Alice')
    render(<RightPanel turn={1} mode="bot" />)
    const chips = screen.getAllByText('YOUR TURN')
    expect(chips).toHaveLength(1)
    const waiting = screen.getAllByText('WAITING')
    expect(waiting).toHaveLength(1)
  })

  test('shows YOUR TURN for player 2 when turn=2', () => {
    mockUser('Alice')
    render(<RightPanel turn={2} mode="bot" />)
    const chips = screen.getAllByText('YOUR TURN')
    expect(chips).toHaveLength(1)
  })

  test('shows Bot label when mode is bot', () => {
    mockUser('Alice')
    render(<RightPanel turn={1} mode="bot" />)
    expect(screen.getByText('Bot')).toBeInTheDocument()
  })

  test('shows Human label when mode is not bot', () => {
    mockUser('Alice')
    render(<RightPanel turn={1} mode="local" />)
    const humanLabels = screen.getAllByText('Human')
    expect(humanLabels.length).toBeGreaterThan(0)
  })
})

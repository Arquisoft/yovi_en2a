import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, test, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import MainMenu from '../components/mainMenu/MainMenu'
import '@testing-library/jest-dom'

// 1. Create a mock function to track navigation
const mockNavigate = vi.fn()

// 2. Mock react-router-dom to replace useNavigate with our tracked function
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual as any,
    useNavigate: () => mockNavigate,
  }
})

vi.mock('../contexts/UserContext', () => ({
  useUser: vi.fn(() => ({
    user: null, isLoggedIn: false, loading: false, error: null,
    refreshUser: vi.fn(), logout: vi.fn(), updateUsername: vi.fn()
  }))
}))

describe('MainMenu Component', () => {
  
  // Clear the mock before each test to ensure a clean slate
  beforeEach(() => {
    mockNavigate.mockClear()
  })

  test('renders title and subtitle correctly', () => {
    render(<MemoryRouter><MainMenu /></MemoryRouter>)
    
    expect(screen.getByText(/GAMEY/i)).toBeInTheDocument()
    expect(screen.getByText(/Three sides, one goal/i)).toBeInTheDocument()
  })

  test('renders the action buttons with correct labels', () => {
    render(<MemoryRouter><MainMenu /></MemoryRouter>)
    
    expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /play as guest/i })).toBeInTheDocument()
  })

  test('calls navigation when buttons are clicked', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter><MainMenu /></MemoryRouter>)

    const loginBtn = screen.getByRole('button', { name: /log in/i })
    await user.click(loginBtn)
    
    // 3. Verify that the app tried to navigate to the login route
    // Adjust '/login' if your actual route is different!
    expect(mockNavigate).toHaveBeenCalledWith('/login')

    const guestBtn = screen.getByRole('button', { name: /play as guest/i })
    await user.click(guestBtn)

    // Verify navigation for guest play (passes state: { guest: true })
    expect(mockNavigate).toHaveBeenCalledWith('/gameSelection', { state: { guest: true } })
  })
})
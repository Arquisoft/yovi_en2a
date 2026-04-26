import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { describe, test, expect, afterEach, vi, beforeAll } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import SelectionPanel from '../components/gameSelection/selectionPanel/SelectionPanel'
import '@testing-library/jest-dom'

// Mock the router so the navigate hook doesn't break in the child components
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual as any,
    useNavigate: () => mockNavigate,
  }
})

// Mock the UserContext so GameModeContainer (rendered inside SelectionPanel)
// does not throw "useUser must be used within a UserProvider"
vi.mock('../contexts/UserContext', () => ({
  useUser: vi.fn(() => ({
    user: { username: 'tester', email: 't@t.com' },
    isLoggedIn: true,
    loading: false,
    error: null,
    refreshUser: vi.fn(),
    logout: vi.fn(),
    updateUsername: vi.fn(),
  })),
}))

describe('SelectionPanel Component', () => {
  beforeAll(() => {
    Element.prototype.scrollBy = vi.fn()
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    mockNavigate.mockClear()
  })

  test('should render the carousel controls and default mode', () => {
    render(<MemoryRouter><SelectionPanel /></MemoryRouter>)

    // Select the first left arrow and last right arrow to target the carousel controls
    const leftArrows = screen.getAllByText('←')
    const rightArrows = screen.getAllByText('→')

    expect(leftArrows[0]).toBeInTheDocument()
    expect(rightArrows.at(-1)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Normal Mode' })).toBeInTheDocument()
  })

  test('should trigger scrollBy with correct values on arrow clicks', () => {
    render(<MemoryRouter><SelectionPanel /></MemoryRouter>)

    const rightArrows = screen.getAllByText('→')

    // Select the outer arrows (carousel)
    const leftArrow = screen.getAllByText('←')[0]
    const rightArrow = rightArrows.at(-1)!

    fireEvent.click(rightArrow)
    expect(Element.prototype.scrollBy).toHaveBeenCalledWith({
      left: 400,
      behavior: 'smooth'
    })

    fireEvent.click(leftArrow)
    expect(Element.prototype.scrollBy).toHaveBeenCalledWith({
      left: -400,
      behavior: 'smooth'
    })
  })
})

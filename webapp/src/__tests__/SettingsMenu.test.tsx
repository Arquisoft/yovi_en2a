import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, test, expect, vi, afterEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import SettingsMenu from '../components/topRightMenu/settings/Settings'
import '@testing-library/jest-dom'

const mockNavigate = vi.fn()
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

describe('SettingsMenu Component', () => {
  const mockOnClose = vi.fn()

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    mockNavigate.mockClear()
  })

  test('renders global header and default section', () => {
    // 3. Envolver el render en MemoryRouter
    render(<MemoryRouter><SettingsMenu onClose={mockOnClose} /></MemoryRouter>)
    
    // 1. Verify the global title (h2) is present
    expect(screen.getByRole('heading', { name: /SETTINGS/i, level: 2 })).toBeInTheDocument()
    
    // 2. Verify the close button exists via its aria-label
    expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument()
  })

  test('switches sections when sidebar buttons are clicked', async () => {
    const user = userEvent.setup()
    // 3. Envolver el render en MemoryRouter
    render(<MemoryRouter><SettingsMenu onClose={mockOnClose} /></MemoryRouter>)

    // The menu starts at the first section (usually Audio)
    // We look for the "Account" section button in the sidebar
    const accountTab = screen.getByRole('button', { name: /account/i })
    
    // Act: Click the Account tab
    await user.click(accountTab)

    // Assert: The main panel heading should change to "Account"
    // This triggers the logic for .find() and setActiveTabId, 
    // effectively covering the AccountSettings render path.
    expect(screen.getByRole('heading', { name: /account/i, level: 2 })).toBeInTheDocument()
  })

  test('calls onClose when the close button is clicked', async () => {
    const user = userEvent.setup()
    // 3. Envolver el render en MemoryRouter
    render(<MemoryRouter><SettingsMenu onClose={mockOnClose} /></MemoryRouter>)

    // Locate the close button by its accessible name
    const closeBtn = screen.getByRole('button', { name: /close/i })
    await user.click(closeBtn)

    // Verify the callback function was triggered
    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })
})
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, test, expect, vi, afterEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import Ranking from '../components/topRightMenu/ranking/Ranking'
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

describe('Ranking Component', () => {

  const mockOnClose = vi.fn()

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    mockNavigate.mockClear()
  })

  test('should render the global header and navigation tabs', () => {
    // 3. Envolver en MemoryRouter
    render(<MemoryRouter><Ranking onClose={mockOnClose} /></MemoryRouter>)
    
    expect(screen.getByText('RANKINGS')).toBeInTheDocument()

    expect(screen.getByRole('button', { name: /local/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /global/i })).toBeInTheDocument()
  })

  test('should switch between Local and Global rankings when tabs are clicked', async () => {
    const user = userEvent.setup()
    // 3. Envolver en MemoryRouter
    render(<MemoryRouter><Ranking onClose={mockOnClose} /></MemoryRouter>)

    const globalTab = screen.getByRole('button', { name: /global/i })
    await user.click(globalTab)

    // Assert using match to bypass CSS Module hashing
    expect(globalTab.className).toMatch(/active/i)
    
    const localTab = screen.getByRole('button', { name: /local/i })
    expect(localTab.className).not.toMatch(/active/i)
    
    // (Nota: Se ha eliminado el expect del mockOnClose porque cambiar
    // de pestaña no debe disparar la función de cerrar el menú).
  })
})
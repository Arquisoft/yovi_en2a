import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { describe, test, expect, afterEach, vi, beforeAll } from 'vitest'
import { MemoryRouter } from 'react-router-dom' // <-- 1. Importamos el Router
import SelectionPanel from '../components/gameSelection/selectionPanel/SelectionPanel' 
import '@testing-library/jest-dom'

// 2. Mockeamos el router para que los componentes hijos (GameModeContainer) no exploten
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual as any,
    useNavigate: () => mockNavigate,
  }
})

describe('SelectionPanel Component', () => {
  beforeAll(() => {
    Element.prototype.scrollBy = vi.fn()
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    mockNavigate.mockClear() // Limpiamos la navegación entre tests
  })

  test('should render the carousel controls and default mode', () => {
    // 3. Envolvemos el render en MemoryRouter
    render(<MemoryRouter><SelectionPanel /></MemoryRouter>)
    
    // Select the first left arrow and last right arrow to target the carousel controls
    const leftArrows = screen.getAllByText('←')
    const rightArrows = screen.getAllByText('→')
    
    expect(leftArrows[0]).toBeInTheDocument()
    expect(rightArrows.at(-1)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Normal Mode' })).toBeInTheDocument()
  })

  test('should trigger scrollBy with correct values on arrow clicks', () => {
    // 3. Envolvemos el render en MemoryRouter
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
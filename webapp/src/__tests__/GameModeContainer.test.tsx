import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { describe, test, expect, afterEach, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { GameModeContainer } from '../components/gameSelection/gameModes/GameModeContainer'
import { NormalMode } from '../components/gameSelection/gameModes/NormalMode'
import '@testing-library/jest-dom'

// 1. Mockeamos la navegación porque ahora el botón PLAY usa React Router
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual as any,
    useNavigate: () => mockNavigate,
  }
})

describe('GameModeContainer Component', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    mockNavigate.mockClear() // Limpiamos la navegación entre tests
  })

  test('should render mode info, image and difficulty section', () => {
    const mode = new NormalMode()
    render(<MemoryRouter><GameModeContainer mode={mode} /></MemoryRouter>)
    
    expect(screen.getByText(mode.label)).toBeInTheDocument()
    expect(screen.getByText(mode.description)).toBeInTheDocument() 
    expect(screen.getByAltText(mode.label)).toBeInTheDocument()
    
    expect(screen.getByText('Size')).toBeInTheDocument()
    expect(screen.getByText('PLAY')).toBeInTheDocument()
  })

  test('should navigate to the game on PLAY click', () => {
    const mode = new NormalMode()
    
    render(<MemoryRouter><GameModeContainer mode={mode} /></MemoryRouter>)
    
    const playButton = screen.getByText('PLAY')
    fireEvent.click(playButton)
    
    // 2. Comprobamos que el botón PLAY realmente llama a la redirección de React Router
    expect(mockNavigate).toHaveBeenCalled()
  })

  test('should handle difficulty navigation clicks', () => {
    const mode = new NormalMode()
    render(<MemoryRouter><GameModeContainer mode={mode} /></MemoryRouter>)
    
    // 3. Como ahora hay flechas para Difficulty y para Size, obtenemos TODAS las flechas
    const leftArrows = screen.getAllByText('←')
    const rightArrows = screen.getAllByText('→')

    // Hacemos clic en el primer set de flechas (el de Difficulty)
    fireEvent.click(rightArrows[0])
    fireEvent.click(leftArrows[0])
    
    expect(leftArrows[0]).toBeInTheDocument()
    expect(rightArrows[0]).toBeInTheDocument()
  })
})
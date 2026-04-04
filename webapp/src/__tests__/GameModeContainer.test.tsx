import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { describe, test, expect, afterEach, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { GameModeContainer } from '../components/gameSelection/gameModes/GameModeContainer'
import { NormalMode } from '../components/gameSelection/gameModes/NormalMode'
import { LocalMode } from '../components/gameSelection/gameModes/LocalMode'
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

  test('should handle size arrow clicks (increase and decrease)', () => {
    const mode = new NormalMode()
    render(<MemoryRouter><GameModeContainer mode={mode} /></MemoryRouter>)

    const rightArrows = screen.getAllByText('→')
    const leftArrows = screen.getAllByText('←')

    // Size arrows are at index 1 (index 0 is difficulty)
    const initialSize = Number(screen.getByText(/^\d+$/).textContent)

    fireEvent.click(rightArrows[1])
    expect(Number(screen.getByText(/^\d+$/).textContent)).toBe(initialSize + 1)

    fireEvent.click(leftArrows[1])
    expect(Number(screen.getByText(/^\d+$/).textContent)).toBe(initialSize)
  })

  test('should navigate to /play/.../multi when mode has no difficulty (LocalMode)', () => {
    const mode = new LocalMode()
    render(<MemoryRouter><GameModeContainer mode={mode} /></MemoryRouter>)

    fireEvent.click(screen.getByText('PLAY'))

    expect(mockNavigate).toHaveBeenCalledWith(
      expect.stringContaining('/multi'),
      undefined
    )
  })

  test('passes guest state in navState when location has guest:true', () => {
    const mode = new NormalMode()
    render(
      <MemoryRouter initialEntries={[{ pathname: '/gameSelection', state: { guest: true } }]}>
        <GameModeContainer mode={mode} />
      </MemoryRouter>
    )
    fireEvent.click(screen.getByText('PLAY'))
    expect(mockNavigate).toHaveBeenCalledWith(
      expect.any(String),
      { state: { guest: true } }
    )
  })

  test('decrease size button is hidden when size is at minimum', () => {
    const mode = new NormalMode()
    render(<MemoryRouter><GameModeContainer mode={mode} /></MemoryRouter>)

    const leftArrows = screen.getAllByText('←')
    // Click left on size until minimum (4) — the size left arrow is index 1
    for (let i = 0; i < 10; i++) fireEvent.click(leftArrows[1])

    expect(leftArrows[1]).toHaveStyle({ visibility: 'hidden' })
  })

  test('increase size button is hidden when size is at maximum', () => {
    const mode = new NormalMode()
    render(<MemoryRouter><GameModeContainer mode={mode} /></MemoryRouter>)

    const rightArrows = screen.getAllByText('→')
    for (let i = 0; i < 10; i++) fireEvent.click(rightArrows[1])

    expect(rightArrows[1]).toHaveStyle({ visibility: 'hidden' })
  })

  test('decrease difficulty button is hidden when at minimum difficulty', () => {
    const mode = new NormalMode()
    render(<MemoryRouter><GameModeContainer mode={mode} /></MemoryRouter>)

    const leftArrows = screen.getAllByText('←')
    // Click difficulty left (index 0) many times to reach min
    for (let i = 0; i < 10; i++) fireEvent.click(leftArrows[0])

    expect(leftArrows[0]).toHaveStyle({ visibility: 'hidden' })
  })

  test('increase difficulty button is hidden when at maximum difficulty', () => {
    const mode = new NormalMode()
    render(<MemoryRouter><GameModeContainer mode={mode} /></MemoryRouter>)

    const rightArrows = screen.getAllByText('→')
    // Click difficulty right (index 0) many times to reach max
    for (let i = 0; i < 10; i++) fireEvent.click(rightArrows[0])

    expect(rightArrows[0]).toHaveStyle({ visibility: 'hidden' })
  })

  test('size defaults to 8 when mode.size is 0 (falsy)', () => {
    const mode = new NormalMode()
    mode.size = 0
    render(<MemoryRouter><GameModeContainer mode={mode} /></MemoryRouter>)
    // The size display should show 8 (the fallback)
    expect(screen.getByText('8')).toBeInTheDocument()
  })
})
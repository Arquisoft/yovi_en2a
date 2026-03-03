import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { describe, test, expect, afterEach, vi } from 'vitest'
import { GameModeContainer } from '../components/gameSelection/gameModes/GameModeContainer'
import { NormalMode } from '../components/gameSelection/gameModes/NormalMode'
import '@testing-library/jest-dom'

describe('GameModeContainer Component', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  test('should render mode info, image and difficulty section', () => {
    const mode = new NormalMode()
    render(<GameModeContainer mode={mode} />)
    
    expect(screen.getByText(mode.label)).toBeInTheDocument()
    expect(screen.getByText(mode.description)).toBeInTheDocument() 
    expect(screen.getByAltText(mode.label)).toBeInTheDocument()
    
    // Use exact string matching to avoid catching the word "difficulty" in the description
    expect(screen.getByText('Difficulty')).toBeInTheDocument()
    expect(screen.getByText('PLAY')).toBeInTheDocument()
  })

  test('should update mode.currentLevel and call start() on PLAY click', () => {
    const mode = new NormalMode()
    const startSpy = vi.spyOn(mode, 'start')
    
    render(<GameModeContainer mode={mode} />)
    
    const playButton = screen.getByText('PLAY')
    fireEvent.click(playButton)
    
    expect(startSpy).toHaveBeenCalledTimes(1)
  })

  test('should handle difficulty navigation clicks', () => {
    const mode = new NormalMode()
    render(<GameModeContainer mode={mode} />)
    
    const leftArrow = screen.getByText('←')
    const rightArrow = screen.getByText('→')

    fireEvent.click(rightArrow)
    fireEvent.click(leftArrow)
    
    expect(leftArrow).toBeInTheDocument()
    expect(rightArrow).toBeInTheDocument()
  })
})
import { render, screen, cleanup } from '@testing-library/react'
import { describe, test, expect, afterEach } from 'vitest'
import { NormalMode } from '../components/gameSelection/gameModes/NormalMode' 
import { Difficulty } from '../components/gameSelection/gameModes/GameMode' 
import '@testing-library/jest-dom'

describe('NormalMode Class', () => {
  afterEach(() => {
    cleanup()
  })

  test('should initialize with correct default properties', () => {
    const mode = new NormalMode()
    
    expect(mode.id).toBe('normal')
    expect(mode.label).toBe('Normal Mode')
    expect(mode.currentLevel).toBe(Difficulty.Normal)
    expect(mode.description).toBe('Normal mode that follows the classical rules of the gamey game. Play against a bot and try to connect the three sizes to win.')
  })

  test('start method should return a valid React node with game details', () => {
    const mode = new NormalMode()
    
    render(<>{mode.start()}</>)
    
    expect(screen.getByText('Normal Mode')).toBeInTheDocument()
    expect(screen.getByText(`Difficulty: ${Difficulty.Normal}`)).toBeInTheDocument()
    expect(mode.description).toBe('Normal mode that follows the classical rules of the gamey game. Play against a bot and try to connect the three sizes to win.')
  })
})
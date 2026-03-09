import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, test, expect } from 'vitest'
import { GameSettings } from '../components/topRightMenu/settings/settingsSections/GameSettings'
import '@testing-library/jest-dom' // <-- librery that gives us the toBeChecked()

describe('GameSettings Strategy', () => {
  const gameSettings = new GameSettings()

  test('should initialize with correct id and label properties', () => {
    expect(gameSettings.id).toBe('game')
    expect(gameSettings.label).toBe('Game')
  })

  test('should render game preferences title and checkboxes', () => {
    render(gameSettings.render())
    
    expect(screen.getByText(/Game Preferences/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Show move hints/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Confirm moves/i)).toBeInTheDocument()
  })

  test('should have correct initial checkbox states based on defaultChecked', () => {
    render(gameSettings.render())
    
    const hintsCheckbox = screen.getByLabelText(/Show move hints/i)
    const confirmCheckbox = screen.getByLabelText(/Confirm moves/i)

    expect(hintsCheckbox).toBeChecked()
    expect(confirmCheckbox).not.toBeChecked()
  })

  test('should toggle checkbox values when clicked', async () => {
    const user = userEvent.setup() 
    render(gameSettings.render())
    
    const confirmCheckbox = screen.getByLabelText(/Confirm moves/i)
    const hintsCheckbox = screen.getByLabelText(/Show move hints/i)

    await user.click(confirmCheckbox)
    await user.click(hintsCheckbox)
    
    expect(confirmCheckbox).toBeChecked()
    expect(hintsCheckbox).not.toBeChecked()
  })
})
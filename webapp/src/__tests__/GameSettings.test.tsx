import { render, screen, fireEvent } from '@testing-library/react'
import { describe, test, expect } from 'vitest'
import { GameSettings } from '../components/TopRightMenu/settings/settingsSections/GameSettings'
import '@testing-library/jest-dom'

describe('GameSettings Strategy', () => {
  const gameSettings = new GameSettings()

  test('should render game preferences title and checkboxes', () => {
    render(gameSettings.render())
    
    // 1. Check if the section heading is present
    expect(screen.getByText(/Game Preferences/i)).toBeInTheDocument()
    
    // 2. Verify both checkboxes are rendered via their labels
    expect(screen.getByLabelText(/Show move hints/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Confirm moves/i)).toBeInTheDocument()
  })

  test('should have correct initial checkbox states', () => {
    render(gameSettings.render())
    
    const hintsCheckbox = screen.getByLabelText(/Show move hints/i)
    const confirmCheckbox = screen.getByLabelText(/Confirm moves/i)

    // Type narrowing to satisfy TypeScript/Linter
    if (!(hintsCheckbox instanceof HTMLInputElement) || !(confirmCheckbox instanceof HTMLInputElement)) {
      throw new TypeError('Elements are not HTMLInputElements')
    }

    // 3. Verify defaultChecked logic (one is true, one is false)
    expect(hintsCheckbox.checked).toBe(true)
    expect(confirmCheckbox.checked).toBe(false)
  })

  test('should toggle checkbox values when clicked', () => {
    render(gameSettings.render())
    
    const confirmCheckbox = screen.getByLabelText(/Confirm moves/i)
    
    if (!(confirmCheckbox instanceof HTMLInputElement)) {
      throw new TypeError('Confirm moves element is not an HTMLInputElement')
    }

    // 4. Act: Simulate user clicking the checkbox
    fireEvent.click(confirmCheckbox)
    
    // 5. Assert: State should now be true
    expect(confirmCheckbox.checked).toBe(true)
  })
})
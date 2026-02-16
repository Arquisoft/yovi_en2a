import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { describe, test, expect, afterEach } from 'vitest'
import { AudioSettings } from '../components/TopRightMenu/settings/settingsSections/AudioSettings'
import '@testing-library/jest-dom'

describe('AudioSettings Strategy', () => {
  const audioSettings = new AudioSettings()

  // This is crucial: It clears the DOM after each test to prevent 
  // event listener conflicts that hide coverage.
  afterEach(() => {
    cleanup()
  })

  test('should render sound settings title and sliders', () => {
    render(audioSettings.render())
    
    expect(screen.getByText(/Sound Settings/i)).toBeInTheDocument()
    expect(screen.getByText(/Master Volume/i)).toBeInTheDocument()
    expect(screen.getByText(/Music Volume/i)).toBeInTheDocument()
  })

  test('should handle all input and mouse interactions (Covers lines 22-24)', () => {
    render(audioSettings.render())
    
    // Selecting the Master Volume slider (default 80)
    const slider = screen.getByDisplayValue('80')
    const tooltip = screen.getByText('80')

    if (!(slider instanceof HTMLInputElement)) {
      throw new TypeError('Element is not an HTMLInputElement')
    }

    // 1. Test onInput (Line 22)
    fireEvent.input(slider, { target: { value: '40' } })
    expect(slider.value).toBe('40')

    // 2. Test onMouseDown (Line 23)
    fireEvent.mouseDown(slider)
    expect(tooltip).toHaveClass('visible')

    // 3. Test onMouseUp (Line 24)
    fireEvent.mouseUp(slider)
    expect(tooltip).not.toHaveClass('visible')
  })

  test('should handle all touch interactions (Covers lines 25-26)', () => {
    render(audioSettings.render())
    
    // Selecting the Music Volume slider (default 50)
    const slider = screen.getByDisplayValue('50')
    const tooltip = screen.getByText('50')

    // 1. Test onTouchStart (Line 25)
    fireEvent.touchStart(slider)
    expect(tooltip).toHaveClass('visible')

    // 2. Test onTouchEnd (Line 26)
    fireEvent.touchEnd(slider)
    expect(tooltip).not.toHaveClass('visible')
  })
})
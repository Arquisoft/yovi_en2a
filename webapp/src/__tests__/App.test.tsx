import { render, screen } from '@testing-library/react'
import { describe, test, expect } from 'vitest'
import App from '../App'
import '@testing-library/jest-dom'

describe('App Component Root', () => {
  
  test('should render MainMenu as the default view', () => {
    render(<App />)
    
    // Check for a core element of MainMenu to confirm it's being displayed.
    // Assuming MainMenu has the title 'GAMEY'.
    const mainTitle = screen.getByText(/GAMEY/i)
    
    expect(mainTitle).toBeInTheDocument()
  })

  test('should match the snapshot', () => {
    const { asFragment } = render(<App />)
    
    // Snapshot testing ensures the UI structure doesn't change unexpectedly.
    expect(asFragment()).toMatchSnapshot()
  })
})
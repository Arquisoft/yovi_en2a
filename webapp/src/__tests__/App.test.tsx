import { render, screen } from '@testing-library/react'
import { describe, test, expect } from 'vitest'
import App from '../App'
import '@testing-library/jest-dom'

describe('App Component Root', () => {
  
  test('should render MainMenu as the default view', () => {
    // Render the App directly since it already contains its own Router
    render(<App />)
    
    // Check for a core element to confirm it's being displayed
    const mainTitle = screen.getByText(/GAMEY/i)

    expect(mainTitle).toBeInTheDocument()
  })

  test('should match the snapshot', () => {
    const { asFragment } = render(<App />)
    
    // Snapshot testing ensures the UI structure doesn't change unexpectedly
    expect(asFragment()).toMatchSnapshot()
  })
})
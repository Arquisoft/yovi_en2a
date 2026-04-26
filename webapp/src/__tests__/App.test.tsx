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

  test('renders main menu action buttons', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /play as guest/i })).toBeInTheDocument()
  })

  test('renders top-right navigation buttons', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: /help/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /rankings/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /mute/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /settings/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /user/i })).toBeInTheDocument()
  })
})
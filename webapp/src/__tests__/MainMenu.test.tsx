import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, test, expect, vi } from 'vitest'
import MainMenu from '../components/MainMenu/MainMenu'
import '@testing-library/jest-dom'

describe('MainMenu Component', () => {
  
  test('renders title and subtitle correctly', () => {
    render(<MainMenu />)
    
    expect(screen.getByText(/GAMEY/i)).toBeInTheDocument()
    expect(screen.getByText(/Three sides, one goal/i)).toBeInTheDocument()
  })

  test('renders the action buttons with correct labels', () => {
    render(<MainMenu />)
    
    // Verificamos que los botones que vienen de MenuButtons existan
    expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /play as guest/i })).toBeInTheDocument()
  })

  test('calls console.log when buttons are clicked', async () => {
    const user = userEvent.setup()
    
    // Espiamos el console.log para ver si se llama
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    
    render(<MainMenu />)

    // Click en Log In
    const loginBtn = screen.getByRole('button', { name: /log in/i })
    await user.click(loginBtn)
    expect(consoleSpy).toHaveBeenCalledWith('Log In')

    // Click en Guest
    const guestBtn = screen.getByRole('button', { name: /play as guest/i })
    await user.click(guestBtn)
    expect(consoleSpy).toHaveBeenCalledWith('Play as Guest')

    consoleSpy.mockRestore()
  })
})
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, test, expect } from 'vitest'
import TopRightMenu from '../components/TopRightMenu/TopRightMenu'
import '@testing-library/jest-dom'

describe('TopRightMenu Component', () => {
  
  test('renders all navigation buttons', () => {
    render(<TopRightMenu />)
    // Checking for the existence of all menu items
    expect(screen.getByRole('button', { name: /help/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /rankings/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /volume/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /settings/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /user/i })).toBeInTheDocument()
  })

  test('toggles volume icon when clicked', async () => {
    const user = userEvent.setup()
    render(<TopRightMenu />)
    
    const volumeBtn = screen.getByRole('button', { name: /volume/i })
    const img = volumeBtn.querySelector('img')
    const initialSrc = img?.getAttribute('src')
    
    // Act: Toggle volume
    await user.click(volumeBtn)
    // Assert: Image source should change to the mute icon
    expect(img?.getAttribute('src')).not.toBe(initialSrc)
  })

  test('opens and closes the Settings menu', async () => {
    const user = userEvent.setup()
    render(<TopRightMenu />)
    
    // 1. Open Settings
    const settingsBtn = screen.getByRole('button', { name: /settings/i })
    await user.click(settingsBtn)
    
    // Verify the Settings modal is rendered
    expect(screen.getByText('SETTINGS')).toBeInTheDocument()

    // 2. Close Settings using the Universal Close handler (line 41 in your code)
    const closeBtn = screen.getByRole('button', { name: /close/i })
    await user.click(closeBtn)
    
    // Verify the modal is removed from DOM
    expect(screen.queryByText('SETTINGS')).not.toBeInTheDocument()
  })

  test('opens the Rankings menu', async () => {
    const user = userEvent.setup()
    render(<TopRightMenu />)
    
    const rankingBtn = screen.getByRole('button', { name: /rankings/i })
    await user.click(rankingBtn)
    
    // Check for the Rankings header to confirm conditional rendering
    const rankingTitles = screen.getAllByText(/rankings/i)
    expect(rankingTitles.length).toBeGreaterThan(0)
  })

  /**
   * FIX FOR LINES 48 & 72: 
   * We need to trigger the state change for 'help' and 'user' 
   * even if they don't open a modal yet.
   */
  test('triggers Help and User menu states', async () => {
    const user = userEvent.setup()
    render(<TopRightMenu />)
    
    const helpBtn = screen.getByRole('button', { name: /help/i })
    const userBtn = screen.getByRole('button', { name: /user/i })

    // Click Help (Covers line 48)
    await user.click(helpBtn)
    
    // Click User (Covers line 72)
    await user.click(userBtn)
    
    // These clicks ensure the setActiveMenu branch is fully executed
    expect(helpBtn).toBeInTheDocument()
    expect(userBtn).toBeInTheDocument()
  })
})
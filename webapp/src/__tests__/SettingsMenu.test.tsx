import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, test, expect, vi } from 'vitest'
import SettingsMenu from '../components/TopRightMenu/settings/Settings'
import '@testing-library/jest-dom'

describe('SettingsMenu Component', () => {
  const mockOnClose = vi.fn()

  test('renders global header and default section', () => {
    render(<SettingsMenu onClose={mockOnClose} />)
    
    // 1. Verify the global title (h2) is present
    expect(screen.getByRole('heading', { name: /SETTINGS/i, level: 2 })).toBeInTheDocument()
    
    // 2. Verify the close button exists via its aria-label
    expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument()
  })

  test('switches sections when sidebar buttons are clicked', async () => {
    const user = userEvent.setup()
    render(<SettingsMenu onClose={mockOnClose} />)

    // The menu starts at the first section (usually Audio)
    // We look for the "Account" section button in the sidebar
    const accountTab = screen.getByRole('button', { name: /account/i })
    
    // Act: Click the Account tab
    await user.click(accountTab)

    // Assert: The main panel heading should change to "Account"
    // This triggers the logic for .find() and setActiveTabId, 
    // effectively covering the AccountSettings render path.
    expect(screen.getByRole('heading', { name: /account/i, level: 2 })).toBeInTheDocument()
  })

  test('calls onClose when the close button is clicked', async () => {
    const user = userEvent.setup()
    render(<SettingsMenu onClose={mockOnClose} />)

    // Locate the close button by its accessible name
    const closeBtn = screen.getByRole('button', { name: /close/i })
    await user.click(closeBtn)

    // Verify the callback function was triggered
    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })
})
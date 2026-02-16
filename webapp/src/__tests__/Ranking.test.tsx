import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, test, expect, vi } from 'vitest'
import Ranking from '../components/TopRightMenu/ranking/Ranking'
import '@testing-library/jest-dom'

describe('Ranking Component', () => {
  // Mock function to simulate the closing action
  const mockOnClose = vi.fn()

  test('should render the global header and navigation tabs', () => {
    render(<Ranking onClose={mockOnClose} />)
    
    // Verify the main title is displayed in the header
    expect(screen.getByText('RANKINGS')).toBeInTheDocument()
    
    // Check if both ranking type buttons are rendered
    expect(screen.getByRole('button', { name: /local/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /global/i })).toBeInTheDocument()
  })

  test('should switch between Local and Global rankings when tabs are clicked', async () => {
    const user = userEvent.setup()
    render(<Ranking onClose={mockOnClose} />)

    // Select the Global tab button
    const globalTab = screen.getByRole('button', { name: /global/i })
    
    // Act: Click on the Global ranking tab
    await user.click(globalTab)

    // Assert: The clicked tab should now have the 'active' CSS class
    expect(globalTab).toHaveClass('active')
    
    // The Local tab should no longer be the active one
    const localTab = screen.getByRole('button', { name: /local/i })
    expect(localTab).not.toHaveClass('active')
  })

  test('should trigger onClose when the close button is clicked', async () => {
    const user = userEvent.setup()
    render(<Ranking onClose={mockOnClose} />)

    // Find the button using its accessible name (aria-label="Close")
    const closeBtn = screen.getByRole('button', { name: /close/i })
    
    // Act: Simulate user clicking the "X" button
    await user.click(closeBtn)

    // Assert: Check if the mock function was called exactly once
    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })
})
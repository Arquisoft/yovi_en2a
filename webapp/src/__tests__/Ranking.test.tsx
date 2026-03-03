import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, test, expect, vi } from 'vitest'
import Ranking from '../components/topRightMenu/ranking/Ranking'
import '@testing-library/jest-dom'

describe('Ranking Component', () => {
  const mockOnClose = vi.fn()

  test('should render the global header and navigation tabs', () => {
    render(<Ranking onClose={mockOnClose} />)
    
    expect(screen.getByText('RANKINGS')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /local/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /global/i })).toBeInTheDocument()
  })

  test('should switch between Local and Global rankings when tabs are clicked', async () => {
    const user = userEvent.setup()
    render(<Ranking onClose={mockOnClose} />)

    const globalTab = screen.getByRole('button', { name: /global/i })
    await user.click(globalTab)

    // Assert using match to bypass CSS Module hashing
    expect(globalTab.className).toMatch(/active/i)
    
    const localTab = screen.getByRole('button', { name: /local/i })
    expect(localTab.className).not.toMatch(/active/i)
  })

  test('should trigger onClose when the close button is clicked', async () => {
    const user = userEvent.setup()
    render(<Ranking onClose={mockOnClose} />)

    const closeBtn = screen.getByRole('button', { name: /close/i })
    await user.click(closeBtn)

    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })
})
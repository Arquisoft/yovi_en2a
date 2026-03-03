import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { describe, test, expect, afterEach, vi, beforeAll } from 'vitest'
import SelectionPanel from '../components/gameSelection/selectionPanel/SelectionPanel' 
import '@testing-library/jest-dom'

describe('SelectionPanel Component', () => {
  beforeAll(() => {
    Element.prototype.scrollBy = vi.fn()
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  test('should render the carousel controls and default mode', () => {
    render(<SelectionPanel />)
    
    // Select the first left arrow and last right arrow to target the carousel controls
    const leftArrows = screen.getAllByText('←')
    const rightArrows = screen.getAllByText('→')
    
    expect(leftArrows[0]).toBeInTheDocument()
    expect(rightArrows.at(-1)).toBeInTheDocument()
    expect(screen.getByText(/Normal Mode/i)).toBeInTheDocument()
  })

  test('should trigger scrollBy with correct values on arrow clicks', () => {
    render(<SelectionPanel />)
    
    const rightArrows = screen.getAllByText('→')
    
    // Select the outer arrows (carousel)
    const leftArrow = screen.getAllByText('←')[0]
    const rightArrow = rightArrows.at(-1)!

    fireEvent.click(rightArrow)
    expect(Element.prototype.scrollBy).toHaveBeenCalledWith({
      left: 400,
      behavior: 'smooth'
    })

    fireEvent.click(leftArrow)
    expect(Element.prototype.scrollBy).toHaveBeenCalledWith({
      left: -400,
      behavior: 'smooth'
    })
  })
})
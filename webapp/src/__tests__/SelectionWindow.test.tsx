import { render, screen, cleanup } from '@testing-library/react'
import { describe, test, expect, afterEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import SelectionWindow from '../components/gameSelection/SelectionWindow'
import '@testing-library/jest-dom'

describe('SelectionWindow Component', () => {
  afterEach(() => {
    cleanup()
  })

  test('should render the main title and basic structure', () => {
    render(<MemoryRouter><SelectionWindow /></MemoryRouter>)
    
    const mainTitle = screen.getByText(/SELECT YOUR GAME MODE/i)
    expect(mainTitle).toBeInTheDocument()
    
    // Verify at least one left arrow exists in the document
    expect(screen.getAllByText('←').length).toBeGreaterThan(0)
  })

  // test('should match the snapshot', () => {
  //   const { asFragment } = render(<MemoryRouter><SelectionWindow /></MemoryRouter>)
  //   expect(asFragment()).toMatchSnapshot()
  // })
})
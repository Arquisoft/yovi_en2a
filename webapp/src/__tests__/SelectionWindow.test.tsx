import { render, screen, cleanup } from '@testing-library/react'
import { describe, test, expect, vi, afterEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import '@testing-library/jest-dom'

// Stub heavy child components that have their own test files
vi.mock('../components/topLeftHeader/TopLeftHeader', () => ({
  default: () => <div data-testid="top-left-header" />,
}))
vi.mock('../components/topRightMenu/TopRightMenu', () => ({
  default: () => <div data-testid="top-right-menu" />,
}))
vi.mock('../components/gameSelection/selectionPanel/SelectionPanel', () => ({
  default: () => <div data-testid="selection-panel" />,
}))

import SelectionWindow from '../components/gameSelection/SelectionWindow'

describe('SelectionWindow', () => {
  afterEach(cleanup)

  test('renders heading and all main child sections', () => {
    render(<MemoryRouter><SelectionWindow /></MemoryRouter>)
    expect(screen.getByText(/SELECT YOUR GAME MODE/i)).toBeInTheDocument()
    expect(screen.getByTestId('top-left-header')).toBeInTheDocument()
    expect(screen.getByTestId('top-right-menu')).toBeInTheDocument()
    expect(screen.getByTestId('selection-panel')).toBeInTheDocument()
  })
})

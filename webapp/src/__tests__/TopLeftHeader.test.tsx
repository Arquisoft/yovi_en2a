import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, test, expect } from 'vitest'
import TopLeftHeader from '../components/topLeftHeader/TopLeftHeader'
import '@testing-library/jest-dom'

describe('TopLeftHeader', () => {
  test('renders the game title', () => {
    render(<MemoryRouter><TopLeftHeader /></MemoryRouter>)
    expect(screen.getByRole('heading', { name: /game y/i })).toBeInTheDocument()
  })

  test('wraps the title in a link to the home route', () => {
    render(<MemoryRouter><TopLeftHeader /></MemoryRouter>)
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/')
  })
})

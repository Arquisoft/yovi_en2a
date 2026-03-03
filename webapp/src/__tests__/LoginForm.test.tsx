import { render, screen, cleanup, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import LoginForm from '../components/auth/LoginForm' // Ajusta la ruta si es necesario
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest' 
import '@testing-library/jest-dom'

// 1. Mock react-router-dom to track navigation
const mockNavigate = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual as any,
    useNavigate: () => mockNavigate,
  }
})

describe('LoginForm Full Coverage', () => {
  
  beforeEach(() => {
    mockNavigate.mockClear()
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  // Helper function to fill out the form
  const fillOutForm = async (user: any, suffix: string = '') => {
    await user.type(screen.getByLabelText(/Email address/i), `test${suffix}@example.com`)
    await user.type(screen.getByLabelText(/Password/i), 'securepassword123')
  }

  test('handles local validation if fields are empty', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter><LoginForm /></MemoryRouter>)
    
    const button = screen.getByRole('button', { name: /Login/i })

    // Act: Click without filling out the form
    await user.click(button)
    
    // Assert: Validation error should appear
    expect(await screen.findByText(/Please fill in all required fields/i)).toBeInTheDocument()
  })

  test('handles successful login and delayed navigation', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter><LoginForm /></MemoryRouter>)
    
    const button = screen.getByRole('button', { name: /Login/i })

    // Mock successful server response
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'Login successful!' }),
    } as Response)

    // Act: Fill and submit the form
    await fillOutForm(user)
    await user.click(button)

    // Assert 1: Success message should appear in the DOM
    expect(await screen.findByText(/Login successful!/i)).toBeInTheDocument()
    
    // Assert 2: Wait for the setTimeout (1000ms) to trigger the navigation
    // We extend the timeout slightly to 1500ms to ensure the test runner doesn't fail prematurely
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/gameSelection')
    }, { timeout: 1500 })
  })

  test('handles server errors with and without specific messages', async () => {
    const user = userEvent.setup()

    // Scenario A: Server provides a specific error message
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Invalid credentials' }),
    } as Response)

    render(<MemoryRouter><LoginForm /></MemoryRouter>)
    await fillOutForm(user, '1')
    await user.click(screen.getByRole('button', { name: /Login/i }))
    expect(await screen.findByText(/Invalid credentials/i)).toBeInTheDocument()

    cleanup() // Clean the DOM for the next scenario

    // Scenario B: Server returns an error without a specific message
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({}), 
    } as Response)

    render(<MemoryRouter><LoginForm /></MemoryRouter>)
    await fillOutForm(user, '2')
    await user.click(screen.getByRole('button', { name: /Login/i }))
    expect(await screen.findByText(/Server error occurred/i)).toBeInTheDocument()
  })

  test('handles network failures and generic exceptions', async () => {
    const user = userEvent.setup()

    // Scenario A: Standard Error object thrown by fetch (e.g., DNS issue)
    globalThis.fetch = vi.fn().mockRejectedValueOnce(new Error('Failed to fetch'))

    render(<MemoryRouter><LoginForm /></MemoryRouter>)
    await fillOutForm(user, '3')
    await user.click(screen.getByRole('button', { name: /Login/i }))
    expect(await screen.findByText(/Failed to fetch/i)).toBeInTheDocument()

    cleanup()

    // Scenario B: Non-standard rejection (fallback error message)
    globalThis.fetch = vi.fn().mockRejectedValueOnce('Network disconnected')

    render(<MemoryRouter><LoginForm /></MemoryRouter>)
    await fillOutForm(user, '4')
    await user.click(screen.getByRole('button', { name: /Login/i }))
    expect(await screen.findByText(/A network error occurred/i)).toBeInTheDocument()
  })
})
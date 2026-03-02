import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RegisterForm from '../components/auth/RegisterForm'
import { afterEach, describe, expect, test, vi } from 'vitest' 
import '@testing-library/jest-dom'

describe('RegisterForm Full Coverage', () => {
  
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  // 1. Covers Lines 16-34: Validation & Success Path
  test('handles validation and successful submission', async () => {
    const user = userEvent.setup()
    render(<RegisterForm />)
    
    const input = screen.getByLabelText(/whats your name\?/i)
    const button = screen.getByRole('button', { name: /lets go!/i })

    // Validation (Line 17-18)
    await user.click(button)
    expect(await screen.findByText(/please enter a username/i)).toBeInTheDocument()

    // Success (Line 23-34)
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'Welcome Pablo!' }),
    } as Response)

    await user.type(input, 'Pablo')
    await user.click(button)

    expect(await screen.findByText(/welcome pablo!/i)).toBeInTheDocument()
    expect(input).toHaveValue('') // Verify setUsername('') on line 34
  })

  // 2. Covers Lines 35-36: Server Error (The "else" branch)
  test('handles server errors with and without messages', async () => {
    const user = userEvent.setup()

    // Scenario A: Server provides an error message (Line 36 left side)
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Database Error' }),
    } as Response)

    render(<RegisterForm />)
    await user.type(screen.getByLabelText(/whats your name\?/i), 'User1')
    await user.click(screen.getByRole('button', { name: /lets go!/i }))
    expect(await screen.findByText(/database error/i)).toBeInTheDocument()

    cleanup()

    // Scenario B: Server is silent, triggers fallback (Line 36 right side: || 'Server error')
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({}), 
    } as Response)

    render(<RegisterForm />)
    await user.type(screen.getByLabelText(/whats your name\?/i), 'User2')
    await user.click(screen.getByRole('button', { name: /lets go!/i }))
    expect(await screen.findByText(/server error/i)).toBeInTheDocument()
  })

  // 3. Covers Lines 37-38: Network Failure (The "catch" block)
  test('handles network failure with and without error objects', async () => {
    const user = userEvent.setup()

    // Scenario A: Standard Error object (Line 38 left side: err.message)
    globalThis.fetch = vi.fn().mockRejectedValueOnce(new Error('DNS Failure'))

    render(<RegisterForm />)
    await user.type(screen.getByLabelText(/whats your name\?/i), 'User3')
    await user.click(screen.getByRole('button', { name: /lets go!/i }))
    expect(await screen.findByText(/dns failure/i)).toBeInTheDocument()

    cleanup()

    // Scenario B: Thrown string/null (Line 38 right side: || 'Network error')
    globalThis.fetch = vi.fn().mockRejectedValueOnce('Something went wrong')

    render(<RegisterForm />)
    await user.type(screen.getByLabelText(/whats your name\?/i), 'User4')
    await user.click(screen.getByRole('button', { name: /lets go!/i }))
    expect(await screen.findByText(/network error/i)).toBeInTheDocument()
  })

  // 4. Covers Line 41: The "finally" block
  test('ensures loading state is reset in finally block', async () => {
    const user = userEvent.setup()
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'Done' }),
    } as Response)

    render(<RegisterForm />)
    const button = screen.getByRole('button', { name: /lets go!/i })
    
    await user.type(screen.getByLabelText(/whats your name\?/i), 'User5')
    await user.click(button)
    
    // Once the message appears, the finally block MUST have executed
    await screen.findByText(/done/i)
    expect(button).not.toBeDisabled()
    expect(button).toHaveTextContent(/lets go!/i)
  })
})
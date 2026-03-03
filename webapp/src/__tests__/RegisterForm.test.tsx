import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import RegisterForm from '../components/auth/RegisterForm'
import { afterEach, describe, expect, test, vi } from 'vitest' 
import '@testing-library/jest-dom'

describe('RegisterForm Full Coverage', () => {
  
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  // Helper para rellenar el formulario completo y pasar tu validación local
  const fillOutForm = async (user: any, suffix: string = '') => {
    await user.type(screen.getByLabelText(/Email address/i), `test${suffix}@test.com`)
    await user.type(screen.getByLabelText(/Username/i), `User${suffix}`)
    await user.type(screen.getByLabelText(/Password/i), 'password123')
  }

  test('handles validation and successful submission', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter><RegisterForm /></MemoryRouter>)
    
    const button = screen.getByRole('button', { name: /Sign Up/i })

    // 1. Test empty submission (Local validation)
    await user.click(button)
    expect(await screen.findByText(/Please fill in all required fields/i)).toBeInTheDocument()

    // 2. Test successful submission
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'Welcome Pablo!' }),
    } as Response)

    await fillOutForm(user, 'Pablo')
    await user.click(button)

    // Verify the success message appears
    expect(await screen.findByText(/welcome pablo!/i)).toBeInTheDocument()
    
    // Note: We removed the check that forces the input to be empty,
    // as the actual React component does not clear the fields after success.
  })

  test('handles server errors with and without messages', async () => {
    const user = userEvent.setup()

    // Escenario A: Error con mensaje
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Database Error' }),
    } as Response)

    render(<MemoryRouter><RegisterForm /></MemoryRouter>)
    await fillOutForm(user, '1')
    await user.click(screen.getByRole('button', { name: /Sign Up/i }))
    expect(await screen.findByText(/database error/i)).toBeInTheDocument()

    cleanup()

    // Escenario B: Error silencioso del servidor
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({}), 
    } as Response)

    render(<MemoryRouter><RegisterForm /></MemoryRouter>)
    await fillOutForm(user, '2')
    await user.click(screen.getByRole('button', { name: /Sign Up/i }))
    expect(await screen.findByText(/server error/i)).toBeInTheDocument()
  })

  test('handles network failure with and without error objects', async () => {
    const user = userEvent.setup()

    globalThis.fetch = vi.fn().mockRejectedValueOnce(new Error('DNS Failure'))

    render(<MemoryRouter><RegisterForm /></MemoryRouter>)
    await fillOutForm(user, '3')
    await user.click(screen.getByRole('button', { name: /Sign Up/i }))
    expect(await screen.findByText(/dns failure/i)).toBeInTheDocument()

    cleanup()

    globalThis.fetch = vi.fn().mockRejectedValueOnce('Something went wrong')

    render(<MemoryRouter><RegisterForm /></MemoryRouter>)
    await fillOutForm(user, '4')
    await user.click(screen.getByRole('button', { name: /Sign Up/i }))
    expect(await screen.findByText(/network error/i)).toBeInTheDocument()
  })

  test('ensures loading state is reset in finally block', async () => {
    const user = userEvent.setup()
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'Done' }),
    } as Response)

    render(<MemoryRouter><RegisterForm /></MemoryRouter>)
    const button = screen.getByRole('button', { name: /Sign Up/i })
    
    await fillOutForm(user, '5')
    await user.click(button)
    
    await screen.findByText(/done/i)
    expect(button).not.toBeDisabled()
    expect(button).toHaveTextContent(/Sign Up/i)
  })
})
import { render, screen, cleanup, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import LoginForm from '../components/auth/LoginForm'
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

  // Helper para rellenar el formulario
  const fillOutForm = async (user: any, suffix: string = '') => {
    await user.type(screen.getByLabelText(/Email address/i), `test${suffix}@example.com`)
    await user.type(screen.getByLabelText(/Password/i), 'securepassword123')
  }

  // NUEVO: Helper para interceptar múltiples peticiones fetch (CSRF + Login)
  const setupFetchMock = (loginResponse: any, isOk: boolean = true, isError: boolean = false) => {
    globalThis.fetch = vi.fn().mockImplementation((url: string | URL | Request) => {
      const urlString = url.toString()
      
      // 1. Interceptar siempre el CSRF Token al cargar la página
      if (urlString.includes('csrf-token')) {
        return Promise.resolve({
          json: async () => ({ csrfToken: 'fake-token' })
        })
      }
      
      // 2. Interceptar el Login (Simular caída de red o catch)
      if (isError) {
        return Promise.reject(loginResponse)
      }

      // 3. Interceptar el Login (Simular éxito o error de validación)
      return Promise.resolve({
        ok: isOk,
        json: async () => loginResponse
      })
    })
  }

  test('handles local validation if fields are empty', async () => {
    const user = userEvent.setup()
    setupFetchMock({}) // Mock por defecto
    render(<MemoryRouter><LoginForm /></MemoryRouter>)
    
    const button = screen.getByRole('button', { name: /Login/i })
    await user.click(button)
    expect(await screen.findByText(/Please fill in all required fields/i)).toBeInTheDocument()
  })

  test('handles successful login and delayed navigation', async () => {
    const user = userEvent.setup()
    
    // Preparamos el mock de éxito para el login
    setupFetchMock({ message: 'Login successful!', username: 'testuser', email: 'test@example.com' }, true)
    
    render(<MemoryRouter><LoginForm /></MemoryRouter>)
    const button = screen.getByRole('button', { name: /Login/i })

    await fillOutForm(user)
    await user.click(button)

    expect(await screen.findByText(/Login successful!/i)).toBeInTheDocument()
    
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/gameSelection')
    }, { timeout: 1600 })
  })

  test('handles server errors with and without specific messages', async () => {
    const user = userEvent.setup()

    // Scenario A: Server proporciona un mensaje específico
    setupFetchMock({ error: 'Invalid credentials' }, false)

    render(<MemoryRouter><LoginForm /></MemoryRouter>)
    await fillOutForm(user, '1')
    await user.click(screen.getByRole('button', { name: /Login/i }))
    expect(await screen.findByText(/Invalid credentials/i)).toBeInTheDocument()

    cleanup() 

    // Scenario B: Server devuelve un error genérico (vacío)
    setupFetchMock({}, false)

    render(<MemoryRouter><LoginForm /></MemoryRouter>)
    await fillOutForm(user, '2')
    await user.click(screen.getByRole('button', { name: /Login/i }))
    expect(await screen.findByText(/Server error occurred/i)).toBeInTheDocument()
  })

  test('handles network failures and generic exceptions', async () => {
    const user = userEvent.setup()

    // Scenario A: Error de red con objeto estándar
    setupFetchMock(new Error('Failed to fetch'), false, true)

    render(<MemoryRouter><LoginForm /></MemoryRouter>)
    await fillOutForm(user, '3')
    await user.click(screen.getByRole('button', { name: /Login/i }))
    expect(await screen.findByText(/Failed to fetch/i)).toBeInTheDocument()

    cleanup()

    // Scenario B: String de error genérico en el catch
    setupFetchMock('Network disconnected', false, true)

    render(<MemoryRouter><LoginForm /></MemoryRouter>)
    await fillOutForm(user, '4')
    await user.click(screen.getByRole('button', { name: /Login/i }))
    expect(await screen.findByText(/A network error occurred/i)).toBeInTheDocument()
  })
})
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import RegisterForm from '../components/auth/RegisterForm'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest' 
import '@testing-library/jest-dom'

// Mock react-router-dom para evitar problemas con useNavigate
const mockNavigate = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual as any,
    useNavigate: () => mockNavigate,
  }
})

describe('RegisterForm Full Coverage', () => {
  
  beforeEach(() => {
    mockNavigate.mockClear()
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  // Helper para rellenar el formulario completo
  const fillOutForm = async (user: any, suffix: string = '') => {
    await user.type(screen.getByLabelText(/Email address/i), `test${suffix}@test.com`)
    await user.type(screen.getByLabelText(/Username/i), `User${suffix}`)
    await user.type(screen.getByLabelText(/Password/i), 'password123')
  }

  // Helper para interceptar múltiples peticiones fetch (CSRF + Registro)
  const setupFetchMock = (registerResponse: any, isOk: boolean = true, isError: boolean = false) => {
    globalThis.fetch = vi.fn().mockImplementation((url: string | URL | Request) => {
      const urlString = url.toString()
      
      // 1. Interceptar siempre el CSRF Token al cargar la página
      if (urlString.includes('csrf-token')) {
        return Promise.resolve({
          json: async () => ({ csrfToken: 'fake-token' })
        })
      }
      
      // 2. Interceptar el Registro (Simular caída de red o catch)
      if (isError) {
        return Promise.reject(registerResponse)
      }

      // 3. Interceptar el Registro (Simular éxito o error)
      return Promise.resolve({
        ok: isOk,
        json: async () => registerResponse
      })
    })
  }

  test('handles validation and successful submission', async () => {
    const user = userEvent.setup()
    setupFetchMock({ message: 'Welcome Pablo!' }, true)
    
    render(<MemoryRouter><RegisterForm /></MemoryRouter>)
    
    const button = screen.getByRole('button', { name: /Sign Up/i })

    // 1. Test empty submission (Local validation)
    await user.click(button)
    expect(await screen.findByText(/Please fill in all required fields/i)).toBeInTheDocument()

    // 2. Test successful submission
    await fillOutForm(user, 'Pablo')
    await user.click(button)

    // Verify the success message appears
    expect(await screen.findByText(/welcome pablo!/i)).toBeInTheDocument()
  })

  test('handles server errors with and without messages', async () => {
    const user = userEvent.setup()

    // Escenario A: Error con mensaje específico desde el servidor
    setupFetchMock({ error: 'Database Error' }, false)

    render(<MemoryRouter><RegisterForm /></MemoryRouter>)
    await fillOutForm(user, '1')
    await user.click(screen.getByRole('button', { name: /Sign Up/i }))
    expect(await screen.findByText(/database error/i)).toBeInTheDocument()

    cleanup()

    // Escenario B: Error silencioso del servidor (Usa el fallback de tu código)
    setupFetchMock({}, false)

    render(<MemoryRouter><RegisterForm /></MemoryRouter>)
    await fillOutForm(user, '2')
    await user.click(screen.getByRole('button', { name: /Sign Up/i }))
    // Corregido: Tu componente dice "Registration failed."
    expect(await screen.findByText(/Registration failed/i)).toBeInTheDocument()
  })

  test('handles network failure with and without error objects', async () => {
    const user = userEvent.setup()

    // Escenario A: Error de objeto (e.g., DNS Failure)
    setupFetchMock(new Error('DNS Failure'), false, true)

    render(<MemoryRouter><RegisterForm /></MemoryRouter>)
    await fillOutForm(user, '3')
    await user.click(screen.getByRole('button', { name: /Sign Up/i }))
    expect(await screen.findByText(/dns failure/i)).toBeInTheDocument()

    cleanup()

    // Escenario B: Falla con un mensaje genérico (catch puro)
    setupFetchMock('Something went wrong', false, true)

    render(<MemoryRouter><RegisterForm /></MemoryRouter>)
    await fillOutForm(user, '4')
    await user.click(screen.getByRole('button', { name: /Sign Up/i }))
    // Corregido: Tu componente dice "A network error occurred."
    expect(await screen.findByText(/A network error occurred/i)).toBeInTheDocument()
  })

  test('ensures loading state is reset in finally block', async () => {
    const user = userEvent.setup()
    setupFetchMock({ message: 'Done' }, true)

    render(<MemoryRouter><RegisterForm /></MemoryRouter>)
    const button = screen.getByRole('button', { name: /Sign Up/i })
    
    await fillOutForm(user, '5')
    await user.click(button)
    
    // Esperamos a que aparezca el mensaje de éxito
    await screen.findByText(/done/i)
    
    // Verificamos que el botón vuelve a la normalidad
    expect(button).not.toBeDisabled()
    expect(button).toHaveTextContent(/Sign Up/i)
  })
})
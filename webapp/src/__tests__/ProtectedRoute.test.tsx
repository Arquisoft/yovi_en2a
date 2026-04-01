import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, test, expect, vi } from 'vitest'
import ProtectedRoute from '../components/ProtectedRoute'
import '@testing-library/jest-dom'

vi.mock('../contexts/UserContext', () => ({
  useUser: vi.fn()
}))

import { useUser } from '../contexts/UserContext'

describe('ProtectedRoute', () => {
  test('renders nothing while loading', () => {
    vi.mocked(useUser).mockReturnValue({
      user: null, isLoggedIn: false, loading: true, error: null,
      refreshUser: vi.fn(), logout: vi.fn(), updateUsername: vi.fn()
    })
    const { container } = render(
      <MemoryRouter><ProtectedRoute><div>Protected</div></ProtectedRoute></MemoryRouter>
    )
    expect(container).toBeEmptyDOMElement()
  })

  test('redirects to /login when not logged in and not a guest', () => {
    vi.mocked(useUser).mockReturnValue({
      user: null, isLoggedIn: false, loading: false, error: null,
      refreshUser: vi.fn(), logout: vi.fn(), updateUsername: vi.fn()
    })
    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route path="/protected" element={<ProtectedRoute><div>Protected</div></ProtectedRoute>} />
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>
    )
    expect(screen.getByText('Login Page')).toBeInTheDocument()
  })

  test('renders children when user is logged in', () => {
    vi.mocked(useUser).mockReturnValue({
      user: { username: 'Alice', email: 'alice@test.com' },
      isLoggedIn: true, loading: false, error: null,
      refreshUser: vi.fn(), logout: vi.fn(), updateUsername: vi.fn()
    })
    render(
      <MemoryRouter><ProtectedRoute><div>Protected Content</div></ProtectedRoute></MemoryRouter>
    )
    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })

  test('renders children when user is a guest', () => {
    vi.mocked(useUser).mockReturnValue({
      user: null, isLoggedIn: false, loading: false, error: null,
      refreshUser: vi.fn(), logout: vi.fn(), updateUsername: vi.fn()
    })
    render(
      <MemoryRouter initialEntries={[{ pathname: '/game', state: { guest: true } }]}>
        <Routes>
          <Route path="/game" element={<ProtectedRoute><div>Guest Content</div></ProtectedRoute>} />
        </Routes>
      </MemoryRouter>
    )
    expect(screen.getByText('Guest Content')).toBeInTheDocument()
  })
})

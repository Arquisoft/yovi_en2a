import { render, waitFor, act } from '@testing-library/react'
import { describe, test, expect, vi, beforeEach } from 'vitest'
import { UserProvider, useUser } from '../contexts/UserContext'
import '@testing-library/jest-dom'

vi.mock('../security/useCsrf', () => ({
  fetchCsrfToken: vi.fn().mockResolvedValue('fake-csrf-token')
}))

// Helper component that exposes context values for assertions
const TestConsumer = ({ onRender }: { onRender: (ctx: ReturnType<typeof useUser>) => void }) => {
  const ctx = useUser()
  onRender(ctx)
  return <div data-testid="consumer">{ctx.user?.username ?? 'guest'}</div>
}

const renderWithProvider = (onRender: (ctx: ReturnType<typeof useUser>) => void) => {
  return render(
    <UserProvider>
      <TestConsumer onRender={onRender} />
    </UserProvider>
  )
}

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('UserContext — refreshUser', () => {
  test('sets user when /api/me returns ok', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ username: 'Alice', email: 'alice@test.com' })
    } as any)

    let ctx: ReturnType<typeof useUser> | null = null
    renderWithProvider(c => { ctx = c })

    await waitFor(() => expect(ctx!.loading).toBe(false))
    expect(ctx!.user).toEqual({ username: 'Alice', email: 'alice@test.com' })
    expect(ctx!.isLoggedIn).toBe(true)
  })

  test('sets user to null when /api/me returns non-ok', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false } as any)

    let ctx: ReturnType<typeof useUser> | null = null
    renderWithProvider(c => { ctx = c })

    await waitFor(() => expect(ctx!.loading).toBe(false))
    expect(ctx!.user).toBeNull()
    expect(ctx!.isLoggedIn).toBe(false)
  })

  test('sets error when /api/me throws (network failure)', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network down'))

    let ctx: ReturnType<typeof useUser> | null = null
    renderWithProvider(c => { ctx = c })

    await waitFor(() => expect(ctx!.loading).toBe(false))
    expect(ctx!.user).toBeNull()
    expect(ctx!.error).toMatch(/Could not reach the server/)
  })
})

describe('UserContext — logout', () => {
  test('calls logout API and clears user', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ username: 'Alice', email: 'a@a.com' }) })
      .mockResolvedValueOnce({ ok: true } as any)
    globalThis.fetch = fetchMock

    let ctx: ReturnType<typeof useUser> | null = null
    renderWithProvider(c => { ctx = c })

    await waitFor(() => expect(ctx!.isLoggedIn).toBe(true))

    await act(async () => { await ctx!.logout() })

    expect(ctx!.user).toBeNull()
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/logout'),
      expect.objectContaining({ method: 'POST' })
    )
  })

  test('clears user even if logout API call throws', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ username: 'Alice', email: 'a@a.com' }) })
      .mockRejectedValueOnce(new Error('Network error'))
    globalThis.fetch = fetchMock

    let ctx: ReturnType<typeof useUser> | null = null
    renderWithProvider(c => { ctx = c })

    await waitFor(() => expect(ctx!.isLoggedIn).toBe(true))

    // logout has try/finally without catch, so it propagates the error but still clears user
    await act(async () => {
      await ctx!.logout().catch(() => {})
    })

    expect(ctx!.user).toBeNull()
  })
})

describe('UserContext — updateUsername', () => {
  test('updates username in state on success', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ username: 'Alice', email: 'a@a.com' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ username: 'NewName' }) })
    globalThis.fetch = fetchMock

    let ctx: ReturnType<typeof useUser> | null = null
    renderWithProvider(c => { ctx = c })

    await waitFor(() => expect(ctx!.isLoggedIn).toBe(true))

    await act(async () => { await ctx!.updateUsername('NewName') })

    expect(ctx!.user?.username).toBe('NewName')
  })

  test('throws when API returns non-ok with error message', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ username: 'Alice', email: 'a@a.com' }) })
      .mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'Username taken' }) })
    globalThis.fetch = fetchMock

    let ctx: ReturnType<typeof useUser> | null = null
    renderWithProvider(c => { ctx = c })

    await waitFor(() => expect(ctx!.isLoggedIn).toBe(true))

    await expect(act(async () => { await ctx!.updateUsername('Taken') })).rejects.toThrow('Username taken')
  })

  test('throws generic message when API returns non-ok with no error body', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ username: 'Alice', email: 'a@a.com' }) })
      .mockResolvedValueOnce({ ok: false, json: async () => { throw new Error() } })
    globalThis.fetch = fetchMock

    let ctx: ReturnType<typeof useUser> | null = null
    renderWithProvider(c => { ctx = c })

    await waitFor(() => expect(ctx!.isLoggedIn).toBe(true))

    await expect(act(async () => { await ctx!.updateUsername('X') })).rejects.toThrow('Failed to update username.')
  })

  test('setUser callback returns null when user is already null at update time', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: false })          // refreshUser → user stays null
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) }) // updateUsername → ok
    globalThis.fetch = fetchMock

    let ctx: ReturnType<typeof useUser> | null = null
    renderWithProvider(c => { ctx = c })

    await waitFor(() => expect(ctx!.loading).toBe(false))
    // user is null; calling updateUsername should not throw and user stays null
    await act(async () => { await ctx!.updateUsername('GhostName') })

    expect(ctx!.user).toBeNull()
  })
})

describe('UserContext — useUser guard', () => {
  test('throws when used outside UserProvider', () => {
    const BrokenConsumer = () => { useUser(); return null }
    expect(() => render(<BrokenConsumer />)).toThrow('useUser must be used within a UserProvider')
  })
})

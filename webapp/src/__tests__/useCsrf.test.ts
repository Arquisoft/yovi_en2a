import { renderHook, waitFor } from '@testing-library/react'
import { describe, test, expect, vi, beforeEach } from 'vitest'
import { fetchCsrfToken, useCsrf } from '../security/useCsrf'

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('fetchCsrfToken', () => {
  test('returns the csrf token from the API', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      json: async () => ({ csrfToken: 'test-token-123' })
    } as any)

    const token = await fetchCsrfToken()
    expect(token).toBe('test-token-123')
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/csrf-token'),
      expect.objectContaining({ credentials: 'include' })
    )
  })
})

describe('useCsrf', () => {
  test('fetches and returns the csrf token on mount', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      json: async () => ({ csrfToken: 'hook-token-456' })
    } as any)

    const { result } = renderHook(() => useCsrf())

    expect(result.current).toBe('')
    await waitFor(() => expect(result.current).toBe('hook-token-456'))
  })

  test('logs error and leaves token empty when fetch fails', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'))
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { result } = renderHook(() => useCsrf())

    await waitFor(() => expect(consoleSpy).toHaveBeenCalled())
    expect(result.current).toBe('')
    consoleSpy.mockRestore()
  })
})

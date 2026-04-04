import { describe, test, expect, vi, beforeEach } from 'vitest'
import { createMatch, sendMove, requestBotMove, updateScore, saveMatch } from '../api/GameApi'

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('createMatch', () => {
  test('returns parsed JSON on success', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ match_id: 'abc123' })
    } as any)

    const result = await createMatch('player1', 'bot', 11)
    expect(result).toEqual({ match_id: 'abc123' })
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/game/new'),
      expect.objectContaining({ method: 'POST' })
    )
  })

  test('returns null when server responds with error status', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      text: async () => 'Unprocessable Entity'
    } as any)
    const result = await createMatch('player1', 'bot', 11)
    expect(result).toBeNull()
  })

  test('returns null when response is not valid JSON', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => 'not-valid-json'
    } as any)
    const result = await createMatch('player1', 'bot', 11)
    expect(result).toBeNull()
  })

  test('returns null on network error', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network down'))
    const result = await createMatch('player1', 'bot', 11)
    expect(result).toBeNull()
  })
})

describe('sendMove', () => {
  test('returns parsed JSON on success', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ match_id: 'abc123', game_over: false })
    } as any)

    const result = await sendMove('abc123', 1, 2, 3)
    expect(result).toEqual({ match_id: 'abc123', game_over: false })
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/game/executeMove'),
      expect.objectContaining({ method: 'POST' })
    )
  })

  test('returns null when server responds with error status', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      text: async () => 'Not Found'
    } as any)
    const result = await sendMove('abc123', 1, 2, 3)
    expect(result).toBeNull()
  })

  test('returns null when response is not valid JSON', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => 'not-valid-json'
    } as any)
    const result = await sendMove('abc123', 1, 2, 3)
    expect(result).toBeNull()
  })

  test('returns null on network error', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network down'))
    const result = await sendMove('abc123', 1, 2, 3)
    expect(result).toBeNull()
  })
})

describe('requestBotMove', () => {
  test('returns parsed JSON on success', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ match_id: 'abc123', coord_x: 1 })
    } as any)

    const result = await requestBotMove('abc123')
    expect(result).toEqual({ match_id: 'abc123', coord_x: 1 })
  })

  test('returns null when server responds with error status', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error'
    } as any)

    const result = await requestBotMove('abc123')
    expect(result).toBeNull()
  })

  test('returns null when response is not valid JSON', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => 'not-json'
    } as any)

    const result = await requestBotMove('abc123')
    expect(result).toBeNull()
  })

  test('returns null on network error', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network down'))
    const result = await requestBotMove('abc123')
    expect(result).toBeNull()
  })
})

describe('updateScore', () => {
  test('returns parsed JSON on success', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ updated: true })
    } as any)

    const result = await updateScore('uid1', 'Alice', true, 120)
    expect(result).toEqual({ updated: true })
  })

  test('returns null when server responds with error status', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => 'Bad Request'
    } as any)

    const result = await updateScore('uid1', 'Alice', false, 60)
    expect(result).toBeNull()
  })

  test('returns null on network error', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network down'))
    const result = await updateScore('uid1', 'Alice', true, 60)
    expect(result).toBeNull()
  })
})

describe('saveMatch', () => {
  test('returns parsed JSON on success', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ saved: true })
    } as any)

    const result = await saveMatch('match1', 'p1', 'p2', 'WIN', 300)
    expect(result).toEqual({ saved: true })
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/game/saveMatch'),
      expect.objectContaining({ method: 'POST' })
    )
  })

  test('returns null when server responds with error status', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'Server Error'
    } as any)

    const result = await saveMatch('match1', 'p1', 'p2', 'WIN', 300)
    expect(result).toBeNull()
  })

  test('returns null on network error', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network down'))
    const result = await saveMatch('match1', 'p1', 'p2', 'WIN', 300)
    expect(result).toBeNull()
  })
})

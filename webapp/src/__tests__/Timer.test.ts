import { renderHook, act } from '@testing-library/react'
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { useTimer } from '../components/gameWindow/rightPanel/Timer'

describe('useTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('starts at 00:00 and does not tick when not running', () => {
    const { result } = renderHook(() => useTimer(false))

    expect(result.current.seconds).toBe(0)
    expect(result.current.formattedTime).toBe('00:00')

    act(() => { vi.advanceTimersByTime(3000) })

    expect(result.current.seconds).toBe(0)
  })

  test('ticks every second when running', () => {
    const { result } = renderHook(() => useTimer(true))

    act(() => { vi.advanceTimersByTime(3000) })

    expect(result.current.seconds).toBe(3)
    expect(result.current.formattedTime).toBe('00:03')
  })

  test('formats time correctly beyond 60 seconds', () => {
    const { result } = renderHook(() => useTimer(true))

    act(() => { vi.advanceTimersByTime(65000) })

    expect(result.current.seconds).toBe(65)
    expect(result.current.formattedTime).toBe('01:05')
  })

  test('resetTimer sets seconds back to 0', () => {
    const { result } = renderHook(() => useTimer(true))

    act(() => { vi.advanceTimersByTime(5000) })
    expect(result.current.seconds).toBe(5)

    act(() => { result.current.resetTimer() })
    expect(result.current.seconds).toBe(0)
    expect(result.current.formattedTime).toBe('00:00')
  })

  test('stops ticking when isRunning changes to false', () => {
    const { result, rerender } = renderHook(({ running }) => useTimer(running), {
      initialProps: { running: true }
    })

    act(() => { vi.advanceTimersByTime(3000) })
    expect(result.current.seconds).toBe(3)

    rerender({ running: false })
    act(() => { vi.advanceTimersByTime(3000) })
    expect(result.current.seconds).toBe(3)
  })
})

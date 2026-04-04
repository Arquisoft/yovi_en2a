import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTimer } from '../components/gameWindow/rightPanel/Timer';

describe('useTimer hook', () => {

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('useTimer initializes with 0 seconds and 00:00', () => {
    const { result } = renderHook(() => useTimer(false));

    expect(result.current.seconds).toBe(0);
    expect(result.current.formattedTime).toBe('00:00');
  });

  test('useTimer increments seconds when isRunning is true', async () => {
    const { result } = renderHook(() => useTimer(true));

    await act(async () => {
      vi.advanceTimersByTime(3000);
    });

    expect(result.current.seconds).toBe(3);
    expect(result.current.formattedTime).toBe('00:03');
  });

  test('useTimer does not increment when stopped', async () => {
    const { result } = renderHook(() => useTimer(false));

    await act(async () => {
      vi.advanceTimersByTime(3000);
    });

    expect(result.current.seconds).toBe(0);
  });

  test('useTimer resets time correctly', async () => {
    const { result } = renderHook(() => useTimer(true));

    await act(async () => {
      vi.advanceTimersByTime(5000);
    });

    await act(async () => {
      result.current.resetTimer();
    });

    expect(result.current.seconds).toBe(0);
    expect(result.current.formattedTime).toBe('00:00');
  });

});
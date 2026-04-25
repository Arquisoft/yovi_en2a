// src/__tests__/useCountdown.test.ts

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCountdown } from '../components/online/useCountdown';

beforeEach(() => {
    vi.useFakeTimers();
});

afterEach(() => {
    vi.useRealTimers();
});

// ── Initial state ──────────────────────────────────────────────────────────

describe('useCountdown — initial state', () => {
    test('starts at the requested seconds value', () => {
        const { result } = renderHook(() =>
            useCountdown(10, false, 0)
        );
        expect(result.current.remaining).toBe(10);
        expect(result.current.secondsLeft).toBe(10);
        expect(result.current.isExpired).toBe(false);
    });

    test('secondsLeft uses Math.ceil of remaining', () => {
        const { result } = renderHook(() =>
            useCountdown(7.4, false, 0)
        );
        // ceil(7.4) = 8
        expect(result.current.secondsLeft).toBe(8);
    });
});

// ── Idle state ─────────────────────────────────────────────────────────────

describe('useCountdown — idle state', () => {
    test('does not tick when isRunning is false', () => {
        const { result } = renderHook(() =>
            useCountdown(10, false, 0)
        );
        const before = result.current.remaining;

        act(() => {
            vi.advanceTimersByTime(3_000);
        });

        expect(result.current.remaining).toBe(before);
    });
});

// ── Counting down ──────────────────────────────────────────────────────────

describe('useCountdown — counting down', () => {
    test('decreases over time when isRunning is true', () => {
        const { result } = renderHook(() =>
            useCountdown(10, true, 0)
        );

        act(() => {
            vi.advanceTimersByTime(3_000);
        });

        expect(result.current.remaining).toBeLessThan(10);
        expect(result.current.remaining).toBeGreaterThanOrEqual(6.5);
    });

    test('stops at 0 and does not go negative', () => {
        const { result } = renderHook(() =>
            useCountdown(2, true, 0)
        );

        act(() => {
            vi.advanceTimersByTime(5_000);
        });

        expect(result.current.remaining).toBe(0);
        expect(result.current.isExpired).toBe(true);
    });
});

// ── onExpire callback ──────────────────────────────────────────────────────

describe('useCountdown — onExpire', () => {
    test('fires onExpire exactly once when reaching 0', () => {
        const onExpire = vi.fn();
        renderHook(() => useCountdown(1, true, 0, onExpire));

        act(() => {
            vi.advanceTimersByTime(2_000);
        });

        expect(onExpire).toHaveBeenCalledTimes(1);

        // Continue advancing — should not fire again.
        act(() => {
            vi.advanceTimersByTime(2_000);
        });
        expect(onExpire).toHaveBeenCalledTimes(1);
    });

    test('does not fire onExpire when not running', () => {
        const onExpire = vi.fn();
        renderHook(() => useCountdown(1, false, 0, onExpire));

        act(() => {
            vi.advanceTimersByTime(2_000);
        });

        expect(onExpire).not.toHaveBeenCalled();
    });

    test('hook works without onExpire callback', () => {
        const { result } = renderHook(() =>
            useCountdown(1, true, 0)
        );

        // Should not throw when onExpire is undefined.
        act(() => {
            vi.advanceTimersByTime(2_000);
        });

        expect(result.current.isExpired).toBe(true);
    });
});

// ── resetKey ───────────────────────────────────────────────────────────────

describe('useCountdown — reset behaviour', () => {
    test('resets to the original seconds value when resetKey changes', () => {
        const { result, rerender } = renderHook(
            ({ key }: { key: number }) => useCountdown(10, true, key),
            { initialProps: { key: 0 } }
        );

        act(() => {
            vi.advanceTimersByTime(4_000);
        });
        expect(result.current.remaining).toBeLessThan(7);

        rerender({ key: 1 });

        // Should snap back to the full duration.
        expect(result.current.remaining).toBe(10);
    });

    test('re-arms onExpire after a reset', () => {
        const onExpire = vi.fn();
        const { rerender } = renderHook(
            ({ key }: { key: number }) =>
                useCountdown(1, true, key, onExpire),
            { initialProps: { key: 0 } }
        );

        // First expiry.
        act(() => {
            vi.advanceTimersByTime(2_000);
        });
        expect(onExpire).toHaveBeenCalledTimes(1);

        // Reset and let it expire again.
        rerender({ key: 1 });
        act(() => {
            vi.advanceTimersByTime(2_000);
        });

        expect(onExpire).toHaveBeenCalledTimes(2);
    });
});

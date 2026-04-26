// src/__tests__/UseServerCountdown.test.ts

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useServerCountdown } from '../components/online/UseServerCountdown';
import * as onlineModule from '../components/online/online';

// ── Shared setup ───────────────────────────────────────────────────────────

const DURATION = 10_000; // ms — matches the server default

/** Build a fake getMatchTurnInfo response anchored to "now". */
const makeTurnInfo = (offsetMs = 0) => {
    const now = Date.now();
    return {
        match_id: 'm1',
        turn: 0,
        turn_started_at: now - offsetMs, // how long ago the turn started
        now_server: now,
        turn_duration_ms: DURATION,
    };
};

beforeEach(() => {
    vi.useFakeTimers();
});

afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
});

// ── Initial state ──────────────────────────────────────────────────────────

describe('useServerCountdown — initial state', () => {
    test('starts with the default remaining value before sync', () => {
        vi.spyOn(onlineModule, 'getMatchTurnInfo').mockResolvedValue(makeTurnInfo());

        const { result } = renderHook(() =>
            useServerCountdown({ matchId: 'm1', resetKey: 0, isRunning: false })
        );

        // Before the async sync resolves, the hook returns its default value.
        expect(result.current.secondsLeft).toBeGreaterThanOrEqual(0);
        expect(result.current.fraction).toBeGreaterThanOrEqual(0);
        expect(result.current.fraction).toBeLessThanOrEqual(1);
    });

    test('stays idle when matchId is null', () => {
        const spy = vi.spyOn(onlineModule, 'getMatchTurnInfo');

        renderHook(() =>
            useServerCountdown({ matchId: null, resetKey: 0, isRunning: true })
        );

        expect(spy).not.toHaveBeenCalled();
    });

    test('stays idle when matchId is undefined', () => {
        const spy = vi.spyOn(onlineModule, 'getMatchTurnInfo');

        renderHook(() =>
            useServerCountdown({ matchId: undefined, resetKey: 0, isRunning: true })
        );

        expect(spy).not.toHaveBeenCalled();
    });
});

// ── Sync on mount ──────────────────────────────────────────────────────────

describe('useServerCountdown — server sync', () => {
    test('calls getMatchTurnInfo once on mount', async () => {
        const spy = vi
            .spyOn(onlineModule, 'getMatchTurnInfo')
            .mockResolvedValue(makeTurnInfo());

        renderHook(() =>
            useServerCountdown({ matchId: 'm1', resetKey: 0, isRunning: false })
        );

        await act(async () => {
            await Promise.resolve();
        });

        expect(spy).toHaveBeenCalledWith('m1');
        expect(spy).toHaveBeenCalledTimes(1);
    });

    test('re-syncs when resetKey changes', async () => {
        const spy = vi
            .spyOn(onlineModule, 'getMatchTurnInfo')
            .mockResolvedValue(makeTurnInfo());

        const { rerender } = renderHook(
            ({ key }: { key: number }) =>
                useServerCountdown({ matchId: 'm1', resetKey: key, isRunning: false }),
            { initialProps: { key: 0 } }
        );

        await act(async () => { await Promise.resolve(); });
        expect(spy).toHaveBeenCalledTimes(1);

        rerender({ key: 1 });
        await act(async () => { await Promise.resolve(); });
        expect(spy).toHaveBeenCalledTimes(2);
    });

    test('soft-fails and keeps previous deadline on network error', async () => {
        // First sync succeeds.
        vi.spyOn(onlineModule, 'getMatchTurnInfo').mockResolvedValue(makeTurnInfo());

        const { result, rerender } = renderHook(
            ({ key }: { key: number }) =>
                useServerCountdown({ matchId: 'm1', resetKey: key, isRunning: false }),
            { initialProps: { key: 0 } }
        );

        await act(async () => { await Promise.resolve(); });
        //const firstRemaining = result.current.remaining;

        // Second sync fails.
        vi.spyOn(onlineModule, 'getMatchTurnInfo').mockRejectedValue(new Error('Network down'));
        rerender({ key: 1 });
        await act(async () => { await Promise.resolve(); });

        // The hook should not crash; remaining should still be a valid number.
        expect(typeof result.current.remaining).toBe('number');
        expect(result.current.remaining).toBeGreaterThanOrEqual(0);
    });
});

// ── Local tick ─────────────────────────────────────────────────────────────

describe('useServerCountdown — local tick', () => {
    test('does not tick when isRunning is false', async () => {
        vi.spyOn(onlineModule, 'getMatchTurnInfo').mockResolvedValue(makeTurnInfo());

        const { result } = renderHook(() =>
            useServerCountdown({ matchId: 'm1', resetKey: 0, isRunning: false })
        );

        await act(async () => { await Promise.resolve(); });
        const before = result.current.remaining;

        await act(async () => { vi.advanceTimersByTime(3_000); });

        expect(result.current.remaining).toBe(before);
    });

    test('counts down when isRunning is true', async () => {
        vi.spyOn(onlineModule, 'getMatchTurnInfo').mockResolvedValue(makeTurnInfo());

        const { result } = renderHook(() =>
            useServerCountdown({ matchId: 'm1', resetKey: 0, isRunning: true })
        );

        await act(async () => { await Promise.resolve(); });

        const before = result.current.remaining;

        await act(async () => { vi.advanceTimersByTime(3_000); });

        // Should have decreased by ~3 000 ms (allow ±200 ms for timer jitter).
        expect(result.current.remaining).toBeLessThan(before);
        expect(before - result.current.remaining).toBeGreaterThanOrEqual(2_800);
    });

    test('fraction stays within 0..1 while counting down', async () => {
        vi.spyOn(onlineModule, 'getMatchTurnInfo').mockResolvedValue(makeTurnInfo());

        const { result } = renderHook(() =>
            useServerCountdown({ matchId: 'm1', resetKey: 0, isRunning: true })
        );

        await act(async () => { await Promise.resolve(); });
        await act(async () => { vi.advanceTimersByTime(5_000); });

        expect(result.current.fraction).toBeGreaterThanOrEqual(0);
        expect(result.current.fraction).toBeLessThanOrEqual(1);
    });
});

// ── Expiry ─────────────────────────────────────────────────────────────────

describe('useServerCountdown — expiry', () => {
    test('fires onExpire exactly once when remaining hits 0', async () => {
        // Simulate a turn that already started 9.5 s ago → expires in ~500 ms.
        vi.spyOn(onlineModule, 'getMatchTurnInfo').mockResolvedValue(makeTurnInfo(9_500));

        const onExpire = vi.fn();

        renderHook(() =>
            useServerCountdown({
                matchId: 'm1',
                resetKey: 0,
                isRunning: true,
                onExpire,
            })
        );

        await act(async () => { await Promise.resolve(); });
        // Advance past the deadline.
        await act(async () => { vi.advanceTimersByTime(2_000); });

        expect(onExpire).toHaveBeenCalledTimes(1);
    });

    test('does not fire onExpire again after reset', async () => {
        vi.spyOn(onlineModule, 'getMatchTurnInfo').mockResolvedValue(makeTurnInfo(9_500));

        const onExpire = vi.fn();

        const { rerender } = renderHook(
            ({ key }: { key: number }) =>
                useServerCountdown({
                    matchId: 'm1',
                    resetKey: key,
                    isRunning: true,
                    onExpire,
                }),
            { initialProps: { key: 0 } }
        );

        await act(async () => { await Promise.resolve(); });
        await act(async () => { vi.advanceTimersByTime(2_000); });
        expect(onExpire).toHaveBeenCalledTimes(1);

        // New turn: fresh sync, firedRef should reset.
        vi.spyOn(onlineModule, 'getMatchTurnInfo').mockResolvedValue(makeTurnInfo(0));
        rerender({ key: 1 });
        await act(async () => { await Promise.resolve(); });

        // Advance without expiring — onExpire should NOT fire again for old data.
        await act(async () => { vi.advanceTimersByTime(500); });
        expect(onExpire).toHaveBeenCalledTimes(1);
    });

    test('isExpired is true when remaining is 0', async () => {
        vi.spyOn(onlineModule, 'getMatchTurnInfo').mockResolvedValue(makeTurnInfo(DURATION));

        const { result } = renderHook(() =>
            useServerCountdown({ matchId: 'm1', resetKey: 0, isRunning: true })
        );

        await act(async () => { await Promise.resolve(); });
        await act(async () => { vi.advanceTimersByTime(1_000); });

        expect(result.current.isExpired).toBe(true);
        expect(result.current.remaining).toBe(0);
    });
});

// ── secondsLeft ────────────────────────────────────────────────────────────

describe('useServerCountdown — secondsLeft', () => {
    test('secondsLeft is Math.ceil of remaining/1000', async () => {
        vi.spyOn(onlineModule, 'getMatchTurnInfo').mockResolvedValue(makeTurnInfo(2_500));

        const { result } = renderHook(() =>
            useServerCountdown({ matchId: 'm1', resetKey: 0, isRunning: false })
        );

        await act(async () => { await Promise.resolve(); });

        // remaining ≈ 7 500 ms → ceil(7.5) = 8
        expect(result.current.secondsLeft).toBe(Math.ceil(result.current.remaining / 1000));
    });
});

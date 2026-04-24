// src/components/online/UseServerCountdown.ts
//
// A turn countdown anchored to the SERVER clock.
//
// Flow:
//   1. On mount / when resetKey changes, fetch /matchTurnInfo.
//   2. The server returns:
//        - turn_started_at (server ms)
//        - now_server      (server ms at response time)
//        - turn_duration_ms
//      We compute `offset = client_now_at_response - now_server`.
//      Then the deadline on the client clock is:
//        deadline = turn_started_at + turn_duration_ms + offset
//   3. A 100 ms local tick derives `remaining = deadline - Date.now()`.
//      This runs purely on the client between syncs; no per-frame fetches.
//   4. Whenever the caller bumps resetKey (a new turn), we resync.
//
// On network errors we keep whatever deadline we had. If nothing has been
// synced yet we display a "full" countdown so the UI never freezes.

import { useEffect, useRef, useState } from "react";
import { getMatchTurnInfo } from "./online";

interface Options {
    /** Match id to query. If falsy, the hook stays idle. */
    matchId: string | null | undefined;
    /**
     * Bump this whenever a turn ends (e.g. number of moves, or `turn_number`
     * observed locally) to force a fresh server sync.
     */
    resetKey: unknown;
    /** Whether the countdown should be counting. */
    isRunning: boolean;
    /**
     * Fired the first time `remaining` reaches 0 within a given sync window.
     * Resets on resetKey change.
     */
    onExpire?: () => void;
}

interface SyncedAnchor {
    /** Deadline on the client clock (ms since epoch). */
    deadline: number;
    /** Original duration, used for the progress bar. */
    durationMs: number;
}

export function useServerCountdown({
                                       matchId,
                                       resetKey,
                                       isRunning,
                                       onExpire,
                                   }: Options) {
    const [remaining, setRemaining] = useState<number>(10_000); // ms
    const [durationMs, setDurationMs] = useState<number>(10_000);

    const anchorRef = useRef<SyncedAnchor | null>(null);
    const firedRef = useRef(false);
    const onExpireRef = useRef(onExpire);
    onExpireRef.current = onExpire;

    // Sync with server when resetKey changes.
    useEffect(() => {
        if (!matchId) return;
        firedRef.current = false;
        anchorRef.current = null;
        let cancelled = false;

        (async () => {
            try {
                const clientBefore = Date.now();
                const info = await getMatchTurnInfo(matchId);
                if (cancelled) return;

                // Clock offset: how far off the client clock is vs the server.
                // We use the client time *after* the response to avoid counting
                // upload latency; half of the round-trip is a decent proxy for
                // the remote timestamp age.
                const clientAfter = Date.now();
                const roundTrip = clientAfter - clientBefore;
                const serverNowOnClientClock = info.now_server + roundTrip / 2;
                const offset = clientAfter - serverNowOnClientClock;

                // Translate server timestamp → client clock domain.
                const deadlineOnClient =
                    info.turn_started_at + info.turn_duration_ms + offset;

                anchorRef.current = {
                    deadline: deadlineOnClient,
                    durationMs: info.turn_duration_ms,
                };
                setDurationMs(info.turn_duration_ms);
                // Immediate refresh so the UI doesn't wait 100 ms.
                setRemaining(Math.max(0, deadlineOnClient - Date.now()));
            } catch {
                // Soft-fail: keep the previous anchor if we had one.
            }
        })();

        return () => { cancelled = true; };
    }, [matchId, resetKey]);

    // Local tick.
    useEffect(() => {
        if (!isRunning) return;

        const tick = () => {
            const anchor = anchorRef.current;
            if (!anchor) return;
            const left = Math.max(0, anchor.deadline - Date.now());
            setRemaining(left);
            if (left <= 0 && !firedRef.current) {
                firedRef.current = true;
                onExpireRef.current?.();
            }
        };

        tick();
        const id = setInterval(tick, 100);
        return () => clearInterval(id);
    }, [isRunning, resetKey]);

    return {
        /** ms left, float. */
        remaining,
        /** ms, integer display value. */
        secondsLeft: Math.ceil(remaining / 1000),
        /** 0..1, useful for progress bars. */
        fraction: durationMs > 0 ? remaining / durationMs : 0,
        isExpired: remaining <= 0,
    };
}
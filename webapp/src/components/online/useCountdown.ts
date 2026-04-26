// src/components/online/useCountdown.ts
import { useEffect, useRef, useState } from "react";

/**
 * Counts down from `seconds` to 0 while `isRunning` is true.
 *
 * The countdown is anchored to a start timestamp, so if the tab is backgrounded
 * and the setInterval tick is throttled, the displayed value still catches up
 * when the tab becomes active again.
 *
 * `resetKey` lets the caller force a fresh countdown: whenever its value changes
 * (e.g. turn number flips), the timer restarts from `seconds`.
 *
 * `onExpire` fires exactly once per countdown instance (until it restarts).
 */
export function useCountdown(
    seconds: number,
    isRunning: boolean,
    resetKey: unknown,
    onExpire?: () => void
) {
    const [remaining, setRemaining] = useState(seconds);
    const startRef = useRef<number>(Date.now());
    const firedRef = useRef(false);
    const onExpireRef = useRef(onExpire);
    onExpireRef.current = onExpire;

    // Reset countdown when resetKey changes.
    useEffect(() => {
        startRef.current = Date.now();
        firedRef.current = false;
        setRemaining(seconds);
    }, [resetKey, seconds]);

    useEffect(() => {
        if (!isRunning) return;

        const tick = () => {
            const elapsed = (Date.now() - startRef.current) / 1000;
            const left = Math.max(0, seconds - elapsed);
            setRemaining(left);

            if (left <= 0 && !firedRef.current) {
                firedRef.current = true;
                onExpireRef.current?.();
            }
        };

        tick();
        const id = setInterval(tick, 100);
        return () => clearInterval(id);
    }, [isRunning, seconds, resetKey]);

    return {
        remaining,                                  // float seconds, for smooth bars
        secondsLeft: Math.ceil(remaining),          // int, for display
        isExpired: remaining <= 0,
    };
}

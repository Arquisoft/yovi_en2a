// src/utils/playerId.ts
//
// Resolves the current player's ID for online matches.
//
// If a real auth system exists it should feed into this module; for now
// we persist a random UUID in localStorage so the same browser keeps its
// identity across reloads. Guest matches also use this ID.

const STORAGE_KEY = "gamey.playerId";

function randomUuid(): string {
    // crypto.randomUUID is available in all modern browsers; fall back
    // to a manual v4 generator just in case.
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
        return crypto.randomUUID();
    }
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

export function getPlayerId(): string {
    try {
        const existing = localStorage.getItem(STORAGE_KEY);
        if (existing) return existing;
        const fresh = randomUuid();
        localStorage.setItem(STORAGE_KEY, fresh);
        return fresh;
    } catch {
        // Private mode / disabled storage: fall back to a per-session id.
        return randomUuid();
    }
}

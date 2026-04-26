// src/components/online/playerId.ts
//
// Identifier + display helpers for online play.
//
// - Logged-in users → their username (unique per the Auth service).
// - Guests → a stable per-browser alias "UnregisteredGuest#NNNN" stored in
//   localStorage so refreshing keeps the same id.
// - For rendering, guest ids are collapsed to seat-based nicknames
//   (UnregisteredCapibara for P1, UnregisteredGiraffe for P2).

const STORAGE_KEY = "gamey.guestAlias";

const GUEST_FIRST_PLAYER_NAME = "UnregisteredCapibara";
const GUEST_SECOND_PLAYER_NAME = "UnregisteredGiraffe";

function randomSuffix(): string {
    // Using crypto.getRandomValues instead of Math.random to satisfy
    // SonarCloud's security hotspot (the value isn't security-sensitive,
    // but using a CSPRNG keeps the analyser happy).
    const arr = new Uint32Array(1);
    globalThis.crypto.getRandomValues(arr);
    return String(1000 + (arr[0] % 9000));
}

/** Seat-based nickname for anonymous opponents. */
export function guestDisplayName(seat: 0 | 1): string {
    return seat === 0 ? GUEST_FIRST_PLAYER_NAME : GUEST_SECOND_PLAYER_NAME;
}

function loadOrCreateGuestAlias(): string {
    try {
        const existing = globalThis.localStorage.getItem(STORAGE_KEY);
        if (existing) return existing;

        const fresh = `UnregisteredGuest#${randomSuffix()}`;
        globalThis.localStorage.setItem(STORAGE_KEY, fresh);
        return fresh;
    } catch {
        return `UnregisteredGuest#${randomSuffix()}`;
    }
}

/**
 * Id to send to the backend as player1id / player2id.
 * Prefer the logged-in username; otherwise return the stored guest alias.
 */
export function getPlayerId(loggedUsername?: string | null): string {
    if (loggedUsername && loggedUsername.trim().length > 0) {
        return loggedUsername;
    }
    return loadOrCreateGuestAlias();
}

/**
 * Render-side transform: turn an opponent's id into something UI-friendly.
 * Collapses any "UnregisteredGuest#..." into the seat-based nickname.
 */
export function displayNameFor(playerId: string | undefined | null, seat: 0 | 1): string {
    if (!playerId) return guestDisplayName(seat);
    if (playerId.startsWith("UnregisteredGuest#")) return guestDisplayName(seat);
    return playerId;
}
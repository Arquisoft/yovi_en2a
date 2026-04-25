// src/__tests__/playerId.test.ts

import { describe, test, expect, beforeEach } from 'vitest';
import { getPlayerId, displayNameFor, guestDisplayName } from '../components/online/playerId';

// ── guestDisplayName ───────────────────────────────────────────────────────

describe('guestDisplayName', () => {
    test('returns Capibara name for seat 0', () => {
        expect(guestDisplayName(0)).toBe('UnregisteredCapibara');
    });

    test('returns Giraffe name for seat 1', () => {
        expect(guestDisplayName(1)).toBe('UnregisteredGiraffe');
    });
});

// ── getPlayerId ────────────────────────────────────────────────────────────

describe('getPlayerId', () => {
    beforeEach(() => {
        // Reset localStorage between tests.
        localStorage.clear();
    });

    test('returns the logged-in username when provided', () => {
        expect(getPlayerId('Alice')).toBe('Alice');
    });
});
// ── displayNameFor ─────────────────────────────────────────────────────────

describe('displayNameFor', () => {
    test('returns the raw id for registered users', () => {
        expect(displayNameFor('Alice', 0)).toBe('Alice');
        expect(displayNameFor('bob@example.com', 1)).toBe('bob@example.com');
    });

    test('collapses UnregisteredGuest#NNNN to the seat-based nickname', () => {
        expect(displayNameFor('UnregisteredGuest#1234', 0)).toBe('UnregisteredCapibara');
        expect(displayNameFor('UnregisteredGuest#9999', 1)).toBe('UnregisteredGiraffe');
    });

    test('returns seat-based nickname when id is null', () => {
        expect(displayNameFor(null, 0)).toBe('UnregisteredCapibara');
        expect(displayNameFor(null, 1)).toBe('UnregisteredGiraffe');
    });

    test('returns seat-based nickname when id is undefined', () => {
        expect(displayNameFor(undefined, 0)).toBe('UnregisteredCapibara');
        expect(displayNameFor(undefined, 1)).toBe('UnregisteredGiraffe');
    });

    test('returns seat-based nickname when id is an empty string', () => {
        expect(displayNameFor('', 0)).toBe('UnregisteredCapibara');
    });
});
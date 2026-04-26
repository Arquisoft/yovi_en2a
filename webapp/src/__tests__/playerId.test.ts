// src/__tests__/playerId.test.ts
//
// These tests deliberately avoid vi.spyOn(Storage.prototype, ...) because
// that bypasses the actual function execution that v8 coverage measures.
// Instead we override the localStorage prototype directly with assignments
// that the coverage tracker can see.

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import {
    getPlayerId,
    displayNameFor,
    guestDisplayName,
} from '../components/online/playerId';

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
        globalThis.localStorage.clear();
    });

    test('returns the logged-in username when provided', () => {
        expect(getPlayerId('Alice')).toBe('Alice');
    });

    test('returns a stored guest alias when no username is given', () => {
        const id1 = getPlayerId();
        expect(id1).toMatch(/^UnregisteredGuest#\d{4}$/);

        // Second call returns the same alias (stable across calls).
        const id2 = getPlayerId();
        expect(id2).toBe(id1);
    });

    test('persists the alias in localStorage on first call', () => {
        getPlayerId();
        const stored = globalThis.localStorage.getItem('gamey.guestAlias');
        expect(stored).toMatch(/^UnregisteredGuest#\d{4}$/);
    });

    test('reuses the alias already in localStorage', () => {
        globalThis.localStorage.setItem('gamey.guestAlias', 'UnregisteredGuest#1234');
        expect(getPlayerId()).toBe('UnregisteredGuest#1234');
        // Second call: same value still.
        expect(getPlayerId(null)).toBe('UnregisteredGuest#1234');
    });

    test('returns a new guest alias when localStorage has no existing one', () => {
        // explicit null arg path
        const id = getPlayerId(null);
        expect(id).toMatch(/^UnregisteredGuest#\d{4}$/);
    });

    test('ignores empty username and falls back to guest alias', () => {
        const id = getPlayerId('');
        expect(id).toMatch(/^UnregisteredGuest#\d{4}$/);
    });

    test('ignores whitespace-only username and falls back to guest alias', () => {
        const id = getPlayerId('   ');
        expect(id).toMatch(/^UnregisteredGuest#\d{4}$/);
    });

    test('returns alias when logged user is undefined', () => {
        const id = getPlayerId(undefined);
        expect(id).toMatch(/^UnregisteredGuest#\d{4}$/);
    });
});

// ── getPlayerId — broken localStorage path ─────────────────────────────────
//
// Forcing the catch path. We swap the localStorage object for one that
// throws on every method, then restore it afterwards.

describe('getPlayerId — broken localStorage', () => {
    let originalStorage: Storage;

    beforeEach(() => {
        originalStorage = globalThis.localStorage;
        Object.defineProperty(globalThis, 'localStorage', {
            configurable: true,
            value: {
                getItem: () => {
                    throw new Error('QuotaExceededError');
                },
                setItem: () => {
                    throw new Error('QuotaExceededError');
                },
                removeItem: () => {},
                clear: () => {},
                key: () => null,
                length: 0,
            },
        });
    });

    afterEach(() => {
        Object.defineProperty(globalThis, 'localStorage', {
            configurable: true,
            value: originalStorage,
        });
    });

    test('returns a fresh alias when localStorage throws on read', () => {
        const id = getPlayerId();
        expect(id).toMatch(/^UnregisteredGuest#\d{4}$/);
    });

    test('returns a fresh alias when called with null username and storage is broken', () => {
        const id = getPlayerId(null);
        expect(id).toMatch(/^UnregisteredGuest#\d{4}$/);
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
        expect(displayNameFor('', 1)).toBe('UnregisteredGiraffe');
    });

    test('preserves usernames that contain "Unregistered" but are not guest ids', () => {
        // E.g. someone whose username is "UnregisteredUser123" (no #) should
        // not be collapsed.
        expect(displayNameFor('UnregisteredUser123', 0)).toBe('UnregisteredUser123');
    });
});
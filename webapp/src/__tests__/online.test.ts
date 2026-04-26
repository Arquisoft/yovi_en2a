// src/__tests__/online.test.ts
//
// Tests for the typed fetch wrappers in online.ts.
// Mirrors the style of GameApi.test.ts: globalThis.fetch is replaced with a
// vi.fn() for each case; no real network traffic occurs.

import { describe, test, expect, vi, beforeEach } from 'vitest';
import {
    createOnlineMatch,
    joinOnlineMatch,
    executeMoveOnline,
    getMatchStatus,
    getMatchTurnInfo,
    cancelMatch,
    claimForfeit,
    saveMatchToDb,
    updateScore,
    extractOccupiedFromYen,
    isNoMatchesAvailable,
    waitUntilMatchReady,
    waitForTurn,
    ApiError,
    type Yen,
} from '../components/online/online';

// Helper: build a minimal fetch mock that returns JSON.
const mockFetchOk = (body: unknown) =>
    vi.fn().mockResolvedValue({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => body,
        text: async () => JSON.stringify(body),
    } as unknown);

const mockFetchError = (status: number, text = 'Error') =>
    vi.fn().mockResolvedValue({
        ok: false,
        status,
        statusText: text,
        headers: { get: () => 'text/plain' },
        text: async () => text,
    } as unknown);

beforeEach(() => {
    vi.restoreAllMocks();
});

// ── createOnlineMatch ──────────────────────────────────────────────────────

describe('createOnlineMatch', () => {
    test('returns parsed response on success', async () => {
        globalThis.fetch = mockFetchOk({ match_id: 'm1', turn_number: 0 });

        const result = await createOnlineMatch({
            player1id: 'p1',
            size: 8,
            match_id: 'm1',
            match_password: 'secret',
        });

        expect(result).toEqual({ match_id: 'm1', turn_number: 0 });
        expect(fetch).toHaveBeenCalledWith(
            expect.stringContaining('/game/createMatch'),
            expect.objectContaining({ method: 'POST' })
        );
    });

    test('throws ApiError on non-OK response', async () => {
        globalThis.fetch = mockFetchError(422, 'Unprocessable');

        await expect(
            createOnlineMatch({ player1id: 'p1', size: 8, match_id: 'm1', match_password: 'x' })
        ).rejects.toBeInstanceOf(ApiError);
    });

    test('throws on network failure', async () => {
        globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network down'));

        await expect(
            createOnlineMatch({ player1id: 'p1', size: 8, match_id: 'm1', match_password: 'x' })
        ).rejects.toThrow();
    });
});

// ── joinOnlineMatch ────────────────────────────────────────────────────────

describe('joinOnlineMatch', () => {
    test('returns parsed response on success', async () => {
        globalThis.fetch = mockFetchOk({ match_id: 'm1', turn_number: 1 });

        const result = await joinOnlineMatch({
            player2id: 'p2',
            match_id: 'm1',
            match_password: 'secret',
        });

        expect(result).toEqual({ match_id: 'm1', turn_number: 1 });
    });

    test('throws ApiError when match not found', async () => {
        globalThis.fetch = mockFetchError(404, 'Not Found');

        await expect(
            joinOnlineMatch({ player2id: 'p2', match_id: 'bad', match_password: 'x' })
        ).rejects.toBeInstanceOf(ApiError);
    });
});

// ── executeMoveOnline ──────────────────────────────────────────────────────

describe('executeMoveOnline', () => {
    test('returns game_over flag on success', async () => {
        globalThis.fetch = mockFetchOk({ match_id: 'm1', game_over: false });

        const result = await executeMoveOnline({
            match_id: 'm1',
            coord_x: 1,
            coord_y: 0,
            coord_z: 0,
            player_id: 0,
        });

        expect(result.game_over).toBe(false);
    });

    test('returns game_over: true when game ends', async () => {
        globalThis.fetch = mockFetchOk({ match_id: 'm1', game_over: true });

        const result = await executeMoveOnline({
            match_id: 'm1',
            coord_x: 2,
            coord_y: 1,
            coord_z: 0,
            player_id: 1,
        });

        expect(result.game_over).toBe(true);
    });

    test('throws ApiError on server error', async () => {
        globalThis.fetch = mockFetchError(500, 'Internal Server Error');

        await expect(
            executeMoveOnline({ match_id: 'm1', coord_x: 0, coord_y: 0, coord_z: 0, player_id: 0 })
        ).rejects.toBeInstanceOf(ApiError);
    });
});

// ── getMatchStatus ─────────────────────────────────────────────────────────

describe('getMatchStatus', () => {
    test('returns match status on success', async () => {
        const payload = {
            match_id: 'm1',
            status: 'active',
            player1id: 'p1',
            player2id: 'p2',
            ready: true,
            winner: null,
            end_reason: null,
        };
        globalThis.fetch = mockFetchOk(payload);

        const result = await getMatchStatus('m1');

        expect(result.status).toBe('active');
        expect(result.player1id).toBe('p1');
        expect(result.ready).toBe(true);
    });

    test('returns finished status with winner', async () => {
        globalThis.fetch = mockFetchOk({
            match_id: 'm1',
            status: 'finished',
            player1id: 'p1',
            player2id: 'p2',
            ready: true,
            winner: 'p1',
            end_reason: 'normal',
        });

        const result = await getMatchStatus('m1');

        expect(result.status).toBe('finished');
        expect(result.winner).toBe('p1');
    });

    test('throws ApiError on 404', async () => {
        globalThis.fetch = mockFetchError(404, 'Not Found');

        await expect(getMatchStatus('missing')).rejects.toBeInstanceOf(ApiError);
    });
});

// ── getMatchTurnInfo ───────────────────────────────────────────────────────

describe('getMatchTurnInfo', () => {
    test('returns turn info on success', async () => {
        const now = Date.now();
        globalThis.fetch = mockFetchOk({
            match_id: 'm1',
            turn: 0,
            turn_started_at: now,
            now_server: now,
            turn_duration_ms: 10_000,
        });

        const result = await getMatchTurnInfo('m1');

        expect(result.turn_duration_ms).toBe(10_000);
        expect(result.now_server).toBe(now);
    });

    test('throws ApiError on server error', async () => {
        globalThis.fetch = mockFetchError(500);

        await expect(getMatchTurnInfo('m1')).rejects.toBeInstanceOf(ApiError);
    });
});

// ── cancelMatch ────────────────────────────────────────────────────────────

describe('cancelMatch', () => {
    test('resolves without throwing on success', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            headers: { get: () => 'application/json' },
            json: async () => ({ cancelled: true }),
            text: async () => '{"cancelled":true}',
        } as unknown);

        await expect(cancelMatch('m1')).resolves.toBeUndefined();
    });

    test('swallows 409 (match already active)', async () => {
        globalThis.fetch = mockFetchError(409, 'Conflict');

        // Should NOT throw — 409 is intentionally swallowed.
        await expect(cancelMatch('m1')).resolves.toBeUndefined();
    });

    test('swallows non-409 errors with a console warning', async () => {
        globalThis.fetch = mockFetchError(500, 'Internal Server Error');
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        await expect(cancelMatch('m1')).resolves.toBeUndefined();
        expect(warnSpy).toHaveBeenCalled();
    });
});

// ── claimForfeit ───────────────────────────────────────────────────────────

describe('claimForfeit', () => {
    test('returns forfeit result on success', async () => {
        globalThis.fetch = mockFetchOk({
            match_id: 'm1',
            accepted: true,
            winner: 'p1',
            end_reason: 'forfeit',
        });

        const result = await claimForfeit('m1', 'p1');

        expect(result.accepted).toBe(true);
        expect(result.end_reason).toBe('forfeit');
    });

    test('throws ApiError when claim is rejected', async () => {
        globalThis.fetch = mockFetchError(409, 'Already ended');

        await expect(claimForfeit('m1', 'p1')).rejects.toBeInstanceOf(ApiError);
    });
});

// ── saveMatchToDb ──────────────────────────────────────────────────────────

describe('saveMatchToDb', () => {
    test('posts to /game/saveMatch and returns message', async () => {
        globalThis.fetch = mockFetchOk({ message: 'saved' });

        const result = await saveMatchToDb({
            match_id: 'm1',
            player1id: 'p1@test.com',
            player2id: 'p2@test.com',
            result: 'Win',
            time: 120,
            moves: [{ x: 1, y: 0, z: 0 }],
        });

        expect(result.message).toBe('saved');
        expect(fetch).toHaveBeenCalledWith(
            expect.stringContaining('/game/saveMatch'),
            expect.objectContaining({ method: 'POST' })
        );
    });

    test('throws ApiError on server error', async () => {
        globalThis.fetch = mockFetchError(500);

        await expect(
            saveMatchToDb({
                match_id: 'm1',
                player1id: 'a',
                player2id: 'b',
                result: 'Win',
                time: 0,
                moves: [],
            })
        ).rejects.toBeInstanceOf(ApiError);
    });
});

// ── updateScore ────────────────────────────────────────────────────────────

describe('updateScore', () => {
    test('posts score update and returns message', async () => {
        globalThis.fetch = mockFetchOk({ message: 'updated' });

        const result = await updateScore({
            playerid: 'p1@test.com',
            username: 'Alice',
            is_win: true,
            time: 95,
        });

        expect(result.message).toBe('updated');
    });

    test('throws ApiError on 400', async () => {
        globalThis.fetch = mockFetchError(400, 'Bad Request');

        await expect(
            updateScore({ playerid: 'x', username: 'y', is_win: false, time: 0 })
        ).rejects.toBeInstanceOf(ApiError);
    });
});

// ── extractOccupiedFromYen ─────────────────────────────────────────────────

describe('extractOccupiedFromYen', () => {
    test('returns empty array for empty layout', () => {
        //const yen: Yen = { size: 3, layout: '../..' };
        // All dots → no occupied cells.
        const result = extractOccupiedFromYen({ size: 3, layout: '.../../.', turn: 0 });
        expect(result).toHaveLength(0);
    });

    test('parses a single occupied cell in top-left', () => {
        // 3-cell board (size=3): first row has one cell
        // layout row 0 = "B", row 1 = "..", row 2 = "..."
        const yen: Yen = { size: 3, layout: 'B/../...' };
        const result = extractOccupiedFromYen(yen);
        expect(result).toHaveLength(1);
        expect(result[0].symbol).toBe('B');
        // row=0,col=0 → x = size-1-row = 2, y = 0, z = row-col = 0
        expect(result[0]).toMatchObject({ x: 2, y: 0, z: 0 });
    });

    test('parses mixed B and R cells', () => {
        // size=2: row 0 = "B", row 1 = "BR"
        const yen: Yen = { size: 2, layout: 'B/BR' };

        const result = extractOccupiedFromYen(yen);

        expect(result).toHaveLength(3);
        const symbols = result
            .map((c) => c.symbol)
            .sort((a, b) => a.localeCompare(b));

        expect(symbols).toEqual(['B', 'B', 'R']);
    });

    test('returns empty array when layout or size is missing', () => {
        expect(extractOccupiedFromYen({})).toHaveLength(0);
        expect(extractOccupiedFromYen({ size: 3 })).toHaveLength(0);
        expect(extractOccupiedFromYen({ layout: 'B/.' })).toHaveLength(0);
    });

    test('skips dot cells and only records non-dot characters', () => {
        const yen: Yen = { size: 3, layout: './R./...' };
        const result = extractOccupiedFromYen(yen);
        expect(result).toHaveLength(1);
        expect(result[0].symbol).toBe('R');
    });
});

// ── ApiError ───────────────────────────────────────────────────────────────

describe('ApiError', () => {
    test('stores status and message', () => {
        const err = new ApiError(404, 'Not Found');
        expect(err.status).toBe(404);
        expect(err.message).toBe('Not Found');
        expect(err.name).toBe('ApiError');
        expect(err).toBeInstanceOf(Error);
    });
});

// ── isNoMatchesAvailable ───────────────────────────────────────────────────

describe('isNoMatchesAvailable', () => {
    test('returns false for a plain Error', () => {
        expect(isNoMatchesAvailable(new Error('no match found'))).toBe(false);
    });

    test('returns false for non-error values', () => {
        expect(isNoMatchesAvailable('no match')).toBe(false);
        expect(isNoMatchesAvailable(null)).toBe(false);
        expect(isNoMatchesAvailable(undefined)).toBe(false);
    });

    test('returns false for ApiError without "no match" in message', () => {
        expect(isNoMatchesAvailable(new ApiError(404, 'Not Found'))).toBe(false);
        expect(isNoMatchesAvailable(new ApiError(500, 'Server Error'))).toBe(false);
    });

    test('returns true for ApiError with "no match" in message (case-insensitive)', () => {
        expect(isNoMatchesAvailable(new ApiError(404, 'no match found'))).toBe(true);
        expect(isNoMatchesAvailable(new ApiError(404, 'No Match Available'))).toBe(true);
    });

    test('returns true for ApiError with "nomatch" (no space between words)', () => {
        expect(isNoMatchesAvailable(new ApiError(404, 'nomatch'))).toBe(true);
    });
});

// ── waitUntilMatchReady ────────────────────────────────────────────────────

describe('waitUntilMatchReady', () => {
    const readyStatus = {
        match_id: 'm1', status: 'active', player1id: 'p1', player2id: 'p2',
        ready: true, winner: null, end_reason: null,
    };
    const notReadyStatus = { ...readyStatus, ready: false };

    test('resolves immediately when the first poll returns ready', async () => {
        globalThis.fetch = mockFetchOk(readyStatus);

        const result = await waitUntilMatchReady('m1', 1);

        expect(result.ready).toBe(true);
        expect(result.match_id).toBe('m1');
    });

    test('retries until status becomes ready', async () => {
        let calls = 0;
        globalThis.fetch = vi.fn().mockImplementation(async () => {
            calls++;
            const body = calls >= 3 ? readyStatus : notReadyStatus;
            return {
                ok: true,
                headers: { get: () => 'application/json' },
                json: async () => body,
                text: async () => JSON.stringify(body),
            } as unknown;
        });

        const result = await waitUntilMatchReady('m1', 1);

        expect(result.ready).toBe(true);
        expect(calls).toBeGreaterThanOrEqual(3);
    });

    test('throws AbortError immediately when signal is already aborted', async () => {
        const ctrl = new AbortController();
        ctrl.abort();

        await expect(waitUntilMatchReady('m1', 1, ctrl.signal)).rejects.toMatchObject({
            name: 'AbortError',
        });
    });

    test('re-throws AbortError that surfaces from within getMatchStatus', async () => {
        const abortErr = Object.assign(new Error('aborted'), { name: 'AbortError' });
        globalThis.fetch = vi.fn().mockRejectedValue(abortErr);

        const ctrl = new AbortController();

        await expect(waitUntilMatchReady('m1', 1, ctrl.signal)).rejects.toMatchObject({
            name: 'AbortError',
        });
    });

    test('swallows non-abort fetch errors and keeps polling until ready', async () => {
        let calls = 0;
        globalThis.fetch = vi.fn().mockImplementation(async () => {
            calls++;
            if (calls < 3) throw new Error('Network down');
            return {
                ok: true,
                headers: { get: () => 'application/json' },
                json: async () => readyStatus,
                text: async () => JSON.stringify(readyStatus),
            } as unknown;
        });

        const result = await waitUntilMatchReady('m1', 1);

        expect(result.ready).toBe(true);
        expect(calls).toBeGreaterThanOrEqual(3);
    });
});

// ── waitForTurn ────────────────────────────────────────────────────────────

describe('waitForTurn', () => {
    const boardPayload = {
        match_id: 'm1',
        board_status: { size: 8, turn: 1, layout: '', players: [] },
    };

    test('returns board state immediately on a 200 response', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => boardPayload,
        } as unknown);

        const result = await waitForTurn({ match_id: 'm1', turn_number: 0 });

        expect(result.match_id).toBe('m1');
        expect(result.board_status.turn).toBe(1);
    });

    test('retries immediately on 408 and returns next successful response', async () => {
        let calls = 0;
        globalThis.fetch = vi.fn().mockImplementation(async () => {
            calls++;
            if (calls < 3) {
                return { ok: false, status: 408, statusText: 'Timeout' } as unknown;
            }
            return { ok: true, status: 200, json: async () => boardPayload } as unknown;
        });

        const result = await waitForTurn({ match_id: 'm1', turn_number: 0 });

        expect(result.board_status.turn).toBe(1);
        expect(calls).toBeGreaterThanOrEqual(3);
    });

    test('throws AbortError when signal is already aborted before first fetch', async () => {
        const ctrl = new AbortController();
        ctrl.abort();

        await expect(
            waitForTurn({ match_id: 'm1', turn_number: 0 }, ctrl.signal)
        ).rejects.toMatchObject({ name: 'AbortError' });
    });

    test('throws AbortError when fetch itself rejects with AbortError', async () => {
        const abortErr = Object.assign(new Error('aborted'), { name: 'AbortError' });
        globalThis.fetch = vi.fn().mockRejectedValue(abortErr);

        const ctrl = new AbortController();
        await expect(
            waitForTurn({ match_id: 'm1', turn_number: 0 }, ctrl.signal)
        ).rejects.toMatchObject({ name: 'AbortError' });
    });
});

// ── postJson content-type guard ────────────────────────────────────────────

describe('postJson — content-type guard', () => {
    test('throws ApiError when server returns 200 with non-JSON content-type', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            headers: { get: () => 'text/html' },
            text: async () => '<html>Error page</html>',
        } as unknown);

        await expect(
            createOnlineMatch({ player1id: 'p1', size: 8, match_id: 'm1', match_password: 'x' })
        ).rejects.toBeInstanceOf(ApiError);
    });

    test('ApiError from a non-JSON response carries the HTTP status code', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            headers: { get: () => 'text/plain' },
            text: async () => 'plain text body',
        } as unknown);

        await expect(
            createOnlineMatch({ player1id: 'p1', size: 8, match_id: 'm1', match_password: 'x' })
        ).rejects.toMatchObject({ status: 200 });
    });
});

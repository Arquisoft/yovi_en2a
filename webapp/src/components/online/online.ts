// src/components/online/online.ts
//
// Typed wrapper around the Rust online endpoints. All calls go through the
// Express gateway's /game/* proxy.

const API_URL: string = (import.meta as any).env?.VITE_API_URL ?? "";
const GAME = "/game";

// ---------- Types (mirror the Rust structs in data.rs) ----------

export interface CreateOnlineMatchRequest {
    player1id: string;
    size: number;
    match_id: string;
    match_password: string;
}

export interface CreateOnlineMatchResponse {
    match_id: string;
    turn_number: number;
}

export interface JoinOnlineMatchRequest {
    player2id: string;
    match_id: string;
    match_password: string;
}

export interface JoinOnlineMatchResponse {
    match_id: string;
    turn_number: number;
}

export interface UpdateOnlineMatchRequest {
    match_id: string;
    turn_number: number;
}

export type Yen = {
    size?: number;
    turn?: number;
    players?: string[];
    layout?: string;
    variant?: string | null;
    [k: string]: unknown;
};

export interface UpdateOnlineMatchResponse {
    match_id: string;
    board_status: Yen;
}

export interface ExecuteMoveRequest {
    match_id: string;
    coord_x: number;
    coord_y: number;
    coord_z: number;
    player_id: number;
}

export interface ExecuteMoveResponse {
    match_id: string;
    game_over: boolean;
}

export interface MatchStatusResponse {
    match_id: string;
    status: "waiting" | "active" | "finished" | string;
    player1id: string;
    player2id: string;
    ready: boolean;
    winner?: string | null;
    end_reason?: string | null;
}

export interface MatchTurnInfo {
    match_id: string;
    turn: number;
    turn_started_at: number;
    now_server: number;
    turn_duration_ms: number;
}

export interface ClaimForfeitResponse {
    match_id: string;
    accepted: boolean;
    winner: string;
    end_reason: string;
}

export interface Coordinates {
    x: number;
    y: number;
    z: number;
}

export interface SaveMatchRequest {
    match_id: string;
    player1id: string;
    player2id: string;
    result: string;
    time: number;
    moves: Coordinates[];
}

export interface UpdateScoreRequest {
    playerid: string;
    username: string;
    is_win: boolean;
    time: number;
}

// ---------- Internal helpers ----------

class ApiError extends Error {
    // 1. Explicitly declare the property
    status: number;

    constructor(status: number, message: string) {
        super(message);
        // 2. Manually assign the value
        this.status = status;
        this.name = "ApiError";
    }
}

async function postJson<TReq, TRes>(path: string, body: TReq): Promise<TRes> {
    const res = await fetch(`${API_URL}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new ApiError(res.status, text || res.statusText);
    }

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
        const text = await res.text().catch(() => "");
        throw new ApiError(
            res.status,
            `Expected JSON from ${path}, got ${contentType || "unknown"}: ${text.slice(0, 120)}`
        );
    }

    return (await res.json()) as TRes;
}

async function getJson<TRes>(path: string): Promise<TRes> {
    const res = await fetch(`${API_URL}${path}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
    });
    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new ApiError(res.status, text || res.statusText);
    }
    return (await res.json()) as TRes;
}

async function deleteJson<TRes>(path: string): Promise<TRes> {
    const res = await fetch(`${API_URL}${path}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
    });
    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new ApiError(res.status, text || res.statusText);
    }
    return (await res.json()) as TRes;
}

// ---------- Public API ----------

export function createOnlineMatch(
    req: CreateOnlineMatchRequest
): Promise<CreateOnlineMatchResponse> {
    return postJson(`${GAME}/createMatch`, req);
}

export function joinOnlineMatch(
    req: JoinOnlineMatchRequest
): Promise<JoinOnlineMatchResponse> {
    return postJson(`${GAME}/joinMatch`, req);
}

export function executeMoveOnline(
    req: ExecuteMoveRequest
): Promise<ExecuteMoveResponse> {
    return postJson(`${GAME}/executeMoveOnline`, req);
}

export function getMatchStatus(matchId: string): Promise<MatchStatusResponse> {
    return getJson(`${GAME}/matchStatus/${encodeURIComponent(matchId)}`);
}

export function getMatchTurnInfo(matchId: string): Promise<MatchTurnInfo> {
    return getJson(`${GAME}/matchTurnInfo/${encodeURIComponent(matchId)}`);
}

/** Cancel a waiting match. Idempotent; swallows 409 (already active). */
export async function cancelMatch(matchId: string): Promise<void> {
    try {
        await deleteJson(`${GAME}/cancelMatch/${encodeURIComponent(matchId)}`);
    } catch (err) {
        if (!(err instanceof ApiError) || err.status !== 409) {
            console.warn("[online] cancelMatch failed:", err);
        }
    }
}

/** Claim the win because the opponent hasn't responded past the threshold. */
export function claimForfeit(
    matchId: string,
    claimantId: string
): Promise<ClaimForfeitResponse> {
    return postJson(`${GAME}/claimForfeit/${encodeURIComponent(matchId)}`, {
        claimant_id: claimantId,
    });
}

export function saveMatchToDb(req: SaveMatchRequest): Promise<{ message: string }> {
    return postJson(`${GAME}/saveMatch`, req);
}

export function updateScore(req: UpdateScoreRequest): Promise<{ message: string }> {
    return postJson(`${GAME}/updateScore`, req);
}

export function isNoMatchesAvailable(err: unknown): boolean {
    if (!(err instanceof ApiError)) return false;
    return /no\s*match/i.test(err.message);
}

/** Poll /matchStatus until both players are in. */
export async function waitUntilMatchReady(
    matchId: string,
    intervalMs = 1000,
    signal?: AbortSignal
): Promise<MatchStatusResponse> {
    while (true) {
        if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
        try {
            const status = await getMatchStatus(matchId);
            if (status.ready) return status;
        } catch (err) {
            if ((err as any)?.name === "AbortError") throw err;
        }
        await new Promise((r) => setTimeout(r, intervalMs));
    }
}

/** Long-poll until it is our turn. Backend returns 408 on timeout; we retry. */
export async function waitForTurn(
    req: UpdateOnlineMatchRequest,
    signal?: AbortSignal
): Promise<UpdateOnlineMatchResponse> {
    while (true) {
        if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

        try {
            const res = await fetch(`${API_URL}${GAME}/requestOnlineGameUpdate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(req),
                signal,
            });

            if (res.ok) return (await res.json()) as UpdateOnlineMatchResponse;
            if (res.status === 408) continue;

            const text = await res.text().catch(() => "");
            throw new ApiError(res.status, text || res.statusText);
        } catch (err) {
            if ((err as any)?.name === "AbortError") throw err;
            await new Promise((r) => setTimeout(r, 1000));
        }
    }
}

/**
 * Parse YEN.layout into XYZ coordinates of occupied cells.
 * YEN.layout is rows separated by '/', cells are 'B', 'R', or '.'.
 */
export function extractOccupiedFromYen(
    yen: Yen
): Array<{ x: number; y: number; z: number; symbol: string }> {
    if (typeof yen.layout !== "string" || typeof yen.size !== "number") return [];
    const size = yen.size;
    const rows = yen.layout.split("/");
    const out: Array<{ x: number; y: number; z: number; symbol: string }> = [];

    for (let row = 0; row < rows.length; row++) {
        const r = rows[row];
        for (let col = 0; col < r.length; col++) {
            const ch = r[col];
            if (ch === ".") continue;
            const x = size - 1 - row;
            const y = col;
            const z = row - col;
            out.push({ x, y, z, symbol: ch });
        }
    }
    return out;
}

export { ApiError };
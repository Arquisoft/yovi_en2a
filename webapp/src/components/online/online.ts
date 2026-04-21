// src/components/online/online.ts
//
// Typed wrapper around the Rust online endpoints. All calls are routed
// through the Express gateway's /game/* proxy (see users-service.js).

const API_URL: string = (import.meta as any).env?.VITE_API_URL ?? "";

/** All game endpoints live under this gateway prefix. */
const GAME = "/game";

// ---------- Types (mirror the Rust structs in data.rs) ----------

export interface CreateOnlineMatchRequest {
    player1id: string;
    size: number;
    match_id: string;          // "" → server picks a random/public match
    match_password: string;
}

export interface CreateOnlineMatchResponse {
    match_id: string;
    turn_number: number;       // creator = 0
}

export interface JoinOnlineMatchRequest {
    player2id: string;
    match_id: string;          // "" → join any public waiting match
    match_password: string;
}

export interface JoinOnlineMatchResponse {
    match_id: string;
    turn_number: number;       // joiner = 1
}

export interface UpdateOnlineMatchRequest {
    match_id: string;
    turn_number: number;
}

/**
 * YEN board status. The exact internal shape is owned by the Rust `data::YEN`
 * struct — we keep it loose here and read it defensively when applying moves.
 */
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
}

export interface ExecuteMoveResponse {
    match_id: string;
    game_over: boolean;
}

export interface MatchStatusResponse {
    match_id: string;
    status: "waiting" | "active" | string;
    player1id: string;
    player2id: string;
    /** True when both players are assigned. */
    ready: boolean;
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

export function executeMove(
    req: ExecuteMoveRequest
): Promise<ExecuteMoveResponse> {
    return postJson(`${GAME}/executeMove`, req);
}

export function getMatchStatus(matchId: string): Promise<MatchStatusResponse> {
    return getJson(`${GAME}/matchStatus/${encodeURIComponent(matchId)}`);
}

/**
 * True when the error from the backend means "there are no public matches
 * waiting right now". We detect it by the Rust MatchError Display text.
 */
export function isNoMatchesAvailable(err: unknown): boolean {
    if (!(err instanceof ApiError)) return false;
    return /no\s*match/i.test(err.message);
}

/**
 * Poll /matchStatus until the match is ready (both players joined).
 * Polls every `intervalMs` ms. Resolves with the final MatchStatusResponse.
 */
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
            // Transient network/404 right after creation — keep trying briefly.
            if ((err as any)?.name === "AbortError") throw err;
        }
        await new Promise((r) => setTimeout(r, intervalMs));
    }
}

/**
 * Long-poll the server until it is our turn.
 * Backend blocks ~20 s per call and returns 408 on timeout; we silently retry.
 */
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
 * Parse the YEN `layout` string into an ordered list of XYZ coordinates.
 *
 * YEN.layout is a compact board representation: rows separated by '/', cells
 * are either a player symbol (e.g. 'B', 'R') or '.' for empty. A triangular
 * board of size N has row r containing r+1 cells (r = 0..N-1).
 *
 * Because the layout doesn't encode move order, we return cells in row-major
 * order (row 0, row 1, …). The caller merges this with its local history to
 * discover only the NEW occupied cells — which is fine for append-only play.
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
            // Mirror the TS toXYZ used in GameWindow.
            const x = size - 1 - row;
            const y = col;
            const z = row - col;
            out.push({ x, y, z, symbol: ch });
        }
    }
    return out;
}

export { ApiError };

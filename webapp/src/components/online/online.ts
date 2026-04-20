// src/api/online.ts
//
// Thin typed wrapper around the Rust /createMatch, /joinMatch and
// /requestOnlineGameUpdate endpoints defined in api_rest.rs.
//
// The API base URL can be overridden at build-time with VITE_API_URL.
// Defaults to http://localhost:5000 (the port GameManager binds to).

const API_URL: string =
    (import.meta as any).env?.VITE_API_URL ?? "http://localhost:5000";

// ---------- Types (mirror the Rust structs in data.rs) ----------

export interface CreateOnlineMatchRequest {
    player1id: string;
    size: number;
    /** Empty string → server picks a random/public match. */
    match_id: string;
    /** Empty string → no password. */
    match_password: string;
}

export interface CreateOnlineMatchResponse {
    match_id: string;
    /** Player 1 always starts on turn 0. */
    turn_number: number;
}

export interface JoinOnlineMatchRequest {
    player2id: string;
    /** Empty string → join any public waiting match. */
    match_id: string;
    match_password: string;
}

export interface JoinOnlineMatchResponse {
    match_id: string;
    /** Joiner always plays on turn 1. */
    turn_number: number;
}

export interface UpdateOnlineMatchRequest {
    match_id: string;
    turn_number: number;
}

export interface UpdateOnlineMatchResponse {
    match_id: string;
    // We don't model YEN on the frontend yet; the game screen will.
    board_status: unknown;
}

// ---------- Internal helpers ----------

class ApiError extends Error {
    constructor(public status: number, message: string) {
        super(message);
        this.name = "ApiError";
    }
}

async function postJson<TReq, TRes>(path: string, body: TReq): Promise<TRes> {
    const res = await fetch(`${API_URL}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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
    return postJson("/createMatch", req);
}

export function joinOnlineMatch(
    req: JoinOnlineMatchRequest
): Promise<JoinOnlineMatchResponse> {
    return postJson("/joinMatch", req);
}

/**
 * Long-poll the server until it is our turn.
 *
 * The backend already blocks for up to ~20 s before returning 408.
 * On 408 we simply retry, so the caller can stay in the WaitingRoom
 * indefinitely (until they cancel).
 */
export async function waitForTurn(
    req: UpdateOnlineMatchRequest,
    signal?: AbortSignal
): Promise<UpdateOnlineMatchResponse> {
    while (true) {
        if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

        try {
            const res = await fetch(`${API_URL}/requestOnlineGameUpdate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(req),
                signal,
            });

            if (res.ok) {
                return (await res.json()) as UpdateOnlineMatchResponse;
            }

            // 408 = backend timeout waiting for opponent, just retry.
            if (res.status === 408) continue;

            const text = await res.text().catch(() => "");
            throw new ApiError(res.status, text || res.statusText);
        } catch (err) {
            if ((err as any)?.name === "AbortError") throw err;
            // Network hiccup: back off briefly then retry.
            await new Promise((r) => setTimeout(r, 1000));
        }
    }
}

export { ApiError };

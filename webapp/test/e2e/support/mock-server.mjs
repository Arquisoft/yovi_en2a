// test/e2e/support/mock-server.mjs
//
// In-memory mock of the Rust /game/* API. Lets the E2E tests run without
// docker-compose. Each scenario gets its own MockServer instance, but all
// pages routed through `attach()` share the same state — so two browsers can
// "see" the same match.
//
// Coverage:
//   POST /game/createMatch          → registers a match, returns its id
//   POST /game/joinMatch            → marks the match as ready
//   GET  /game/matchStatus/:id      → current status, players, end reason
//   GET  /game/matchTurnInfo/:id    → server clock + turn anchor
//   POST /game/requestOnlineGameUpdate → long-poll opponent move
//   POST /game/executeMoveOnline    → record a move, optionally end the game
//   POST /game/claimForfeit/:id     → not used by the no-backend suite
//   POST /game/saveMatch            → no-op
//   POST /game/updateScore          → no-op
//
// Notes:
//   - Long polls (`requestOnlineGameUpdate`) are answered immediately when
//     the requested turn matches, otherwise we return 408 so the client
//     retries. That keeps the mock simple and fast.
//   - The board layout is intentionally minimal — we only track which cells
//     are occupied by which player, encoded in the YEN `layout` string.

let _instance = null

class MockServer {
    constructor() {
        // matchId → match record
        this.matches = new Map()
        this._counter = 0
    }

    /** Register a fresh match. */
    _newMatch({ player1id, size, match_id, match_password }) {
        const id = match_id && match_id.length > 0
            ? match_id
            : `mock-match-${++this._counter}`
        const now = Date.now()
        const record = {
            match_id: id,
            password: match_password ?? '',
            size,
            player1id,
            player2id: null,
            status: 'waiting',
            ready: false,
            turn_started_at: now + 3_000, // 3 s grace
            now_server: now,
            turn_duration_ms: 10_000,
            turn: 0,
            winner: null,
            end_reason: null,
            // layout is a list of rows; each row is a string of "B"/"R"/"."
            layout: this._emptyLayout(size),
        }
        this.matches.set(id, record)
        return record
    }

    _emptyLayout(size) {
        // Triangular board: row r has r+1 cells (matches the rest of the app).
        const rows = []
        for (let r = 0; r < size; r++) rows.push('.'.repeat(r + 1))
        return rows.join('/')
    }

    /** Find any waiting match without a player2 (used by public matchmaking). */
    _findOpenMatch() {
        for (const m of this.matches.values()) {
            if (m.status === 'waiting' && !m.player2id) return m
        }
        return null
    }

    // ── HTTP handler dispatch ──────────────────────────────────────────────

    async handle(route) {
        const req = route.request()
        const url = new URL(req.url())
        const pathname = url.pathname.replace(/^.*\/game/, '/game') // strip host
        const method = req.method()

        // Helpers --------------------------------------------------
        const json = (status, body) =>
            route.fulfill({
                status,
                contentType: 'application/json',
                body: JSON.stringify(body),
            })
        const text = (status, body) =>
            route.fulfill({ status, contentType: 'text/plain', body })

        const body = req.postDataJSON ? safeJson(req) : null

        // Routes ---------------------------------------------------
        if (method === 'POST' && pathname === '/game/createMatch') {
            const m = this._newMatch(body)
            return json(200, { match_id: m.match_id, turn_number: 0 })
        }

        if (method === 'POST' && pathname === '/game/joinMatch') {
            // Look up by id if provided, else find any open match.
            let m = body?.match_id
                ? this.matches.get(body.match_id)
                : this._findOpenMatch()
            if (!m) {
                // Public-mode signal: "no matches available" — frontend will
                // then create one. The exact phrasing matches isNoMatchesAvailable().
                return text(404, 'no match available')
            }
            if (m.password && m.password !== (body?.match_password ?? '')) {
                return text(403, 'wrong password')
            }
            if (m.player2id) {
                return text(409, 'already full')
            }
            m.player2id = body.player2id
            m.status = 'active'
            m.ready = true
            // Reset the turn anchor now that both are in.
            const now = Date.now()
            m.turn_started_at = now + 3_000 // grace start over
            m.now_server = now
            return json(200, { match_id: m.match_id, turn_number: 1 })
        }

        if (method === 'GET' && pathname.startsWith('/game/matchStatus/')) {
            const id = decodeURIComponent(pathname.split('/').pop())
            const m = this.matches.get(id)
            if (!m) return text(404, 'unknown match')
            return json(200, {
                match_id: m.match_id,
                status: m.status,
                player1id: m.player1id,
                player2id: m.player2id ?? '',
                ready: m.ready,
                winner: m.winner,
                end_reason: m.end_reason,
            })
        }

        if (method === 'GET' && pathname.startsWith('/game/matchTurnInfo/')) {
            const id = decodeURIComponent(pathname.split('/').pop())
            const m = this.matches.get(id)
            if (!m) return text(404, 'unknown match')
            return json(200, {
                match_id: m.match_id,
                turn: m.turn,
                turn_started_at: m.turn_started_at,
                now_server: Date.now(),
                turn_duration_ms: m.turn_duration_ms,
            })
        }

        if (method === 'POST' && pathname === '/game/requestOnlineGameUpdate') {
            const m = this.matches.get(body?.match_id)
            if (!m) return text(404, 'unknown match')
            // The client passes turn_number = the seat it's waiting on.
            // For our purposes we always return the current YEN — the client
            // dedups based on occupied count.
            if (body?.turn_number === m.turn) {
                return json(200, {
                    match_id: m.match_id,
                    board_status: {
                        size: m.size,
                        turn: m.turn,
                        layout: m.layout,
                        players: [m.player1id, m.player2id ?? ''],
                    },
                })
            }
            // Otherwise long-poll timeout: client retries automatically.
            return text(408, 'no update yet')
        }

        if (method === 'POST' && pathname === '/game/executeMoveOnline') {
            const m = this.matches.get(body?.match_id)
            if (!m) return text(404, 'unknown match')
            // Basic move bookkeeping — flip the turn. We don't actually
            // mutate the layout because the win-condition logic isn't
            // exercised by the suite: scenarios stop at the lobby/board view.
            m.turn = m.turn === 0 ? 1 : 0
            return json(200, { match_id: m.match_id, game_over: false })
        }

        if (method === 'POST' && pathname === '/game/saveMatch') {
            return json(200, { message: 'saved' })
        }

        if (method === 'POST' && pathname === '/game/updateScore') {
            return json(200, { message: 'updated' })
        }

        if (method === 'POST' && pathname.startsWith('/game/claimForfeit/')) {
            const id = decodeURIComponent(pathname.split('/').pop())
            const m = this.matches.get(id)
            if (!m) return text(404, 'unknown match')
            m.status = 'finished'
            m.winner = body?.claimant_id ?? m.player1id
            m.end_reason = 'forfeit'
            return json(200, {
                match_id: m.match_id,
                accepted: true,
                winner: m.winner,
                end_reason: 'forfeit',
            })
        }

        // Any other /game/* path: 404 so failures are explicit.
        return text(404, `mock: unhandled ${method} ${pathname}`)
    }

    /** Wire this mock to a Playwright page. */
    async attach(page) {
        await page.route('**/game/**', (route) => this.handle(route))
    }
}

function safeJson(req) {
    try {
        return req.postDataJSON()
    } catch {
        return null
    }
}

/**
 * Get (or create) the singleton mock server. All pages from the same scenario
 * route through one instance so they observe the same in-memory state.
 */
export function getMockServer() {
    if (!_instance) _instance = new MockServer()
    return _instance
}

/** Reset the mock between scenarios. */
export function resetMockServer() {
    _instance = new MockServer()
}

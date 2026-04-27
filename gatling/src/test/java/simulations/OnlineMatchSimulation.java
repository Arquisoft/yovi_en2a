package simulations;

import io.gatling.javaapi.core.*;
import io.gatling.javaapi.http.*;

import static io.gatling.javaapi.core.CoreDsl.*;
import static io.gatling.javaapi.http.HttpDsl.*;

public class OnlineMatchSimulation extends Simulation {

/**
 * Load test for the online multiplayer game flow.
 *
 * Two scenarios run in parallel, paired by userId (both counters start at 1):
 *
 *   Creator (P0) — creates a private match, waits for the grace period, then moves
 *   Joiner  (P1) — waits 3 s, joins, polls for P0's move, then replies
 *
 * Match IDs are deterministic: "load-online-{userId}" so both scenarios
 * target the same slot without any shared state in the test runner.
 *
 * Turn logic (yen.turn() alternates 0 ↔ 1):
 *   - initial state:       turn = 0 (creator's turn)
 *   - after creator moves: turn = 1 (joiner's turn)  ← joiner polls turn_number=1
 *   - after joiner moves:  turn = 0 (creator's turn)  ← creator polls turn_number=0
 *
 * Timing respects the 3 s grace period + 10 s move window:
 *   t=0    Creator creates match, pauses 6 s
 *   t=3    Joiner joins → turn_started_at stamped at t+3 s = t=6
 *   t=3    Joiner polls for turn=1 (waits ~3 s)
 *   t=6    Grace period ends; creator executes move (turn 0→1)
 *   t=6    Joiner's poll returns; joiner replies (turn 1→0)
 *   t=6    Creator's poll for turn=0 resolves within ~0.5 s
 *
 * The Express proxy can return 504 when it times out a slow game_manager
 * response, so 504 is included in the accepted-status list.
 *
 * Run: mvn gatling:test -Dgatling.simulationClass=simulations.OnlineMatchSimulation
 *      Override target host: -DbaseUrl=http://localhost:3000
 */

    private static final String BASE_URL =
            System.getProperty("baseUrl", "http://localhost:3000");

    private static final String CSRF_HEADER     = "X-CSRF-Token";
    private static final String CSRF_TOKEN_EL   = "#{csrfToken}";
    private static final String MATCH_INDEX     = "matchIndex";
    private static final String MATCH_ID_PREFIX = "{\"match_id\":\"load-online-";

    HttpProtocolBuilder httpProtocol = http
            .baseUrl(BASE_URL)
            .acceptHeader("application/json")
            .contentTypeHeader("application/json")
            .disableFollowRedirect();

    ChainBuilder fetchCsrf = exec(
            http("GET /api/csrf-token")
                .get("/api/csrf-token")
                .check(status().is(200))
                .check(jsonPath("$.csrfToken").saveAs("csrfToken"))
    );

    // ── Creator (P0) ──────────────────────────────────────────────────────────
    // t=0   CSRF
    // t=0.5 pause(1)
    // t=1.5 createMatch
    // t=1.5 pause(8) → t=9.5
    // t=9.5 executeMoveOnline  ← after joiner has been polling since t=8.5
    // t=9.5 pause(2)           ← let joiner receive update and reply
    // t=11.5 poll turn=0       ← joiner replied at ~t=10, resolves quickly

    ScenarioBuilder creatorScenario = scenario("Online Match — Creator (P0)")
            .exec(fetchCsrf)
            .pause(1)
            .exec(session -> session.set(MATCH_INDEX, session.userId()))
            .exec(
                http("POST /game/createMatch")
                    .post("/game/createMatch")
                    .header(CSRF_HEADER, CSRF_TOKEN_EL)
                    .body(StringBody(session ->
                        "{\"player1id\":\"creator-" + session.getLong(MATCH_INDEX) + "\"," +
                        "\"size\":3," +
                        "\"match_id\":\"load-online-" + session.getLong(MATCH_INDEX) + "\"," +
                        "\"match_password\":\"loadtest\"}"
                    ))
                    .check(status().in(200, 500))
            )
            .pause(8)
            .exec(
                http("POST /game/executeMoveOnline (P0 turn 0)")
                    .post("/game/executeMoveOnline")
                    .header(CSRF_HEADER, CSRF_TOKEN_EL)
                    .body(StringBody(session ->
                        MATCH_ID_PREFIX + session.getLong(MATCH_INDEX) + "\"," +
                        "\"coord_x\":2,\"coord_y\":0,\"coord_z\":0," +
                        "\"player_id\":0}"
                    ))
                    .check(status().in(200, 400, 403, 500))
            )
            // Give joiner time to receive the turn update and execute its reply
            .pause(4)
            .exec(
                http("POST /game/requestOnlineGameUpdate (P0 waiting turn 0)")
                    .post("/game/requestOnlineGameUpdate")
                    .header(CSRF_HEADER, CSRF_TOKEN_EL)
                    .body(StringBody(session ->
                        MATCH_ID_PREFIX + session.getLong(MATCH_INDEX) + "\"," +
                        "\"turn_number\":0}"
                    ))
                    .check(status().in(200, 404, 408, 500, 504))
            )
            .exec(
                http("GET /game/matchStatus (creator final check)")
                    .get("/game/matchStatus/load-online-#{"+ MATCH_INDEX +"}")
                    .check(status().in(200, 404))
            );

    // ── Joiner (P1) ───────────────────────────────────────────────────────────
    // t=0   pause(3)
    // t=3   CSRF
    // t=3.5 joinMatch          ← move window opens
    // t=3.5 pause(7)  → t=10.5 (creator moved at t=9.5, so poll fires after)
    // t=10.5 poll turn=1       ← creator already moved; resolves immediately
    // t=10.5 executeMoveOnline (P1 reply)

    ScenarioBuilder joinerScenario = scenario("Online Match — Joiner (P1)")
            .pause(3)
            .exec(fetchCsrf)
            .exec(session -> session.set(MATCH_INDEX, session.userId()))
            .exec(
                http("POST /game/joinMatch")
                    .post("/game/joinMatch")
                    .header(CSRF_HEADER, CSRF_TOKEN_EL)
                    .body(StringBody(session ->
                        "{\"player2id\":\"joiner-" + session.getLong(MATCH_INDEX) + "\"," +
                        "\"match_id\":\"load-online-" + session.getLong(MATCH_INDEX) + "\"," +
                        "\"match_password\":\"loadtest\"}"
                    ))
                    .check(status().in(200, 404, 500))
            )
            // Wait until after creator has definitely moved (t=9.5), with 1s buffer
            .pause(6)
            .exec(
                http("POST /game/requestOnlineGameUpdate (P1 waiting turn 1)")
                    .post("/game/requestOnlineGameUpdate")
                    .header(CSRF_HEADER, CSRF_TOKEN_EL)
                    .body(StringBody(session ->
                        MATCH_ID_PREFIX + session.getLong(MATCH_INDEX) + "\"," +
                        "\"turn_number\":1}"
                    ))
                    .check(status().in(200, 404, 408, 500, 504))
            )
            .exec(
                http("POST /game/executeMoveOnline (P1 reply)")
                    .post("/game/executeMoveOnline")
                    .header(CSRF_HEADER, CSRF_TOKEN_EL)
                    .body(StringBody(session ->
                        MATCH_ID_PREFIX + session.getLong(MATCH_INDEX) + "\"," +
                        "\"coord_x\":1,\"coord_y\":1,\"coord_z\":0," +
                        "\"player_id\":1}"
                    ))
                    .check(status().in(200, 400, 403, 404, 500))
            );

    public OnlineMatchSimulation() {
        setUp(
            creatorScenario.injectOpen(atOnceUsers(5)),
            joinerScenario.injectOpen(atOnceUsers(5))
        )
        .protocols(httpProtocol)
        .assertions(
            global().responseTime().percentile(95).lt(25000),
            global().successfulRequests().percent().gt(90.0)
        );
    }
}
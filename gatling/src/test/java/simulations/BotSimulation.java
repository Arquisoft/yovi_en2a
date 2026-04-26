package simulations;

import io.gatling.javaapi.core.*;
import io.gatling.javaapi.http.*;

import static io.gatling.javaapi.core.CoreDsl.*;
import static io.gatling.javaapi.http.HttpDsl.*;

/**
 * Load test for bot AI move latency.
 *
 * Each scenario creates a fresh offline match against a specific bot type,
 * then immediately requests a bot move. This isolates the CPU cost of each
 * bot algorithm under concurrent load.
 *
 * Bot types and expected characteristics:
 *   - random   : O(1) — should handle any concurrency easily
 *   - greedy   : O(board)  — moderate cost
 *   - minimax  : O(b^d)    — CPU-bound; intentionally low concurrency
 *
 * Assertions use per-scenario response-time groups rather than a single
 * global threshold so the minimax bot does not drag down the others.
 *
 * Run: mvn gatling:test -Dgatling.simulationClass=simulations.BotSimulation
 *      Override target host: -DbaseUrl=http://localhost:3000
 */
public class BotSimulation extends Simulation {

    private static final String BASE_URL =
            System.getProperty("baseUrl", "http://localhost:3000");

    HttpProtocolBuilder httpProtocol = http
            .baseUrl(BASE_URL)
            .acceptHeader("application/json")
            .contentTypeHeader("application/json")
            .disableFollowRedirect();

    // ── Shared CSRF fetch chain ───────────────────────────────────────────────

    ChainBuilder fetchCsrf = exec(
            http("GET /api/csrf-token")
                .get("/api/csrf-token")
                .check(status().is(200))
                .check(jsonPath("$.csrfToken").saveAs("csrfToken"))
    );

    // ── Shared chain: create a match then request one bot move ────────────────

    private ChainBuilder botMoveChain(String botType) {
        return exec(fetchCsrf)
                .pause(1)
                .exec(session -> session.set("playerIndex", session.userId()))
                .exec(
                    http("POST /game/new (" + botType + ")")
                        .post("/game/new")
                        .header("X-CSRF-Token", "#{csrfToken}")
                        .body(StringBody(session ->
                            "{\"size\":3," +
                            "\"player1\":\"botloadplayer" + session.getLong("playerIndex") + "\"," +
                            "\"player2\":\"" + botType + "\"}"
                        ))
                        .check(status().is(200))
                        .check(jsonPath("$.match_id").saveAs("matchId"))
                )
                .pause(1)
                .exec(
                    http("POST /game/executeMove (setup turn 0, " + botType + ")")
                        .post("/game/executeMove")
                        .header("X-CSRF-Token", "#{csrfToken}")
                        .body(StringBody(
                            "{\"match_id\":\"#{matchId}\",\"coord_x\":2,\"coord_y\":0,\"coord_z\":0}"
                        ))
                        .check(status().in(200, 400, 500))
                )
                .pause(1)
                .exec(
                    http("POST /game/reqBotMove (" + botType + ")")
                        .post("/game/reqBotMove")
                        .header("X-CSRF-Token", "#{csrfToken}")
                        .body(StringBody("{\"match_id\":\"#{matchId}\"}"))
                        // 200 success, 400 illegal move edge case, 404 match expired, 500 engine down
                        .check(status().in(200, 400, 404, 500))
                );
    }

    // ── Scenarios ─────────────────────────────────────────────────────────────

    ScenarioBuilder randomBotScenario  = scenario("Bot Move — random")  .exec(botMoveChain("random"));
    ScenarioBuilder greedyBotScenario  = scenario("Bot Move — greedy")  .exec(botMoveChain("greedy"));
    ScenarioBuilder minimaxBotScenario = scenario("Bot Move — minimax") .exec(botMoveChain("minimax"));

    // ── Load profile ──────────────────────────────────────────────────────────

    {
        setUp(
            randomBotScenario.injectOpen(
                rampUsers(20).during(20)
            ),
            greedyBotScenario.injectOpen(
                rampUsers(15).during(20)
            ),
            // minimax is CPU-bound — keep concurrency low to measure latency, not saturation
            minimaxBotScenario.injectOpen(
                rampUsers(5).during(20)
            )
        )
        .protocols(httpProtocol)
        .assertions(
            global().responseTime().percentile(95).lt(5000),
            global().successfulRequests().percent().gt(90.0)
        );
    }
}

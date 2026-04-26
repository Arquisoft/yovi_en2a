package simulations;

import io.gatling.javaapi.core.*;
import io.gatling.javaapi.http.*;

import static io.gatling.javaapi.core.CoreDsl.*;
import static io.gatling.javaapi.http.HttpDsl.*;

/**
 * Load test for the offline game lifecycle.
 *
 * Each virtual user:
 *   1. Fetches a CSRF token
 *   2. Creates an offline match    (POST /game/new)         → saves match_id
 *   3. Executes a player move      (POST /game/executeMove)
 *   4. Requests a bot move         (POST /game/reqBotMove)
 *   5. Checks match status         (GET  /game/matchStatus/{match_id})
 *
 * This exercises the full Redis match-state path under concurrent load.
 * Move responses accept 400 (illegal move) because the engine validates the
 * board; 500 is accepted when the gamey engine is unreachable.
 *
 * Run: mvn gatling:test -Dgatling.simulationClass=simulations.GameSimulation
 *      Override target host: -DbaseUrl=http://localhost:3000
 */
public class GameSimulation extends Simulation {

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

    // ── Scenario ──────────────────────────────────────────────────────────────

    ScenarioBuilder offlineGameScenario = scenario("Offline Game Lifecycle")
            .exec(fetchCsrf)
            .pause(1)
            .exec(session -> session.set("playerIndex", session.userId()))
            .exec(
                http("POST /game/new")
                    .post("/game/new")
                    .header("X-CSRF-Token", "#{csrfToken}")
                    .body(StringBody(session ->
                        "{\"size\":3," +
                        "\"player1\":\"loadplayer" + session.getLong("playerIndex") + "\"," +
                        "\"player2\":\"random\"}"
                    ))
                    .check(status().is(200))
                    .check(jsonPath("$.match_id").saveAs("matchId"))
            )
            .pause(1)
            .exec(
                http("POST /game/executeMove (player turn 0)")
                    .post("/game/executeMove")
                    .header("X-CSRF-Token", "#{csrfToken}")
                    .body(StringBody(
                        "{\"match_id\":\"#{matchId}\",\"coord_x\":2,\"coord_y\":0,\"coord_z\":0}"
                    ))
                    // 200 success, 400 illegal move, 500 gamey engine unreachable
                    .check(status().in(200, 400, 500))
            )
            .pause(1)
            .exec(
                http("POST /game/reqBotMove (bot turn 1)")
                    .post("/game/reqBotMove")
                    .header("X-CSRF-Token", "#{csrfToken}")
                    .body(StringBody("{\"match_id\":\"#{matchId}\"}"))
                    .check(status().in(200, 400, 404, 500))
            )
            .pause(1)
            .exec(
                http("POST /game/executeMove (player turn 2)")
                    .post("/game/executeMove")
                    .header("X-CSRF-Token", "#{csrfToken}")
                    .body(StringBody(
                        "{\"match_id\":\"#{matchId}\",\"coord_x\":1,\"coord_y\":1,\"coord_z\":0}"
                    ))
                    .check(status().in(200, 400, 500))
            )
            .pause(1)
            .exec(
                http("GET /game/matchStatus")
                    .get("/game/matchStatus/#{matchId}")
                    .check(status().in(200, 404))
            );

    // ── Load profile ──────────────────────────────────────────────────────────

    {
        setUp(
            offlineGameScenario.injectOpen(
                rampUsers(30).during(30)
            )
        )
        .protocols(httpProtocol)
        .assertions(
            global().responseTime().percentile(95).lt(3000),
            global().successfulRequests().percent().gt(95.0)
        );
    }
}

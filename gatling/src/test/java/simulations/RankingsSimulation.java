package simulations;

import io.gatling.javaapi.core.*;
import io.gatling.javaapi.http.*;

import static io.gatling.javaapi.core.CoreDsl.*;
import static io.gatling.javaapi.http.HttpDsl.*;

/**
 * Load test for the rankings endpoints.
 *
 * Scenarios:
 *   - Global leaderboard  (GET  /game/bestTimes)      — read-only, hits Firebase
 *   - Per-user history    (POST /game/localRankings)  — hits Firebase with a user_id
 *
 * Firebase latency is the bottleneck here. A spike of concurrent requests
 * reveals whether the service degrades gracefully under sudden traffic.
 *
 * Run: mvn gatling:test -Dgatling.simulationClass=simulations.RankingsSimulation
 *      Override target host: -DbaseUrl=http://localhost:3000
 */
public class RankingsSimulation extends Simulation {

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

    // ── Scenarios ─────────────────────────────────────────────────────────────

    ScenarioBuilder bestTimesScenario = scenario("Global Leaderboard (bestTimes)")
            .exec(
                http("GET /game/bestTimes")
                    .get("/game/bestTimes")
                    // 200 success, 500 if Firebase is unreachable
                    .check(status().in(200, 500))
            );

    ScenarioBuilder localRankingsScenario = scenario("Per-User Rankings (localRankings)")
            .exec(fetchCsrf)
            .pause(1)
            .exec(session -> session.set("userIndex", session.userId()))
            .exec(
                http("POST /game/localRankings")
                    .post("/game/localRankings")
                    .header("X-CSRF-Token", "#{csrfToken}")
                    .body(StringBody(session ->
                        "{\"user_id\":\"loadtest-user-" + session.getLong("userIndex") + "\"}"
                    ))
                    // 200 with empty array when user has no matches; 500 if Firebase is down
                    .check(status().in(200, 500))
            );

    // ── Load profile ──────────────────────────────────────────────────────────

    {
        setUp(
            bestTimesScenario.injectOpen(
                atOnceUsers(50),
                rampUsers(150).during(30)
            ),
            localRankingsScenario.injectOpen(
                atOnceUsers(20),
                rampUsers(80).during(30)
            )
        )
        .protocols(httpProtocol)
        .assertions(
            global().responseTime().percentile(95).lt(3000),
            global().successfulRequests().percent().gt(95.0)
        );
    }
}

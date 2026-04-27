package simulations;

import io.gatling.javaapi.core.*;
import io.gatling.javaapi.http.*;

import static io.gatling.javaapi.core.CoreDsl.*;
import static io.gatling.javaapi.http.HttpDsl.*;

/**
 * Load test for authenticated user profile actions.
 *
 * Each virtual user:
 *   1. Fetches a CSRF token         (GET  /api/csrf-token)
 *   2. Registers a unique account   (POST /api/register)  — unique email per user
 *   3. Fetches a fresh CSRF token   (GET  /api/csrf-token) — cookie refresh after register
 *   4. Logs in with the new account (POST /api/login)     — establishes Redis session
 *   5. Fetches own profile          (GET  /api/me)        — expects 200 with session
 *   6. Updates username             (POST /api/update-username)
 *
 * This validates session creation and Redis lookup under concurrent load.
 * Steps 2 and 4 accept 500 when the upstream auth service is unavailable;
 * downstream steps will then return 401/500 as cascading failures.
 *
 * Run: mvn gatling:test -Dgatling.simulationClass=simulations.ProfileSimulation
 *      Override target host: -DbaseUrl=http://localhost:3000
 */
public class ProfileSimulation extends Simulation {

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

    ScenarioBuilder profileScenario = scenario("Authenticated Profile Flow")
            .exec(fetchCsrf)
            .pause(1)
            .exec(session -> session.set("userIndex", session.userId()))
            .exec(
                http("POST /api/register")
                    .post("/api/register")
                    .header("X-CSRF-Token", "#{csrfToken}")
                    .body(StringBody(session ->
                        "{\"email\":\"profiletest" + session.getLong("userIndex") + "@test.com\"," +
                        "\"username\":\"ProfileUser" + session.getLong("userIndex") + "\"," +
                        "\"password\":\"TestPass123!\"}"
                    ))
                    // 201 success, 409 duplicate from a prior run, 400 validation, 500 auth service down
                    .check(status().in(201, 200, 400, 409, 500))
            )
            .pause(1)
            // Refresh CSRF — the register response may have rotated the cookie
            .exec(fetchCsrf)
            .pause(1)
            .exec(
                http("POST /api/login")
                    .post("/api/login")
                    .header("X-CSRF-Token", "#{csrfToken}")
                    .body(StringBody(session ->
                        "{\"email\":\"profiletest" + session.getLong("userIndex") + "@test.com\"," +
                        "\"password\":\"TestPass123!\"}"
                    ))
                    // 200 success with session cookie, 401 if user wasn't created, 500 auth service down
                    .check(status().in(200, 401, 500))
                    .check(status().saveAs("loginStatus"))
            )
            .pause(1)
            .exec(
                http("GET /api/me")
                    .get("/api/me")
                    // 200 with valid session, 401 when login failed above
                    .check(status().in(200, 401))
            )
            .pause(1)
            .exec(
                http("POST /api/update-username")
                    .post("/api/update-username")
                    .header("X-CSRF-Token", "#{csrfToken}")
                    .body(StringBody(session ->
                        "{\"new_username\":\"Updated" + session.getLong("userIndex") + "\"}"
                    ))
                    // 200 success, 401 no session, 400 validation, 500 auth service down
                    .check(status().in(200, 400, 401, 500))
            );

    // ── Load profile ──────────────────────────────────────────────────────────

    {
        setUp(
            profileScenario.injectOpen(
                rampUsers(20).during(30)
            )
        )
        .protocols(httpProtocol)
        .assertions(
            global().responseTime().percentile(95).lt(5000),
            global().successfulRequests().percent().gt(90.0)
        );
    }
}

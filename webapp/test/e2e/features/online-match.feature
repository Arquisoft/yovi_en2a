Feature: Online matchmaking
  Two guests find each other through the public Online Mode queue.
  Backend calls are intercepted by the in-memory mock server in setup.mjs.

  Background:
    Given a guest is on the online mode card
    And a second player has the app open
    And a second guest is on the online mode card

  Scenario: Two guests are paired into the same match
    When the first player joins the online queue
    And the second player joins the online queue
    Then both players should be on the online game page

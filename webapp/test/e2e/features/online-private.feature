Feature: Private Party Mode
  Validates the private rooms flow with shared Match ID + password.
  Requires the backend running (docker-compose up).

  Background:
    Given a guest is on the private party mode card
    And a second player has the app open
    And a second guest is on the private party mode card

  Scenario: Two guests join the same private match by sharing an ID
    When the first player creates a private match "room-42" with password "hunter2"
    And the second player joins private match "room-42" with password "hunter2"
    Then both players should be on the online game page

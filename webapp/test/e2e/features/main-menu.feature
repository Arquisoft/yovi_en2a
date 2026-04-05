Feature: Main Menu
  Validate the main menu page

  Scenario: Main menu displays the game title
    Given the main menu is open
    Then I should see the title "GAMEY"

  Scenario: Clicking Log In navigates to the login page
    Given the main menu is open
    When I click the "Log In" button
    Then I should be on the login page

  Scenario: Clicking Play as Guest navigates to the game selection page
    Given the main menu is open
    When I click the "Play as Guest" button
    Then I should be on the game selection page

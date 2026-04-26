Feature: Online mode navigation
  Validate that a guest can reach the online lobby cards.

  Scenario: Guest can reach the Online Mode card
    Given a guest is on the online mode card
    Then I should see the title "Online Mode"

  Scenario: Guest can reach the Private Party Mode card
    Given a guest is on the private party mode card
    Then I should see the title "Private Party Mode"

Feature: Login
  Validate the login form

  Scenario: Login page shows the form
    Given the login page is open
    Then I should see the login form

  Scenario: Submitting empty login form shows a validation error
    Given the login page is open
    When I submit the login form without filling it in
    Then I should see an error message "Please fill in all required fields."

  Scenario: Login page has a link to the register page
    Given the login page is open
    When I click the register link
    Then I should be on the register page

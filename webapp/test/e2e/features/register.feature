Feature: Register
  Validate the register form

  Scenario: Register page shows the form
    Given the register page is open
    Then I should see the registration form

  Scenario: Submitting empty register form shows a validation error
    Given the register page is open
    When I submit the register form without filling it in
    Then I should see an error message "Please fill in all required fields."

  Scenario: Register page has a link to the login page
    Given the register page is open
    When I click the login link
    Then I should be on the login page

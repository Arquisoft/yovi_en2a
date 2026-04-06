import { Given, When, Then } from '@cucumber/cucumber'
import assert from 'assert'

Given('the register page is open', async function () {
  await this.page.goto('http://localhost:5173/register')
  await this.page.waitForLoadState('domcontentloaded')
})

Then('I should see the registration form', async function () {
  const heading = await this.page.locator('h2').textContent()
  assert.strictEqual(heading, 'Register')
  await this.page.locator('#register-email').waitFor()
  await this.page.locator('#register-username').waitFor()
  await this.page.locator('#register-password').waitFor()
})

When('I submit the register form without filling it in', async function () {
  await this.page.locator('button[type="submit"]').click()
})

When('I click the login link', async function () {
  await this.page.locator('a[href="/login"]').click()
})

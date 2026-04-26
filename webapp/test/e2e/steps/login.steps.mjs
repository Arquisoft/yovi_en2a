import { Given, When, Then } from '@cucumber/cucumber'
import assert from 'assert'

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:5173'

Given('the login page is open', async function () {
  await this.page.goto(`${BASE_URL}/login`)
  await this.page.waitForLoadState('domcontentloaded')
})

Then('I should see the login form', async function () {
  const heading = await this.page.locator('h2').textContent()
  assert.strictEqual(heading, 'Login')
  await this.page.locator('#login-email').waitFor()
  await this.page.locator('#login-password').waitFor()
})

When('I submit the login form without filling it in', async function () {
  await this.page.locator('button[type="submit"]').click()
})

When('I click the register link', async function () {
  await this.page.locator('a[href="/register"]').click()
})

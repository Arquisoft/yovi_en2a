import { Given, When, Then } from '@cucumber/cucumber'
import assert from 'assert'

Given('the main menu is open', async function () {
  await this.page.goto('http://localhost:5173')
  await this.page.waitForLoadState('domcontentloaded')
})

When('I click the {string} button', async function (label) {
  await this.page.locator(`button[name="${label}"]`).click()
})

Then('I should see the title {string}', async function (expected) {
  const title = await this.page.locator('h2').first().textContent()
  assert.strictEqual(title, expected)
})

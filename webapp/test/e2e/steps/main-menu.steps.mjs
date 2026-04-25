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
  // Prefer an h2 whose entire text matches `expected` exactly. This handles
  // pages with multiple h2s (e.g. SelectionWindow header + mode card titles)
  // without picking the wrong one.
  const exact = this.page.locator(`h2:text-is("${expected}")`).first()
  if (await exact.count() > 0) {
    await exact.waitFor({ state: 'visible', timeout: 5_000 })
    return
  }

  // Fallback: original behaviour — first h2 must include the text.
  const first = this.page.locator('h2').first()
  const title = await first.textContent()
  assert.ok(
    (title ?? '').includes(expected),
    `Expected an h2 with title "${expected}", got "${title}"`
  )
})

// test/e2e/steps/online-common.steps.mjs
//
// Shared utilities for online E2E scenarios. Handles dual-browser
// orchestration; the API mock is wired in setup.mjs.

import { Given, Then } from '@cucumber/cucumber'
import { chromium } from 'playwright'
import { getMockServer } from '../support/mock-server.mjs'

const APP_URL = process.env.APP_URL ?? 'http://localhost:5173'

// Live game URL pattern. The real route is /online/:size/:matchId
// (we previously assumed /onlineMatch/ — that was wrong).
const ONLINE_GAME_URL = /\/online\/[^/]+\/[^/]+/

// ── Dual-browser setup ─────────────────────────────────────────────────────

Given('a second player has the app open', async function () {
    const headless = process.env.HEADLESS !== 'false'
    const slowMo = Number(process.env.SLOW_MO ?? 0)

    this.browser2 = await chromium.launch({ headless, slowMo })
    const context2 = await this.browser2.newContext({ locale: 'en-US' })
    this.page2 = await context2.newPage()

    // Share the same in-memory mock state as page1.
    await getMockServer().attach(this.page2)

    await this.page2.goto(APP_URL)
    await this.page2.waitForLoadState('domcontentloaded')
})

// ── Generic page assertions ────────────────────────────────────────────────

Then('the first player should see {string}', async function (text) {
    await this.page.locator(`text=${text}`).first().waitFor({ timeout: 10_000 })
})

Then('the second player should see {string}', async function (text) {
    await this.page2.locator(`text=${text}`).first().waitFor({ timeout: 10_000 })
})

Then('both players should be on the online game page', async function () {
    await this.page.waitForURL(ONLINE_GAME_URL, { timeout: 15_000 })
    await this.page2.waitForURL(ONLINE_GAME_URL, { timeout: 15_000 })
})

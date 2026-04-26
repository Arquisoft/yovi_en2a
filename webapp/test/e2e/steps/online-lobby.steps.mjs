// test/e2e/steps/online-lobby.steps.mjs

import { Given, When, Then } from '@cucumber/cucumber'
import { expect } from 'playwright/test'

const APP_URL = process.env.APP_URL ?? 'http://localhost:5173'

// ── Helpers ────────────────────────────────────────────────────────────────

function modeCard(page, label) {
    return page
        .locator('[class*="gameModeContainer"]')
        .filter({ has: page.locator(`h2:text-is("${label}")`) })
        .first()
}

async function bringModeIntoView(page, label, maxClicks = 10) {
    const card = modeCard(page, label)
    for (let i = 0; i < maxClicks; i++) {
        if (await card.isVisible().catch(() => false)) {
            await card.scrollIntoViewIfNeeded().catch(() => {})
            return
        }
        await page.locator('button:has-text("→")').last().click()
        await page.waitForTimeout(400)
    }
    await card.waitFor({ state: 'visible', timeout: 2_000 })
    await card.scrollIntoViewIfNeeded().catch(() => {})
}

async function clickButtonInModeCard(page, modeLabel, buttonLabel) {
    const card = modeCard(page, modeLabel)
    const btn = card.locator(`button:has-text("${buttonLabel}")`).first()
    await btn.waitFor({ state: 'visible', timeout: 5_000 })
    if (!(await btn.isEnabled())) {
        throw new Error(`Button "${buttonLabel}" in card "${modeLabel}" is disabled`)
    }
    await btn.click()
}

/**
 * Wraps a click that should trigger an outgoing API call. Records the
 * request URL + response status so we can include it in the diagnostic
 * dump if the navigation never happens.
 */
async function clickAndTrack(page, action) {
    const calls = []
    const onResponse = async (resp) => {
        const url = resp.url()
        // Only the /game/* endpoints we care about.
        if (!/\/game\//.test(url)) return
        calls.push(`  ${resp.request().method()} ${url} → ${resp.status()}`)
    }
    page.on('response', onResponse)
    try {
        await action()
    } finally {
        // Caller handles the wait; we'll detach in waitForLobbyExit.
    }
    return { calls, detach: () => page.off('response', onResponse) }
}

async function waitForLobbyExit(page, tracker, timeout = 15_000, name = 'lobby') {
    try {
        await page.waitForURL(
            (url) => !url.pathname.endsWith('/gameSelection'),
            { timeout }
        )
    } catch (err) {
        const url = page.url()
        const errEl = page.locator('[role="alert"]')
        const errText = (await errEl.count() > 0)
            ? await errEl.first().textContent()
            : '(no [role=alert] visible)'
        await page.screenshot({ path: `e2e-failure-${name}.png` }).catch(() => {})
        const calls = tracker?.calls?.length
            ? '\n  recent /game/* calls:\n' + tracker.calls.join('\n')
            : '\n  (no /game/* calls observed)'
        throw new Error(
            `Did not leave the lobby within ${timeout} ms.\n` +
            `  current URL: ${url}\n` +
            `  in-card error: ${errText?.trim()}` +
            calls +
            `\n  screenshot: e2e-failure-${name}.png`
        )
    } finally {
        tracker?.detach?.()
    }
}

// ── Navigation: main menu → mode cards ────────────────────────────────────

Given('a guest is on the online mode card', async function () {
    await this.page.goto(APP_URL)
    await this.page.locator('button[name="Play as Guest"]').click()
    await this.page.waitForURL('**/gameSelection')
    await bringModeIntoView(this.page, 'Online Mode')
})

Given('a second guest is on the online mode card', async function () {
    await this.page2.locator('button[name="Play as Guest"]').click()
    await this.page2.waitForURL('**/gameSelection')
    await bringModeIntoView(this.page2, 'Online Mode')
})

Given('a guest is on the private party mode card', async function () {
    await this.page.goto(APP_URL)
    await this.page.locator('button[name="Play as Guest"]').click()
    await this.page.waitForURL('**/gameSelection')
    await bringModeIntoView(this.page, 'Private Party Mode')
})

Given('a second guest is on the private party mode card', async function () {
    await this.page2.locator('button[name="Play as Guest"]').click()
    await this.page2.waitForURL('**/gameSelection')
    await bringModeIntoView(this.page2, 'Private Party Mode')
})

// ── Public matchmaking ────────────────────────────────────────────────────

When('the first player joins the online queue', async function () {
    const tracker = await clickAndTrack(this.page, () =>
        clickButtonInModeCard(this.page, 'Online Mode', 'JOIN')
    )
    await waitForLobbyExit(this.page, tracker, 15_000, 'p1-join')
})

When('the second player joins the online queue', async function () {
    const tracker = await clickAndTrack(this.page2, () =>
        clickButtonInModeCard(this.page2, 'Online Mode', 'JOIN')
    )
    await waitForLobbyExit(this.page2, tracker, 15_000, 'p2-join')
})

// ── Private rooms ─────────────────────────────────────────────────────────

When(
    'the first player creates a private match {string} with password {string}',
    async function (matchId, password) {
        const card = modeCard(this.page, 'Private Party Mode')
        await card.locator('input[placeholder="ID..."]').fill(matchId)
        await card.locator('input[placeholder="****"]').fill(password)
        const tracker = await clickAndTrack(this.page, () =>
            clickButtonInModeCard(this.page, 'Private Party Mode', 'CREATE')
        )
        await waitForLobbyExit(this.page, tracker, 15_000, 'p1-create')
    }
)

When(
    'the second player joins private match {string} with password {string}',
    async function (matchId, password) {
        const card = modeCard(this.page2, 'Private Party Mode')
        await card.locator('input[placeholder="ID..."]').fill(matchId)
        await card.locator('input[placeholder="****"]').fill(password)
        const tracker = await clickAndTrack(this.page2, () =>
            clickButtonInModeCard(this.page2, 'Private Party Mode', 'JOIN')
        )
        await waitForLobbyExit(this.page2, tracker, 15_000, 'p2-join-private')
    }
)

// ── In-card assertions ────────────────────────────────────────────────────

Then('an error message containing {string} should appear', async function (text) {
    await expect(this.page.locator('[role="alert"]'))
        .toContainText(text, { timeout: 5_000 })
})

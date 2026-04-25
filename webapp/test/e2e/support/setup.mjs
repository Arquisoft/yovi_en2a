import {
    setWorldConstructor,
    Before,
    After,
    setDefaultTimeout,
} from '@cucumber/cucumber'
import { chromium } from 'playwright'
import { getMockServer, resetMockServer } from './mock-server.mjs'

setDefaultTimeout(60_000)

class CustomWorld {
    browser = null
    page = null
    browser2 = null
    page2 = null
}

setWorldConstructor(CustomWorld)

Before(async function () {
    const headless = process.env.HEADLESS !== 'false'
    const slowMo = Number(process.env.SLOW_MO ?? 0)
    const devtools = process.env.DEVTOOLS === 'true'

    // Fresh mock state per scenario.
    resetMockServer()
    const mock = getMockServer()

    this.browser = await chromium.launch({ headless, slowMo, devtools })
    this.page = await this.browser.newPage()
    await mock.attach(this.page)
})

After(async function () {
    if (this.page) await this.page.close()
    if (this.browser) await this.browser.close()
    if (this.page2) await this.page2.close()
    if (this.browser2) await this.browser2.close()
})

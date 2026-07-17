import { chromium } from 'playwright'

const GAME_URL = 'http://localhost:3000'

async function main() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })

  const consoleErrors = []
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text())
  })
  page.on('pageerror', err => consoleErrors.push('PAGEERROR: ' + err.message))

  await page.goto(GAME_URL, { waitUntil: 'domcontentloaded', timeout: 10000 })
  await page.waitForTimeout(1500)

  // HomeBridgeScene → tap squad tile. Inspect it first.
  const layout = await page.evaluate(() => {
    const g = window.__PHASER_GAME__
    return g ? 'have game' : 'no game'
  })

  // Try clicking center where "squad" tile typically is
  // Just take screenshots at each step
  await page.screenshot({ path: '/tmp/opencode/squad-1-home.png' })
  console.log('layout:', layout)
  console.log('console errors so far:')
  for (const e of consoleErrors.slice(0, 10)) console.log('  ', e.substring(0, 200))

  await browser.close()
}

main().catch(e => { console.error(e); process.exit(1) })
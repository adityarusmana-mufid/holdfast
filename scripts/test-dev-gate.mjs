import { chromium } from 'playwright'

async function main() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })

  // Without dev mode
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2000)
  await page.screenshot({ path: '/tmp/opencode/r-no-dev.png' })

  // With dev mode
  await page.goto('http://localhost:3000/?dev=1', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2000)
  await page.screenshot({ path: '/tmp/opencode/r-dev-mode.png' })

  await browser.close()
}

main().catch(e => { console.error(e); process.exit(1) })
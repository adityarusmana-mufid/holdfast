import { chromium } from 'playwright'

async function click(page, x, y) {
  try {
    await page.locator('canvas').click({ position: { x, y }, timeout: 5000, force: true })
  } catch {
    await page.mouse.click(x, y)
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })

  await page.goto('http://localhost:3000/?dev=true', { waitUntil: 'networkidle', timeout: 15000 })
  await page.waitForTimeout(3000)

  // Click Editor button at bottom-left (20, 672)
  await click(page, 70, 696)
  await page.waitForTimeout(3000)

  await page.screenshot({ path: '/tmp/opencode/game-screenshot.png' })
  await browser.close()
  console.log('Screenshot -> /tmp/opencode/game-screenshot.png')
}

main().catch(e => { console.error(e); process.exit(1) })

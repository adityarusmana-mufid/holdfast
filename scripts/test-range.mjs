import { chromium } from 'playwright'

const GAME_URL = 'http://localhost:3000'

async function main() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })

  const errors = []
  page.on('pageerror', err => errors.push(err.message))

  await page.goto(GAME_URL, { waitUntil: 'domcontentloaded', timeout: 10000 })
  await page.waitForTimeout(2500)

  await page.mouse.click(919, 417)
  await page.waitForTimeout(1200)
  await page.mouse.click(427, 432)
  await page.waitForTimeout(1500)

  // Bard (id: bard_supporter) is index 11 in UNIT_CONFIGS. Scroll to find it.
  // Scroll twice to make sure
  await page.mouse.move(700, 400)
  await page.mouse.down()
  await page.mouse.move(400, 400, { steps: 10 })
  await page.mouse.up()
  await page.waitForTimeout(600)

  // After scrolling, the cards visible are at higher indices. Click around the area.
  // Bard should be visible. Click the green/teal triangle (Decel Binder) area first.
  await page.mouse.click(925, 192)
  await page.waitForTimeout(800)
  await page.screenshot({ path: '/tmp/opencode/r-bard-1.png' })

  await page.mouse.click(1067, 444)
  await page.waitForTimeout(800)
  await page.screenshot({ path: '/tmp/opencode/r-bard-2.png' })

  console.log('errors:', errors.slice(0, 3))
  await browser.close()
}

main().catch(e => { console.error(e); process.exit(1) })
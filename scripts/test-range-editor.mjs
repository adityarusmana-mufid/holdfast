import { chromium } from 'playwright'

const GAME_URL = 'http://localhost:3000/?dev=1'

async function main() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })

  const errors = []
  page.on('pageerror', err => errors.push(err.message))

  await page.goto(GAME_URL, { waitUntil: 'domcontentloaded', timeout: 10000 })
  await page.waitForTimeout(2500)

  // Click RANGE EDITOR (DEV) button at (810+225, 475+28) = (1035, 503)
  await page.mouse.click(1035, 503)
  await page.waitForTimeout(1500)
  await page.screenshot({ path: '/tmp/opencode/range-editor-1.png' })

  // Paint a few tiles around the unit
  // grid starts at ox=40, oy=120, CELL_SIZE=32, unit at row=3 col=3 (center of 7x7)
  // unit tile center: (40+3*32+16, 120+3*32+16) = (152, 232)
  // tile above unit: (152, 200)
  // tile right of unit: (184, 232)
  // tile 2 right: (216, 232)
  await page.mouse.click(184, 232)
  await page.waitForTimeout(200)
  await page.mouse.click(216, 232)
  await page.waitForTimeout(200)
  await page.mouse.click(248, 232)
  await page.waitForTimeout(200)
  await page.mouse.click(152, 200)
  await page.waitForTimeout(500)
  await page.screenshot({ path: '/tmp/opencode/range-editor-2.png' })

  // Switch facing to right
  // Facing buttons at x=1060, y=240, each 56 wide: UP=1060, DOWN=1116, LEFT=1172, RIGHT=1228
  await page.mouse.click(1228, 256)
  await page.waitForTimeout(800)
  await page.screenshot({ path: '/tmp/opencode/range-editor-3.png' })

  console.log('errors:', errors.slice(0, 5))
  await browser.close()
}

main().catch(e => { console.error(e); process.exit(1) })
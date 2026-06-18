import { chromium } from 'playwright'
import { execSync } from 'child_process'

const GAME_URL = process.env.GAME_URL || 'http://localhost:3000'
const OUTPUT = process.env.OUTPUT || '/tmp/opencode/game-screenshot.png'

async function click(page, x, y) {
  try {
    await page.locator('canvas').click({ position: { x, y }, timeout: 5000, force: true })
  } catch {
    // fallback: some scenes handle mouse events differently
    await page.mouse.click(x, y)
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })

  await page.goto(GAME_URL, { waitUntil: 'domcontentloaded', timeout: 10000 })
  await page.waitForTimeout(2000)

  // Click AutoFill then Start Mission to reach GameScene
  await click(page, 1130, 20)
  await page.waitForTimeout(500)
  await click(page, 1120, 672)
  await page.waitForTimeout(3000)

  // Optional arguments: <unitCardIndex> <gridRow> <gridCol>
  const unitIdx = parseInt(process.argv[2] || '0', 10)
  const gridRow = parseInt(process.argv[3] || '-1', 10)
  const gridCol = parseInt(process.argv[4] || '-1', 10)

  if (gridRow >= 0 && gridCol >= 0) {
    const px = 10, baseY = 70, btnH = 34, gap = 2, slotH = btnH + gap
    const cardY = baseY + unitIdx * slotH + btnH / 2
    await click(page, px + 70, cardY)
    await page.waitForTimeout(400)

    const tileCX = 148 + gridCol * 64 + 32
    const tileCY = 128 + gridRow * 64 + 32
    await click(page, tileCX, tileCY)
    await page.waitForTimeout(600)
  }

  // Start simulation
  await click(page, 640, 696)
  await page.waitForTimeout(8000)

  await page.screenshot({ path: OUTPUT })
  await browser.close()
  console.log('Screenshot ->', OUTPUT)
}

main().catch(e => { console.error(e); process.exit(1) })

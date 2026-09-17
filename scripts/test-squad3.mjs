import { chromium } from 'playwright'

const GAME_URL = 'http://localhost:3000'

async function main() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })

  const errors = []
  page.on('console', msg => {
    if (msg.type() === 'error' && !msg.text().includes('validation failed')) {
      errors.push(msg.text())
    }
  })
  page.on('pageerror', err => errors.push('PAGEERROR: ' + err.message))

  await page.goto(GAME_URL, { waitUntil: 'domcontentloaded', timeout: 10000 })
  await page.waitForTimeout(1500)

  // HomeBridge → tap "squad" tile. Try multiple positions
  for (const [x, y] of [[640, 360], [320, 360], [960, 360], [640, 200], [640, 520]]) {
    await page.mouse.click(x, y)
    await page.waitForTimeout(800)
  }

  await page.screenshot({ path: '/tmp/opencode/squad-after-clicks.png' })

  console.log('Errors (non-validation):')
  for (const e of errors.slice(0, 10)) console.log('  ', e.substring(0, 200))

  // Check scene key
  const sceneKey = await page.evaluate(() => {
    const game = window.__PHASER_GAME__
    if (!game) return 'no-game'
    const scene = game.scene.getScenes(true)[0]
    return scene ? scene.scene.key : 'none'
  })
  console.log('Current scene:', sceneKey)

  await browser.close()
}

main().catch(e => { console.error(e); process.exit(1) })
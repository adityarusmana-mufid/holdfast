import { chromium } from 'playwright'

const GAME_URL = 'http://localhost:3000'

async function main() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })

  const allMessages = []
  page.on('console', msg => allMessages.push({ type: msg.type(), text: msg.text() }))

  await page.goto(GAME_URL, { waitUntil: 'domcontentloaded', timeout: 10000 })
  await page.waitForTimeout(2000)

  // Use page.evaluate to pull directly from the game console context
  // Actually intercept console.log on the page by overriding console.error and stringifying
  const result = await page.evaluate(() => {
    const errs = []
    const origErr = console.error
    console.error = (...args) => {
      for (const a of args) {
        if (typeof a === 'string' && a.includes('validation failed')) {
          // Find the second arg which is the array
          errs.push(a.substring(0, 50))
        }
      }
      origErr.apply(console, args)
    }
    return 'patched'
  })
  console.log(result)

  await browser.close()
}

main().catch(e => { console.error(e); process.exit(1) })
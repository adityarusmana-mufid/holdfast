import { chromium } from 'playwright'

const GAME_URL = 'http://localhost:3000'

async function main() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })

  const allMessages = []
  page.on('console', msg => allMessages.push({ type: msg.type(), text: msg.text() }))

  await page.goto(GAME_URL, { waitUntil: 'domcontentloaded', timeout: 10000 })
  await page.waitForTimeout(2000)

  // Print first few validation errors in full
  for (const m of allMessages) {
    if (m.type !== 'error') continue
    if (!m.text.includes('validation failed')) continue
    console.log('---', m.text.substring(0, 80), '...')
    // Strip the chrome and parse the array from the message
    const startIdx = m.text.indexOf('[')
    const arrStr = m.text.substring(startIdx)
    try {
      // Try to parse what's wrapped
      const errors = JSON.parse(arrStr)
      for (const e of errors.slice(0, 6)) {
        console.log(`    ${e.field}: ${e.message}`)
      }
    } catch {
      console.log('    (raw):', arrStr.substring(0, 300))
    }
    break
  }

  await browser.close()
}

main().catch(e => { console.error(e); process.exit(1) })
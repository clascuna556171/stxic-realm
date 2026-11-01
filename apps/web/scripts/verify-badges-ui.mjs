import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const BASE_URL = process.env.REALM_UI_ORIGIN ?? 'http://127.0.0.1:5175'
const REVIEW_DIR = path.resolve('D:/Tech/Projects/stxic-realm/.impeccable/review')
fs.mkdirSync(REVIEW_DIR, { recursive: true })

async function run() {
  console.log('Launching browser to audit Hallmarks and Badges system...')
  const browser = await chromium.launch({
    channel: process.env.REALM_BROWSER_CHANNEL ?? 'chrome',
    headless: true,
  })

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()
  page.setDefaultTimeout(15000)

  // 1. Visit Room Preview
  console.log('Navigating to Room Preview...')
  await page.goto(`${BASE_URL}/?room-preview`)
  await page.locator('.room-canvas canvas').waitFor()
  console.log('✔ Room canvas loaded successfully')

  async function openItem(name, actionLabel) {
    const toggle = page.getByRole('button', { name: 'Objects & details', exact: true })
    if (await toggle.isVisible()) await toggle.click()
    await page.getByRole('button', { name, exact: true }).first().click()
    const action = page.locator('.room-object-detail').getByRole('button', { name: actionLabel, exact: true })
    await action.waitFor({ state: 'visible' })
    await action.click()
    await page.getByRole('dialog').waitFor()
  }

  // 2. Open Coffee Table to inspect Notebook & Hallmarks tab
  console.log('Opening Coffee Table (Notebook & Hallmarks)...')
  await openItem('Coffee table', 'Open Notebook')
  const notebookDialog = page.getByRole('dialog')
  await notebookDialog.waitFor({ state: 'visible' })

  // Verify Hallmarks tab exists
  const hallmarksTab = notebookDialog.getByRole('button', { name: 'Hallmarks', exact: true })
  await hallmarksTab.waitFor({ state: 'visible' })
  console.log('✔ Hallmarks tab found in Notebook!')

  await hallmarksTab.click()
  await page.waitForTimeout(300)

  // Verify panel content
  const openTrophyBtn = notebookDialog.locator('.item-open-hallmarks-btn')
  await openTrophyBtn.waitFor({ state: 'visible' })
  console.log('✔ Open Trophy Case button rendered!')

  await page.screenshot({ path: path.join(REVIEW_DIR, 'audit-room-hallmarks-tab.png') })
  console.log('✔ Captured audit-room-hallmarks-tab.png')

  // 3. Open Trophy Case Modal
  console.log('Clicking Open Trophy Case...')
  await openTrophyBtn.click()
  await page.waitForTimeout(500)

  const trophyModal = page.locator('.badge-modal')
  await trophyModal.waitFor({ state: 'visible' })
  console.log('✔ Trophy Case modal opened!')

  // Verify all 32 badges are rendered in the grid
  const badgeCards = trophyModal.locator('.badge-grid-card')
  const badgeCount = await badgeCards.count()
  console.log(`✔ Found ${badgeCount} / 32 hallmark badges in the Trophy Case!`)
  assert.equal(badgeCount, 32, 'Must display all 32 badges')

  // Verify Realm Creator exists and is rendered
  const creatorCard = trophyModal.locator('.badge-grid-card:has-text("Realm Creator")')
  await creatorCard.waitFor({ state: 'visible' })
  console.log('✔ Realm Creator badge is rendered in Trophy Case!')

  // Click on Realm Creator to inspect detail view
  await creatorCard.click()
  await page.waitForTimeout(300)

  const detailTitle = await trophyModal.locator('.badge-detail-name').textContent()
  assert.equal(detailTitle?.trim(), 'Realm Creator')
  console.log('✔ Selected Realm Creator detail pane!')

  // Capture screenshot of Trophy Case Modal
  await page.screenshot({ path: path.join(REVIEW_DIR, 'audit-trophy-case.png') })
  console.log('✔ Captured audit-trophy-case.png')

  // Test category tabs filtering
  console.log('Testing category filter tabs...')
  const prestigeTab = trophyModal.locator('.badge-cat-tab:has-text("Prestige")')
  await prestigeTab.click()
  await page.waitForTimeout(200)

  const prestigeCount = await trophyModal.locator('.badge-grid-card').count()
  console.log(`✔ Filtered to Prestige: ${prestigeCount} badges shown!`)
  assert.ok(prestigeCount >= 5, 'Prestige tab displays correct badges')

  // Return to All tab
  await trophyModal.locator('.badge-cat-tab:has-text("All")').click()
  await page.waitForTimeout(200)

  // Close modal
  await trophyModal.locator('.badge-modal-close-btn').click()
  await page.waitForTimeout(300)
  console.log('✔ Trophy Case modal closed successfully')

  await browser.close()
  console.log('🎉 Hallmarks & Badges UI Audit: ALL CHECKS PASSED!')
}

run().catch(err => {
  console.error('❌ Audit failed:', err)
  process.exit(1)
})

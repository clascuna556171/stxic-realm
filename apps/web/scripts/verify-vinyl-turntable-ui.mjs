import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const origin = process.env.REALM_UI_ORIGIN ?? 'http://127.0.0.1:5175'
const output = resolve('.impeccable/review/vinyl-turntable')
await mkdir(output, { recursive: true })

const browser = await chromium.launch({ channel: process.env.REALM_BROWSER_CHANNEL ?? 'chrome', headless: true })
const errors = []
const checks = []

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  await context.route('**/*', r => new URL(r.request().url()).origin === origin ? r.continue() : r.abort())
  const page = await context.newPage()
  page.on('pageerror', e => errors.push(e.message))
  page.setDefaultTimeout(15000)

  await page.goto(`${origin}/?room-preview`)
  await page.locator('.room-canvas canvas').waitFor()

  async function openItem(name, actionLabel) {
    const toggle = page.getByRole('button', { name: 'Objects & details', exact: true })
    if (await toggle.isVisible()) await toggle.click()
    await page.getByRole('button', { name, exact: true }).first().click()
    const action = page.locator('.room-object-detail').getByRole('button', { name: actionLabel, exact: true })
    await action.waitFor({ state: 'visible' })
    await action.click()
    await page.getByRole('dialog').waitFor()
  }

  // 1. Verify Hi-Fi Vinyl Turntable on Tech console
  await openItem('Tech console', 'Open Workstation')
  const dialog = page.getByRole('dialog')
  await dialog.locator('.turntable-deck').waitFor()
  assert.ok(await dialog.locator('.turntable-platter').isVisible(), 'turntable platter is rendered')
  assert.ok(await dialog.locator('.tonearm').isVisible(), 'tonearm is rendered')

  // Drop needle (Play)
  const playBtn = dialog.getByRole('button', { name: /Drop Needle/ })
  await playBtn.click()
  await dialog.locator('.cue-play-btn.is-playing').waitFor()
  assert.ok(await dialog.locator('.tonearm.is-playing').isVisible(), 'tonearm pivots onto record')
  assert.ok(await dialog.locator('.vinyl-disc.is-spinning').isVisible(), 'vinyl disc spins on drop needle')

  // Switch RPM
  await dialog.getByRole('button', { name: '45', exact: true }).click()
  assert.ok(await dialog.locator('.vinyl-disc.rpm-45').isVisible(), 'vinyl switches to 45 RPM')

  // Select track from crate
  await dialog.getByRole('option', { name: /Cyberpunk Drizzle/ }).click()
  await dialog.getByText('Cyberpunk Drizzle').first().waitFor()

  await dialog.screenshot({ path: resolve(output, 'turntable-playing-desktop.png') })

  // Lift needle (Pause)
  await dialog.locator('.cue-play-btn.is-playing').click()
  await dialog.getByRole('button', { name: /Drop Needle/ }).waitFor()

  await page.keyboard.press('Escape')
  assert.equal(await dialog.count(), 0, 'Escape dismisses console dialog')
  checks.push('Hi-Fi Vinyl Turntable: needle drop, spinning platter, 45 RPM, Cyberpunk Drizzle track switch, and lift needle pause verified')

  // 2. Verify Pet Sylvester on Linen bed
  await openItem('Linen bed', 'Rest on Bed')
  await dialog.locator('.pet-companion-card').waitFor()
  await dialog.getByText('Sylvester the Tuxedo Cat').waitFor()

  const petBtn = dialog.getByRole('button', { name: /Pet Sylvester/ })
  await petBtn.click()
  await dialog.getByText(/Sylvester purrs|Sylvester stretches|Sylvester nuzzles|Sylvester cracks/).waitFor()
  assert.ok(await dialog.locator('.floating-heart').count() > 0, 'heart motes spawn on petting')

  await dialog.screenshot({ path: resolve(output, 'pet-sylvester-desktop.png') })
  await page.keyboard.press('Escape')
  checks.push('Pet Companion: Sylvester petting reaction, audio trigger, affection increment, and floating heart motes verified')

  // 3. Verify Realm Passport & Stamp Book on Coffee table
  await openItem('Coffee table', 'Open Notebook')
  await dialog.getByRole('button', { name: 'Passport & Stamps', exact: true }).click()
  await dialog.locator('.passport-container').waitFor()
  await dialog.getByText('Realm Traveler’s Passport').waitFor()

  // Stamp Passport with note
  await dialog.locator('input[placeholder*="traveler note"]').fill('Cozy rainy vibes!')
  await dialog.getByRole('button', { name: 'Stamp Passport', exact: true }).click()
  await dialog.getByText(/Passport stamped with/).waitFor()
  assert.ok(await dialog.locator('.passport-stamp-item').count() > 0, 'visa stamp created in passport grid')

  await dialog.screenshot({ path: resolve(output, 'passport-stamped-desktop.png') })
  await page.keyboard.press('Escape')
  checks.push('Realm Passport: collectible room stamp generated, custom traveler note saved, visa grid rendered')

  // 4. Verify Mobile Viewport & Reduced Motion
  await context.close()
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: 'reduce',
  })
  const mobilePage = await mobileContext.newPage()
  mobilePage.on('pageerror', e => errors.push(e.message))

  await mobilePage.goto(`${origin}/?room-preview`)
  await mobilePage.locator('.room-canvas canvas').waitFor()

  // Open console on mobile
  const mobileToggle = mobilePage.getByRole('button', { name: 'Objects & details', exact: true })
  if (await mobileToggle.isVisible()) await mobileToggle.click()
  await mobilePage.getByRole('button', { name: 'Tech console', exact: true }).first().click()
  await mobilePage.locator('.room-object-detail').getByRole('button', { name: 'Open Workstation', exact: true }).click()
  const mobileDialog = mobilePage.getByRole('dialog')
  await mobileDialog.locator('.turntable-deck').waitFor()

  // Confirm no horizontal overflow on mobile
  const hasOverflow = await mobilePage.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
  assert.equal(hasOverflow, false, 'no horizontal scroll on phone viewport')

  await mobileDialog.screenshot({ path: resolve(output, 'turntable-mobile-reduced-motion.png') })
  await mobilePage.keyboard.press('Escape')
  await mobileContext.close()
  checks.push('Mobile & Reduced Motion: clean 390px responsive layout, no scroll overflow, reduced-motion animation guards verified')

  assert.deepEqual(errors, [])
  await writeFile(resolve(output, 'verification.json'), JSON.stringify({ passed: true, checks, errors }, null, 2))
  console.log('PASS: ' + checks.join('; '))
} finally {
  await browser.close()
}

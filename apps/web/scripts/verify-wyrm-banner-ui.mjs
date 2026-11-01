// Local real-component fixture; no account or remote backend required.
import { createServer } from 'vite'
import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const output = resolve(import.meta.dirname, '../../../.impeccable/review/wyrm-banner')
await mkdir(output, { recursive: true })
const server = await createServer({ root: resolve(import.meta.dirname, '..'), server: { host: '127.0.0.1', port: 5189, strictPort: true, forwardConsole: false } })
let browser
try {
  await server.listen()
  // Chrome's local-network check blocks dev websockets on intercepted fixture
  // documents. This isolated browser can reach only the local fixture server.
  browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--disable-features=LocalNetworkAccessChecks'] })
  const page = await browser.newPage({ viewport: { width: 1100, height: 900 } })
  page.setDefaultTimeout(12000)
  const errors = []
  page.on('pageerror', e => { if (!errors.includes(e.message)) { errors.push(e.message); console.error('PAGE ERROR', e.stack) } })
  page.on('console', message => { if (message.type() === 'error') console.error('BROWSER', message.text().slice(0, 500)) })
  await page.addInitScript(() => {
    const NativeWebSocket = window.WebSocket
    window.reviewSockets = []
    window.WebSocket = class extends NativeWebSocket {
      constructor(...args) { super(...args); window.reviewSockets.push(this) }
    }
  })
  await page.route('**/__wyrm_banner__', route => route.fulfill({ contentType: 'text/html; charset=utf-8', body: `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>First Wyrm art verification</title><style>
  body{margin:0;background:#14161b;color:#ececf1;font:14px system-ui}main{max-width:820px;margin:auto;padding:28px}h1{font-size:26px;margin:0 0 8px}p{color:#b3b7c1}#samples{display:flex;flex-wrap:wrap;gap:14px;margin:24px 0 32px}.sample{text-align:center}.sample svg{background:#252830}.sample small{display:block;margin-top:8px}#root{max-width:560px;margin:auto}.account-profile-card{--profile-surface:#20232b;--profile-text:#ececf1;--profile-accent:#cfb579;--profile-font:system-ui}.account-profile-banner{height:160px}.account-banner-empty{background:#343c43!important}.account-profile-avatar-wrap{border-radius:50%}.account-profile-topline .avatar{width:100px;height:100px;border:6px solid #20232b;background:#4e5959;display:grid;place-items:center;font-size:24px;border-radius:50%}.fixture-edit{position:absolute;top:12px;right:12px} .account-profile-card-body{padding-bottom:26px}@media(max-width:600px){main{padding:16px}.sample svg{width:96px;height:72px}h1{font-size:22px}}
  </style></head><body><main><h1>Triarch · The First Wyrm</h1><p>Three watchful heads. Swept violet wings. A companion along the banner ledge.</p><div id="samples"></div><section class="account-profile-page"><div id="root"></div></section><button id="outside">Outside control</button></main></body></html>` }))
  await page.route(/https?:\/\/(?!127\.0\.0\.1:5189)/, route => route.abort())
  await page.goto('http://127.0.0.1:5189/__wyrm_banner__')
  // This intercepted HTML does not get Vite's normal client preamble. Complete
  // the dev websocket handshake before dynamically loading React/source modules.
  await page.evaluate(() => import('/@vite/client').then(() => undefined))
  try { await page.waitForFunction(() => window.reviewSockets.some(socket => socket.readyState === WebSocket.OPEN)) }
  catch (error) { console.log('Websocket diagnostics', await page.evaluate(() => window.reviewSockets.map(s => ({ url:s.url, state:s.readyState })))); throw error }
  await page.evaluate(async () => {
    const refresh = (await import('/@react-refresh')).default
    refresh.injectIntoGlobalHook(window)
    window.$RefreshReg$ = () => {}; window.$RefreshSig$ = () => type => type; window.__vite_plugin_react_preamble_installed__ = true
    const reactModule = await import('/node_modules/.vite/deps/react.js'), React = reactModule.default ?? reactModule
    const clientModule = await import('/node_modules/.vite/deps/react-dom_client.js'), { createRoot } = clientModule.default ?? clientModule
    const { ProfileBannerPet } = await import('/src/ProfileBannerPet.tsx')
    const { getPetSpecies } = await import('/src/pets/pet-model.ts')
    const { getPetPixels } = await import('/src/pets/pet-sprites.ts')
    await import('/src/styles.css'); await import('/src/modern-shell.css'); await import('/src/account-profile.css'); await import('/src/pets/pets.css')
    for (const [direction, state, label] of [['down', 'idle', 'Sentinel'], ['up', 'idle', 'Rear'], ['left', 'walk', 'Left stride'], ['right', 'walk', 'Right stride'], ['down', 'sleep', 'Coiled rest'], ['down', 'happy', 'Ember greeting']]) {
      const card = document.createElement('div'); card.className = 'sample'
      const rects = getPetPixels('triarch', state, 0, direction).map(p => `<rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" fill="${p.color}"/>`).join('')
      card.innerHTML = `<svg width="144" height="108" viewBox="0 0 48 36" shape-rendering="crispEdges">${rects}</svg><small>${label}</small>`
      document.querySelector('#samples').append(card)
    }
    const pet = { ...getPetSpecies('triarch'), id: 'wyrm-fixture', species_id: 'triarch', nickname: 'Triarch', personality: 'Curious', affection_level: 0 }
    const root = createRoot(document.querySelector('#root'))
    const render = companion => root.render(React.createElement('article', { className: 'account-profile-card' },
      React.createElement('div', { className: 'account-profile-banner' }, React.createElement('div', { className: 'account-banner-empty' }), React.createElement(ProfileBannerPet, { pet: companion }), React.createElement('button', { className: 'fixture-edit' }, 'Edit banner')),
      React.createElement('div', { className: 'account-profile-card-body' }, React.createElement('div', { className: 'account-profile-topline' }, React.createElement('div', { className: 'avatar' }, 'ST')), React.createElement('h2', null, 'STXIC'), React.createElement('p', null, 'Founder of the Realm'))))
    window.review = { pet, render, getPetSpecies }; render(pet)
  })
  const pet = page.locator('.profile-banner-pet')
  await pet.waitFor()
  assert.deepEqual(await pet.locator('svg').evaluate(el => ({width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height})), {width:96,height:72}, 'global icon CSS must not shrink the companion')
  await page.waitForFunction(() => document.querySelector('.profile-banner-pet').dataset.pose === 'walk', null, { timeout: 12000 })
  assert.equal(await pet.getAttribute('data-direction'), 'left')
  const x = () => pet.evaluate(el => el.getBoundingClientRect().x)
  const from = await x(); await page.waitForTimeout(500)
  assert.ok(await x() < from - 5, 'walk must advance continuously')
  await page.screenshot({ path: resolve(output, 'wyrm-banner-desktop.png'), fullPage: true })
  console.log('PASS full-size SVG and continuous directional desktop walk')
  const movingBox = await pet.boundingBox()
  await page.mouse.move(movingBox.x + movingBox.width / 2, movingBox.y + movingBox.height / 2)
  await page.waitForTimeout(80)
  const hovered = await x(); await page.waitForTimeout(500)
  assert.ok(Math.abs(await x() - hovered) < 1, 'hover freezes the moving hit target')
  await pet.focus(); await page.mouse.move(5, 5); await page.waitForTimeout(80)
  const focused = await x(); await page.waitForTimeout(500)
  assert.ok(Math.abs(await x() - focused) < 1, 'keyboard focus freezes the companion')
  await page.keyboard.press('Enter')
  await page.waitForFunction(() => document.querySelector('.profile-banner-pet').dataset.pose === 'happy')
  console.log('PASS hover/focus pause and keyboard greeting')
  await page.locator('#outside').focus()
  await page.waitForTimeout(1600)
  await page.waitForFunction(() => document.querySelector('.profile-banner-pet').dataset.pose === 'walk', null, { timeout: 8000 })
  await page.evaluate(() => { document.querySelector('#root').style.marginTop = '2200px' })
  await page.waitForTimeout(150)
  const offscreen = await x(); await page.waitForTimeout(500)
  assert.ok(Math.abs(await x() - offscreen) < 1, 'offscreen in-flight movement freezes')
  await page.evaluate(() => { document.querySelector('#root').style.marginTop = ''; window.scrollTo(0, 0) })
  await page.waitForFunction(() => document.querySelector('.profile-banner-pet').dataset.pose === 'walk', null, { timeout: 8000 })
  // Synthetic visibility change exercises the document.hidden pause independently of IO.
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')) })
  await page.waitForTimeout(100)
  const hidden = await x(); await page.waitForTimeout(500)
  assert.ok(Math.abs(await x() - hidden) < 1, 'hidden document freezes in-flight movement')
  console.log('PASS offscreen and synthetic document-hidden pause')
  await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')) })
  for (const width of [390, 320, 760]) {
    await page.setViewportSize({ width, height: 900 })
    await page.waitForTimeout(150)
    const fit = await pet.evaluate(el => { const b = el.getBoundingClientRect(), p = el.parentElement.getBoundingClientRect(); return b.left >= p.left + 153 && b.right <= p.right - 10 })
    assert.ok(fit, `entire Wyrm clears avatar and banner edges at ${width}`)
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
  }
  await page.setViewportSize({ width: 390, height: 900 })
  await page.waitForFunction(() => document.querySelector('.profile-banner-pet').dataset.pose === 'walk', null, { timeout: 8000 })
  const phoneFrom = await x(); await page.waitForTimeout(300)
  assert.ok(Math.abs(await x() - phoneFrom) > 2, 'phone companion actually roams')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.waitForTimeout(150)
  const reduced = { x: await x(), svg: await pet.locator('svg').innerHTML() }
  await page.waitForTimeout(600)
  assert.equal(await x(), reduced.x); assert.equal(await pet.locator('svg').innerHTML(), reduced.svg)
  assert.equal(await page.locator('canvas').count(), 0)
  await page.screenshot({ path: resolve(output, 'wyrm-banner-phone.png'), fullPage: true })
  console.log('PASS responsive lane, actual phone roaming and static reduced motion')
  await page.evaluate(() => { const { render, getPetSpecies } = window.review; render({ ...getPetSpecies('cat'), id: 'switched-cat', species_id: 'cat', nickname: 'Miso', personality: 'Sleepy', affection_level: 0 }) })
  await page.getByRole('button', { name: /Greet banner companion: Miso/ }).waitFor()
  console.log('PASS equipment switch')
  assert.equal(await pet.locator('svg').getAttribute('width'), '64')
  await page.evaluate(() => window.review.render(null))
  await pet.waitFor({ state: 'detached' })
  assert.deepEqual(errors, [])
  await writeFile(resolve(output, 'verification.json'), JSON.stringify({ passed: true, continuousWalk: true, directionalWalk: true, hoverAndFocusPause: true, keyboardGreeting: true, offscreenPause: true, syntheticHiddenPause: true, responsiveWidths: [320, 390, 760], phoneRoams: true, reducedMotion: true, canvasCount: 0, equipmentSwitchAndRemoval: true, errors }, null, 2))
  console.log('PASS Wyrm banner: continuous directional roaming, pointer/keyboard greeting, pause/resume, resize, phone roaming, reduced motion, equipment switch/removal; no canvas or page errors')
} finally { await browser?.close(); await server.close() }

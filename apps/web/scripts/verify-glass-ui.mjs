// Local guest UI checks; no hosted authentication or database operations.
import {chromium} from 'playwright'
import assert from 'node:assert/strict'
import {mkdir} from 'node:fs/promises'
const origin = process.env.REALM_UI_ORIGIN ?? 'http://127.0.0.1:5175'
const output = '.impeccable/review/glass'
await mkdir(output, {recursive:true})
const browser = await chromium.launch({headless:true,channel:'chrome'})
try {
 const page = await browser.newPage({viewport:{width:1440,height:900}})
 const errors=[]
 const cdp=await page.context().newCDPSession(page)
 const media=(transparency,forced='none')=>cdp.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-transparency',value:transparency},{name:'forced-colors',value:forced}]})
 await media('no-preference')
 page.on('pageerror', error=>errors.push(error.message))
 await page.route('https://**/*', route=>route.abort())
 await page.goto(origin+'/?settings')
 const toggle=page.getByRole('switch',{name:'Glass appearance',exact:true})
 await toggle.waitFor()
 const solidNav=await page.locator('.workspace-nav').boundingBox()
 assert.equal(await toggle.getAttribute('aria-checked'),'false')
 await toggle.focus();await page.keyboard.press('Space')
 assert.equal(await toggle.getAttribute('aria-checked'),'true')
 assert.match(await page.locator('.workspace-nav').evaluate(el=>getComputedStyle(el).backdropFilter),/blur/)
 assert.deepEqual(await page.locator('.workspace-nav').boundingBox(),solidNav,'glass preserves navigation geometry')
 await page.reload();await toggle.waitFor()
 assert.equal(await toggle.getAttribute('aria-checked'),'true')
 await page.screenshot({path:output+'/settings-desktop.png',fullPage:true})
 await page.goto(origin+'/?theme')
 await page.getByRole('radio',{name:'Light',exact:true}).click()
 assert.equal(await toggle.getAttribute('aria-checked'),'true')
 assert.equal(await page.locator('html').getAttribute('data-theme'),'light')
 await page.screenshot({path:output+'/themes-light.png',fullPage:true})
 await media('reduce')
 assert.equal(await page.locator('.workspace-nav').evaluate(el=>getComputedStyle(el).backdropFilter),'none')
 assert.equal(await toggle.getAttribute('aria-checked'),'true')
 await media('no-preference','active')
 assert.equal(await page.locator('.workspace-nav').evaluate(el=>getComputedStyle(el).backdropFilter),'none')
 await media('no-preference')
 await page.getByRole('radio',{name:'Ash',exact:true}).click()
 await page.goto(origin+'/?appearance&section=interface')
 await toggle.waitFor();assert.equal(await toggle.getAttribute('aria-checked'),'true')
 await page.goto(origin+'/?settings')
 for(const [name,width,height] of [['phone',390,844],['narrow',320,740],['landscape',720,450]]) {
  await page.setViewportSize({width,height})
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)
  await toggle.scrollIntoViewIfNeeded()
  assert.ok(await toggle.evaluate(el=>el.getBoundingClientRect().height)>=44)
  await page.screenshot({path:output+`/settings-${name}.png`,fullPage:true})
 }
 await toggle.click()
 assert.equal(await toggle.getAttribute('aria-checked'),'false')
 assert.equal(await page.locator('.workspace-nav').evaluate(el=>getComputedStyle(el).backdropFilter),'none')
 await page.reload();await toggle.waitFor()
 assert.equal(await toggle.getAttribute('aria-checked'),'false')
 assert.deepEqual(errors,[])
 console.log('PASS: keyboard toggle, persistence, both theme editors, theme independence, reduced transparency, forced colors, desktop/phone/narrow/landscape layout, disable restoration; guest local Chrome.')
} finally {await browser.close()}

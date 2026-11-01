// Isolated real-component browser regressions. Remote requests are blocked; no live backend is used.
import { createServer } from 'vite'
import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
const outputDir=resolve(import.meta.dirname,'../../../.impeccable/review/pets-fixes')
await mkdir(outputDir,{recursive:true})
const output=[]
const log=(label,value)=>{output.push({label,value});console.log(label,JSON.stringify(value))}
const server = await createServer({root:resolve(import.meta.dirname,'..'),server:{host:'127.0.0.1',port:5187,strictPort:true}})
let browser
try {
 await server.listen()
 // Isolated localhost fixture: allow Vite's development websocket in Chrome.
 browser = await chromium.launch({channel:'chrome',headless:true,args:['--disable-features=LocalNetworkAccessChecks']})
 const page = await browser.newPage({viewport:{width:1200,height:800}})
 await page.route('**/__pets_review__', route=>route.fulfill({contentType:'text/html',body:'<html><body><button id="outside">Outside control</button><div id="root"></div></body></html>'}))
 await page.route(/https:\/\/.*/, route=>route.abort())
 await page.goto('http://127.0.0.1:5187/__pets_review__')
 await page.evaluate(async()=>{
  const refresh=(await import('/@react-refresh')).default;refresh.injectIntoGlobalHook(window)
  window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true
  const reactModule=await import('/node_modules/.vite/deps/react.js'); const React=reactModule.default??reactModule
  const clientModule=await import('/node_modules/.vite/deps/react-dom_client.js'); const {createRoot}=clientModule.default??clientModule
  const {ProfileBannerPet}=await import('/src/ProfileBannerPet.tsx')
  const {WildlifeEncounterModal}=await import('/src/world/WildlifeEncounterModal.tsx')
  const {getPetSpecies}=await import('/src/pets/pet-model.ts')
  await import('/src/styles.css'); await import('/src/modern-shell.css')
  window.review={React,root:createRoot(document.querySelector('#root')),ProfileBannerPet,WildlifeEncounterModal,getPetSpecies}
  const pet={...getPetSpecies('cat'),id:'review-cat',species_id:'cat',personality:'Curious',nickname:null,affection_level:0}
  const elem=React.createElement(ProfileBannerPet,{pet})
  window.review.root.render(React.createElement('div',{style:{position:'absolute',top:'2400px',height:'120px',width:'500px'}},elem))
 })
 await page.waitForSelector('.profile-banner-pet',{state:'attached'})
 const before=await page.locator('.profile-banner-pet').getAttribute('style')
 await page.waitForTimeout(4050)
 const after=await page.locator('.profile-banner-pet').getAttribute('style')
 assert.equal(after,before,'offscreen banner must not wander')
 log('Offscreen banner paused',true)
 await page.evaluate(()=>{document.querySelector('#root > div').style.top='16px'})
 await page.waitForTimeout(200)
 assert.equal(await page.locator('canvas').count(),0,'banner must not create a canvas')
 await page.emulateMedia({reducedMotion:'reduce'})
 await page.waitForTimeout(150)
 const reducedBefore=await page.locator('.profile-banner-pet svg').innerHTML()
 await page.waitForTimeout(1000)
 assert.equal(reducedBefore,await page.locator('.profile-banner-pet svg').innerHTML(),'reduced-motion sprite must stay static')
 log('Reduced-motion sprite stable',true)
 await page.evaluate(()=>{
  const {React,root,WildlifeEncounterModal,getPetSpecies}=window.review
  document.querySelector('#outside').focus()
  const encounter={...getPetSpecies('fox'),id:'review-fox',species_id:'fox',status:'active',created_at:new Date().toISOString()}
  window.review.closed=0
  root.render(React.createElement(WildlifeEncounterModal,{encounter,onClose:()=>{window.review.closed++;window.review.root.render(null)},onBonded:()=>{}}))
 })
 await page.waitForSelector('dialog[open]')
 assert.equal(await page.evaluate(()=>!!document.activeElement.closest('dialog[open]')),true,'opening dialog must move focus inside')
 await page.locator('dialog[open] button').last().focus()
 await page.keyboard.press('Tab')
 assert.equal(await page.evaluate(()=>document.activeElement===document.querySelector('dialog[open] button')),true,'Tab must wrap inside dialog')
 await page.keyboard.press('Shift+Tab')
 assert.equal(await page.evaluate(()=>document.activeElement===document.querySelectorAll('dialog[open] button')[1]),true,'Shift+Tab must wrap backwards')
 for(const width of [1200,390,320]) {
  await page.setViewportSize({width,height:844})
  await page.screenshot({path:resolve(outputDir,`wildlife-${width}.png`)})
  const sizes=await page.locator('dialog[open]').evaluate(el=>({width:el.getBoundingClientRect().width,scroll:el.scrollWidth,client:el.clientWidth}))
  assert.ok(sizes.width<=width && sizes.scroll<=sizes.client+1,`modal must fit ${width}px viewport`)
 }
 log('Native modal focus, Tab/Shift+Tab and three viewport sizes',true)
 await page.keyboard.press('Escape')
 await page.waitForFunction(()=>window.review.closed===1 && document.activeElement.id==='outside')
 log('Escape dismissal restores focus',true)
} finally {
 await browser?.close()
 await server.close()
 await writeFile(resolve(outputDir,'ui-results.json'),JSON.stringify(output,null,2)+'\n')
}

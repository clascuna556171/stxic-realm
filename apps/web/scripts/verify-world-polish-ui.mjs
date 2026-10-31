// Local anonymous previews only. Regresses the click-induced scene resize and toolbar UX.
import {chromium} from 'playwright'
import assert from 'node:assert/strict'
import {mkdir,writeFile} from 'node:fs/promises'
import {resolve} from 'node:path'
const origin=process.env.REALM_UI_ORIGIN??'http://127.0.0.1:5175',output=resolve(import.meta.dirname,'../../../.impeccable/review/world-polish')
await mkdir(output,{recursive:true})
const browser=await chromium.launch({channel:process.env.REALM_BROWSER_CHANNEL??'chrome',headless:true}),checks=[],errors=[]
let current
const rect=locator=>locator.evaluate(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}})
const same=(before,after,label)=>{for(const key of ['x','y','width','height'])assert.ok(Math.abs(before[key]-after[key])<=1,`${label}: ${key} changed ${before[key]} -> ${after[key]}`)}
async function tapTile(page,canvas,x,y,columns,rows,touch){const r=await canvas.boundingBox(),point={x:r.x+(x+.5)*r.width/columns,y:r.y+(y+.5)*r.height/rows};if(touch)await page.touchscreen.tap(point.x,point.y);else await page.mouse.click(point.x,point.y)}
try{
 for(const [name,width,height,touch] of [['desktop',1440,900,false],['laptop',1280,720,false],['phone',390,844,true],['small',320,740,true],['landscape',844,390,false]]){
  const context=await browser.newContext({viewport:{width,height},hasTouch:touch,isMobile:touch}),page=await context.newPage();current=page
  page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(e.message))
  await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort())
  for(const home of [true,false]){
   const surface=home?'.room-canvas':'.hall-scene',canvasSelector=home?'.room-canvas canvas':'.hall-pixel-canvas',world=home?'.room-main':'.hall-world'
   await page.goto(origin+(home?'/?room-preview':'/?hall-preview'));const canvas=page.locator(canvasSelector);await canvas.waitFor();await page.evaluate(()=>document.fonts.ready)
   const before=await rect(page.locator(surface))
   await page.evaluate(selector=>{window.sceneSizes=[];window.sceneObserver=new ResizeObserver(entries=>{for(const e of entries){const r=e.target.getBoundingClientRect();window.sceneSizes.push({width:r.width,height:r.height})}});window.sceneObserver.observe(document.querySelector(selector))},surface)
   if(home)await tapTile(page,canvas,2,2,16,12,touch)
   else await page.getByRole('button',{name:'Select Moonlit Archive',exact:true}).click()
   const arrival=page.locator(world+' .scene-arrival');await arrival.locator(home?'button':'a').waitFor();same(before,await rect(page.locator(surface)),`${name} arrival`)
   if(home){await arrival.getByRole('button',{name:'Sit at PC',exact:true}).click();same(before,await rect(page.locator(surface)),`${name} sit`);await arrival.getByRole('button',{name:'Stand up',exact:true}).click();same(before,await rect(page.locator(surface)),`${name} stand`)}
   // Repeated replacements, a blocked floor/wall, and Stop must never resize the world.
   for(const [x,y] of home?[[8,5],[14,10],[8,5],[0,0]]:[[12,11],[14,13],[12,10],[0,0]]){
    await tapTile(page,canvas,x,y,home?16:24,home?12:16,touch);same(before,await rect(page.locator(surface)),`${name} next destination`)
   }
   await page.locator(world+' .walk-summary').getByText(/cannot be reached/).waitFor()
   const summary=page.locator(world+' .walk-menu>summary');await summary.click();await page.locator(world+' .direction-pad').waitFor();same(before,await rect(page.locator(surface)),`${name} movement disclosure`)
   await page.getByRole('button',{name:'Move right',exact:true}).focus();await page.keyboard.press('Escape')
   assert.equal(await summary.evaluate(e=>e===document.activeElement),true,'Escape returns focus to disclosure')
   assert.equal(await page.locator(world+' .walk-menu').evaluate(e=>e.open),false)
   await summary.click();await page.locator('header.workspace-header').click({position:{x:8,y:8}})
   assert.equal(await page.locator(world+' .walk-menu').evaluate(e=>e.open),false,'outside selection dismisses movement panel')
   const sizes=await page.evaluate(()=>{window.sceneObserver.disconnect();return window.sceneSizes})
   assert.ok(sizes.every(s=>Math.abs(s.width-before.width)<=1&&Math.abs(s.height-before.height)<=1),`${name} no transient scene zoom: ${JSON.stringify(sizes)}`)
   assert.equal(await page.evaluate(()=>visualViewport.scale),1,'tap leaves browser zoom unchanged')
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'no horizontal overflow')
   const live=await page.locator(world+' [role=status]').count();assert.equal(live,1,'one primary movement status')
   await page.emulateMedia({reducedMotion:'reduce'});same(before,await rect(page.locator(surface)),`${name} reduced motion`)
   await page.screenshot({path:resolve(output,`${home?'home':'hall'}-${name}.png`),fullPage:true})
   checks.push({name,surface:home?'Home':'Hall',stableSize:before})
  }
  await page.goto(origin+'/?room-preview');await page.locator('.room-canvas canvas').waitFor()
  if(width<=950)await page.getByRole('button',{name:'Objects & details',exact:true}).click()
  assert.equal(await page.getByLabel('Walk to column').isVisible(),false,'coordinate form is secondary')
  await page.getByText('Move by coordinates',{exact:true}).click()
  assert.ok(await page.getByLabel('Walk to column').evaluate(e=>parseFloat(getComputedStyle(e).fontSize)>=16),'inputs avoid mobile focus zoom')
  await page.getByLabel('Walk to column').fill('3');await page.getByLabel('Walk to row').fill('3');await page.getByRole('button',{name:'Walk here',exact:true}).click()
  if(width<=950)await page.locator('.position-feedback').getByText(/cannot be reached/).waitFor()
  else await page.locator('.room-main .walk-summary').getByText(/cannot be reached/).waitFor()
  await context.close()
 }
 assert.deepEqual(errors,[]);await writeFile(resolve(output,'verification.json'),JSON.stringify({result:'PASS',checks,pageErrors:errors},null,2));console.log('PASS stable Home/Hall geometry, repeated click/tap routes, arrival/sitting, disclosures, focus, coordinate inputs and reduced motion at five sizes')
}catch(error){if(current&&!current.isClosed()){await current.screenshot({path:resolve(output,'failure.png'),fullPage:true});console.error((await current.locator('body').innerText()).slice(-1800))}throw error}finally{await browser.close()}

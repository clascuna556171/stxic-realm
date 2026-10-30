// Anonymous world previews: no sign-in and no writes to the linked database.
import {chromium} from 'playwright'
import assert from 'node:assert/strict'
import {mkdir,writeFile} from 'node:fs/promises'
import {resolve} from 'node:path'
const origin=process.env.REALM_UI_ORIGIN??'http://127.0.0.1:5175',output=resolve(import.meta.dirname,'../../../.impeccable/review/workspace-layout')
await mkdir(output,{recursive:true})
const browser=await chromium.launch({channel:process.env.REALM_BROWSER_CHANNEL??'chrome',headless:true})
const context=await browser.newContext(),page=await context.newPage(),errors=[],checks=[]
page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000)
await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort())
async function fits(name){const value=await page.evaluate(()=>({x:document.documentElement.scrollWidth-innerWidth,y:document.documentElement.scrollHeight-innerHeight}));assert.ok(value.x<=1&&value.y<=1,`${name}: document overflow ${JSON.stringify(value)}`)}
async function visible(selector,name){assert.ok(await page.locator(selector).evaluate(e=>{const r=e.getBoundingClientRect();return r.width>20&&r.height>20&&r.top>=0&&r.bottom<=innerHeight+1}),name)}
try{
 for(const [name,width,height] of [['wide',1920,972],['desktop',1440,900],['laptop',1280,720],['narrow',663,844],['phone',390,844],['small',320,740],['landscape',844,390]]){
  await page.setViewportSize({width,height})
  await page.goto(origin+'/?hall-preview');await page.locator('.hall-pixel-canvas').waitFor();await fits(`hall ${name}`)
  await visible('.hall-scene',`hall scene ${name}`)
  if(width>900)assert.ok((await page.locator('.hall-scene').boundingBox()).height>=height*.65,`hall occupies most of the available height ${name}`)
  if(width<=900)await page.getByRole('button',{name:'Servers & channels',exact:true}).click()
  await page.getByLabel('Find a server').fill('workshop');await page.getByRole('button',{name:/The Workshop.*Member server/}).click();await page.getByLabel('Find a server').fill('')
  assert.equal(await page.locator('.hall-selected h3').innerText(),'The Workshop')
  await page.locator('.hall-enter').scrollIntoViewIfNeeded();await visible('.hall-enter',`Enter server reachable ${name}`)
  await fits(`hall details ${name}`)
  if(width<=900)await page.getByRole('button',{name:'Hall',exact:true}).click()
  await page.screenshot({path:resolve(output,`halls-${name}.png`),fullPage:true})
  await page.goto(origin+'/?room-preview');await page.locator('.room-canvas canvas').waitFor();await fits(`home ${name}`)
  await visible('.room-canvas',`room canvas ${name}`);await visible('.direction-pad',`movement controls ${name}`)
  await page.locator('.room-canvas').focus();await page.keyboard.press('ArrowRight')
  if(width<=900)await page.getByRole('button',{name:'Objects & details',exact:true}).click()
  await page.getByRole('button',{name:'Sofa',exact:true}).click()
  await page.getByRole('button',{name:'Sit on sofa',exact:true}).click()
  await page.getByRole('button',{name:'Stand up from sofa',exact:true}).click()
  await fits(`home details ${name}`)
  if(width<=900)await page.getByRole('button',{name:'Room',exact:true}).click()
  await page.waitForFunction(()=>{const host=document.querySelector('.room-canvas')?.getBoundingClientRect(),canvas=document.querySelector('.room-canvas canvas')?.getBoundingClientRect();return host&&canvas&&canvas.width>=host.width*.9&&canvas.height>=host.height*.9})
  await page.screenshot({path:resolve(output,`home-${name}.png`),fullPage:true})
  if(width>650){const destinations=await page.locator('.workspace-nav a').evaluateAll(es=>es.map(e=>({label:e.textContent,top:e.getBoundingClientRect().top,bottom:e.getBoundingClientRect().bottom})));assert.ok(destinations.every(e=>e.top>=0&&e.bottom<=height+1),`navigation fits ${name}: ${JSON.stringify(destinations)}`)}
  checks.push(name)
 }
 assert.deepEqual(errors,[])
 await writeFile(resolve(output,'verification.json'),JSON.stringify({passed:true,checks,errors},null,2));console.log('PASS viewport worlds:',checks.join(', '))
}catch(e){await page.screenshot({path:resolve(output,'failure.png'),fullPage:true});console.error((await page.locator('body').innerText()).slice(-1400));throw e}finally{await browser.close()}

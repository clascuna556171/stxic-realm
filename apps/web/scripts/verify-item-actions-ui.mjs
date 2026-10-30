import {chromium} from 'playwright'
import assert from 'node:assert/strict'
import {mkdir,writeFile} from 'node:fs/promises'
import {resolve} from 'node:path'
const origin=process.env.REALM_UI_ORIGIN??'http://127.0.0.1:5175',out=resolve('.impeccable/review/item-actions')
await mkdir(out,{recursive:true})
const browser=await chromium.launch({channel:process.env.REALM_BROWSER_CHANNEL??'chrome',headless:true}),errors=[],checks=[]
try{
 for(const [width,height] of [[1440,900],[390,844],[320,740]]){
  const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'})
  await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort())
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000)
  const dialog=page.getByRole('dialog')
  async function approach(name,label){

   const toggle=page.getByRole('button',{name:'Objects & details',exact:true});if(await toggle.isVisible())await toggle.click()
   await page.getByRole('button',{name,exact:true}).first().click()
   const action=page.locator('.room-object-detail').getByRole('button',{name:label,exact:true});await action.waitFor();await action.waitFor({state:'visible'})
   await page.waitForFunction(el=>!el.disabled,await action.elementHandle());await action.focus();await page.keyboard.press('Enter');await dialog.waitFor()
  }
  await page.goto(origin+'/?room-preview');await page.locator('.room-canvas canvas').waitFor()
  await approach('Coffee table','Open Notebook')
  await dialog.getByLabel('Write Note',{exact:true}).fill('Private test memo');await dialog.getByRole('button',{name:'Add note',exact:true}).click()
  await dialog.getByRole('button',{name:'Pin note',exact:true}).click();await dialog.getByText('Pinned ·',{exact:false}).waitFor()
  await dialog.getByRole('button',{name:'Edit note',exact:true}).click();await dialog.getByLabel('Edit note',{exact:true}).fill('Edited private memo');await dialog.getByRole('button',{name:'Save note',exact:true}).click()
  await page.keyboard.press('Escape');assert.equal(await dialog.count(),0)
  await page.locator('.room-object-detail').getByRole('button',{name:'Open Notebook',exact:true}).click();await dialog.getByText('Edited private memo',{exact:true}).waitFor()
  await dialog.getByRole('button',{name:'Room Sticky Notes',exact:true}).click();await dialog.getByLabel('Write Note',{exact:true}).fill('A sticky for visitors');await dialog.getByRole('button',{name:'Add note',exact:true}).click()
  await page.screenshot({path:resolve(out,`notebook-${width}.png`)})
  await dialog.getByRole('button',{name:'Personal Notes',exact:true}).click();await dialog.getByRole('button',{name:'Delete note',exact:true}).click();await dialog.getByText('No notes yet.',{exact:true}).waitFor()
  // Native focus containment and restoration.
  for(let i=0;i<12;i++){await page.keyboard.press('Tab');assert.equal(await dialog.evaluate(d=>d.contains(document.activeElement)),true)}
  await page.keyboard.press('Escape');assert.equal(await page.locator('.room-object-detail button').first().evaluate(e=>e===document.activeElement),true)
  await approach('Project desk','Open Workstation');await dialog.getByRole('button',{name:'Start timer',exact:true}).click();const chatTarget=await dialog.getByRole('link',{name:'Return to Chat',exact:true}).boundingBox();assert.ok(chatTarget.height>=44&&chatTarget.width>=44);await page.screenshot({path:resolve(out,`workstation-${width}.png`)});await page.keyboard.press('Escape')
  await page.locator('.room-object-detail').getByRole('button',{name:'Open Workstation',exact:true}).click();await dialog.getByRole('button',{name:'Pause timer',exact:true}).waitFor();await dialog.getByRole('button',{name:'Reset timer',exact:true}).click();await page.keyboard.press('Escape')
  await approach('Bookshelf','Browse Shelf');await dialog.getByLabel('Book or resource title').fill('A field guide');await dialog.getByLabel('Resource HTTPS address').fill('https://example.com/guide');await dialog.getByRole('button',{name:'Add bookmark',exact:true}).click();assert.equal(await dialog.getByRole('link',{name:/A field guide/}).getAttribute('rel'),'noopener noreferrer');await page.keyboard.press('Escape')
  await approach('Reading lamp','Toggle Light');await dialog.getByRole('button',{name:'Toggle Light',exact:true}).click();await dialog.getByText(/Lighting is off/).waitFor();await page.keyboard.press('Escape')
  await approach('Plant','Check Plant');await dialog.getByRole('button',{name:'Water Plant',exact:true}).click();await dialog.getByRole('heading',{name:'Thriving',exact:true}).waitFor();await page.keyboard.press('Escape')
  await approach('Linen bed','Rest on Bed');await dialog.getByRole('button',{name:'Sleep',exact:true}).click()
  const scene=page.getByRole('button',{name:'Room',exact:true});if(await scene.isVisible())await scene.click()
  await page.locator('.rest-vignette').waitFor();await page.locator('.room-canvas').focus();await page.keyboard.press('ArrowRight');await page.locator('.rest-vignette').waitFor({state:'detached'})
  await approach('Banner','Inspect Banner');const studioLink=dialog.getByRole('link',{name:'Open Home Studio',exact:true});await studioLink.waitFor();assert.ok((await studioLink.boundingBox()).height>=44);await page.keyboard.press('Escape')
  await approach('Tech console','Open Workstation');await dialog.getByRole('link',{name:'Return to Chat',exact:true}).waitFor();await page.keyboard.press('Escape')
  await approach('Lantern','Toggle Light');await page.keyboard.press('Escape')
  await approach('Sofa','Relax');await dialog.getByRole('button',{name:'Sit on sofa',exact:true}).click()
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)
  await page.goto(origin+'/?hall-preview');await page.locator('.hall-pixel-canvas').waitFor()
  const details=page.getByRole('button',{name:'Servers & channels',exact:true});if(await details.isVisible())await details.click()
  await page.getByText('Hall objects',{exact:true}).click();await page.getByRole('button',{name:'Stone hearth',exact:true}).click()
  const hearth=page.locator('.hall-movement-details').getByRole('button',{name:'Stoke Fire',exact:true});await hearth.click();await dialog.getByRole('button',{name:'Let Fire Rest',exact:true}).click();await dialog.getByText(/Lighting is off/).waitFor();assert.equal(await page.locator('.hall-firelight').count(),0)
  await page.screenshot({path:resolve(out,`hearth-${width}.png`)});await page.keyboard.press('Escape')
  checks.push(`${width}px: all home catalogs, notes CRUD/pin/persistence, bookmarks, timer, light, plant, rest/wake, native focus/Escape and hall fire`)
  await context.close()
 }
 assert.deepEqual(errors,[]);await writeFile(resolve(out,'verification.json'),JSON.stringify({checks,errors},null,2));console.log(checks.join('\n'))
}finally{await browser.close()}

import {chromium} from 'playwright'
import assert from 'node:assert/strict'
import {resolve} from 'node:path'
const browser=await chromium.launch({channel:'chrome',headless:true})
const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[]
page.on('pageerror',e=>errors.push(e.message))
const origin=process.env.REALM_UI_ORIGIN??'http://127.0.0.1:5175'
try{
 await page.goto(origin+'/?hall-preview');await page.locator('.hearth-ambience').waitFor()
 await page.waitForFunction(()=>Array.from(document.querySelector('.hearth-ambience').getContext('2d').getImageData(0,0,384,256).data).some(v=>v!==0))
 await page.emulateMedia({reducedMotion:'reduce'})
 await page.waitForFunction(()=>Array.from(document.querySelector('.hearth-ambience').getContext('2d').getImageData(0,0,384,256).data).every(v=>v===0))
 await page.emulateMedia({reducedMotion:'no-preference'})
 await page.getByRole('button',{name:'Ambient effects On'}).click();assert.equal(await page.locator('.hearth-ambience').count(),0)
 await page.getByRole('button',{name:'Ambient effects Off'}).click()
 await page.screenshot({path:resolve('.impeccable/review/free-vfx-hall.png')})
 await page.goto(origin+'/?room-preview');await page.locator('.room-canvas canvas').waitFor();await page.locator('.garden-ambience').waitFor()
 await page.screenshot({path:resolve('.impeccable/review/free-vfx-room.png')})
 assert.deepEqual(errors,[])
 console.log('PASS: actual effect pixels, runtime reduced-motion clear, toggle, room rendering; no page errors.')
}finally{await browser.close()}

// Anonymous local worlds only. Every non-local HTTP request is blocked.
import {chromium} from 'playwright'
import assert from 'node:assert/strict'
import {mkdir,writeFile} from 'node:fs/promises'
import {resolve} from 'node:path'
const origin=process.env.REALM_UI_ORIGIN??'http://127.0.0.1:5175',output=resolve(import.meta.dirname,'../../../.impeccable/review/direct-interaction')
await mkdir(output,{recursive:true})
const browser=await chromium.launch({channel:process.env.REALM_BROWSER_CHANNEL??'chrome',headless:true}),errors=[],checks=[]
const context=await browser.newContext({viewport:{width:1440,height:1000}})
await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort())
const page=await context.newPage();page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept())
const waitValue=async(locator,value)=>{for(let i=0;i<100;i++){if(await locator.inputValue()===value)return;await new Promise(r=>setTimeout(r,10))}assert.equal(await locator.inputValue(),value)}
const roomPosition=()=>page.locator('.room-main .walk-summary .walk-position').innerText()
const tilePoint=async(locator,x,y,columns,rows)=>{await locator.scrollIntoViewIfNeeded();const b=await locator.boundingBox();return {x:b.x+(x+.5)*b.width/columns,y:b.y+(y+.5)*b.height/rows}}
const clickTile=async(locator,x,y,columns=16,rows=12)=>{const p=await tilePoint(locator,x,y,columns,rows);await page.mouse.click(p.x,p.y)}
const drag=async(locator,from,to,columns,rows)=>{const a=await tilePoint(locator,...from,columns,rows),b=await tilePoint(locator,...to,columns,rows);await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(b.x,b.y,{steps:6})}
const overflow=async p=>assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)
try{
 await page.goto(origin+'/?room-preview');const room=page.locator('.room-canvas canvas');await room.waitFor()
 await clickTile(room,8,5);await page.locator('.room-main .walk-summary').getByText('Destination reached.',{exact:false}).waitFor();assert.match(await roomPosition(),/Column 9.*Row 6/)
 await clickTile(room,2,2);await page.locator('.scene-arrival button').filter({hasText:'Sit at PC'}).waitFor();const adjacent=await roomPosition();await page.locator('.scene-arrival button').filter({hasText:'Sit at PC'}).click();assert.equal(await roomPosition(),adjacent)
 await clickTile(room,14,10);await clickTile(room,1,1);await page.locator('.room-main .walk-summary').getByText('Destination reached.',{exact:false}).waitFor();assert.match(await roomPosition(),/Column 2.*Row 2/)
 await clickTile(room,0,0);await page.locator('.room-main .walk-summary').getByText(/cannot be reached/).waitFor();assert.match(await roomPosition(),/Column 2.*Row 2/)
 await page.locator('.room-canvas').focus();await page.keyboard.press('ArrowRight');await page.locator('.room-main .walk-summary').getByText('Destination reached.',{exact:false}).waitFor();assert.match(await roomPosition(),/Column 3.*Row 2/)
 await page.screenshot({path:resolve(output,'room-desktop.png'),fullPage:true});checks.push('floor routes, object arrival and adjacent sitting, replacement, blocked destination, keyboard')
 await page.goto(origin+'/?room-studio');await room.waitFor()
 await drag(room,[7,3],[7,5],16,12);await page.getByRole('status').filter({hasText:'Valid placement'}).waitFor();await page.screenshot({path:resolve(output,'home-placement-valid.png'),fullPage:true});await page.mouse.up();assert.equal(await page.getByLabel('Column',{exact:true}).inputValue(),'8');assert.equal(await page.getByLabel('Row',{exact:true}).inputValue(),'6')
 await page.getByRole('button',{name:'Undo',exact:true}).click();assert.equal(await page.getByLabel('Row',{exact:true}).inputValue(),'4')
 await drag(room,[7,3],[8,9],16,12);await page.getByRole('status').filter({hasText:'Invalid placement'}).waitFor();await page.screenshot({path:resolve(output,'home-placement-invalid.png'),fullPage:true});await page.mouse.up();assert.equal(await page.getByLabel('Row',{exact:true}).inputValue(),'4')
 await drag(room,[7,3],[7,5],16,12);await page.keyboard.press('Escape');await page.mouse.up();assert.equal(await page.getByLabel('Row',{exact:true}).inputValue(),'4')
 await page.locator('.room-canvas').focus();await page.keyboard.press('ArrowDown');assert.equal(await page.getByLabel('Row',{exact:true}).inputValue(),'5');await page.getByRole('button',{name:'Cancel changes',exact:true}).click();assert.equal(await page.getByLabel('Row',{exact:true}).inputValue(),'4')
 checks.push('Home Studio valid/invalid preview, original position, Escape, keyboard positioning, undo and cancel')
 await page.goto(origin+'/?hall-preview');const hall=page.locator('.hall-pixel-canvas');await hall.waitFor()
 await clickTile(hall,12,11,24,16);await page.locator('.hall-world .walk-summary').getByText('Destination reached.',{exact:false}).waitFor();assert.equal(await page.locator('.hall-traveler').getAttribute('data-facing'),'up')
 await clickTile(hall,13,11,24,16);await page.locator('.hall-world .walk-summary').getByText('Destination reached.',{exact:false}).waitFor();assert.equal(await page.locator('.hall-traveler').getAttribute('data-facing'),'right')
 await clickTile(hall,12,11,24,16);await page.locator('.hall-world .walk-summary').getByText('Destination reached.',{exact:false}).waitFor();assert.equal(await page.locator('.hall-traveler').getAttribute('data-facing'),'left')
 await clickTile(hall,12,12,24,16);await page.locator('.hall-world .walk-summary').getByText('Destination reached.',{exact:false}).waitFor();assert.equal(await page.locator('.hall-traveler').getAttribute('data-facing'),'down')
 await page.getByRole('button',{name:'Select Moonlit Archive',exact:true}).click();await page.locator('.hall-world .scene-arrival a').waitFor();assert.equal(await page.locator('.hall-traveler').getAttribute('data-facing'),'up');await page.getByLabel('Find a server').fill('workshop');assert.equal(await page.locator('.hall-server-list>button').count(),1)
 await page.screenshot({path:resolve(output,'hall-desktop.png'),fullPage:true});checks.push('hall floor routes, four directional views and retained facing, entrance arrival, directory/search')
 await page.goto(origin+'/?hall-studio');await hall.waitFor()
 await drag(hall,[8,10],[8,12],24,16);await page.getByRole('status').filter({hasText:'Valid placement'}).waitFor();await page.mouse.up();assert.equal(await page.getByLabel('Row',{exact:true}).inputValue(),'13');await page.getByRole('button',{name:'Undo',exact:true}).click();assert.equal(await page.getByLabel('Row',{exact:true}).inputValue(),'11')
 await drag(hall,[8,10],[11,10],24,16);await page.getByRole('status').filter({hasText:'Invalid placement'}).waitFor();await page.screenshot({path:resolve(output,'hall-placement-invalid.png'),fullPage:true});await page.mouse.up();assert.equal(await page.getByLabel('Column',{exact:true}).inputValue(),'9')
 checks.push('Hall Studio valid/invalid dragging, reserved aisle rejection and undo')
 // Real browser touch input emulated by Chromium, including drag and pointer cancellation.
 const touch=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});await touch.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());const phone=await touch.newPage();phone.on('pageerror',e=>errors.push(e.message));phone.on('dialog',d=>d.accept())
 const cdp=await touch.newCDPSession(phone)
 const touchDrag=async(locator,from,to,columns,rows,cancel=false)=>{await locator.scrollIntoViewIfNeeded();const b=await locator.boundingBox(),a={x:b.x+(from[0]+.5)*b.width/columns,y:b.y+(from[1]+.5)*b.height/rows},z={x:b.x+(to[0]+.5)*b.width/columns,y:b.y+(to[1]+.5)*b.height/rows};await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[a]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[z]});await phone.getByRole('status').filter({hasText:cancel?'Valid placement':/placement/}).first().waitFor();await cdp.send('Input.dispatchTouchEvent',{type:cancel?'touchCancel':'touchEnd',touchPoints:[]})}
 await phone.goto(origin+'/?room-preview');const phoneRoom=phone.locator('.room-canvas canvas');await phoneRoom.waitFor();let box=await phoneRoom.boundingBox();await phone.touchscreen.tap(box.x+8.5*box.width/16,box.y+5.5*box.height/12);await phone.locator('.room-main .walk-summary').getByText('Destination reached.',{exact:false}).waitFor();await overflow(phone);await phone.screenshot({path:resolve(output,'room-touch.png'),fullPage:true})
 await phone.getByRole('button',{name:'Objects & details',exact:true}).click();await phone.getByText('Move by coordinates',{exact:true}).click();await phone.getByLabel('Walk to column').fill('3');await phone.getByLabel('Walk to row').fill('3');await phone.getByRole('button',{name:'Walk here',exact:true}).click();await phone.locator('.position-feedback').getByText(/cannot be reached/).waitFor()
 await phone.goto(origin+'/?room-studio');await phoneRoom.waitFor();await touchDrag(phoneRoom,[7,3],[7,5],16,12);await waitValue(phone.getByLabel('Row',{exact:true}),'6');await phone.getByRole('button',{name:'Undo',exact:true}).click();await touchDrag(phoneRoom,[7,3],[7,5],16,12,true);assert.equal(await phone.getByLabel('Row',{exact:true}).inputValue(),'4');await overflow(phone)
 await phone.goto(origin+'/?hall-studio');const phoneHall=phone.locator('.hall-pixel-canvas');await phoneHall.waitFor();await touchDrag(phoneHall,[8,10],[8,12],24,16);await waitValue(phone.getByLabel('Row',{exact:true}),'13');await phone.getByRole('button',{name:'Undo',exact:true}).click();await touchDrag(phoneHall,[8,10],[11,10],24,16);assert.equal(await phone.getByLabel('Column',{exact:true}).inputValue(),'9');await overflow(phone);await phone.screenshot({path:resolve(output,'hall-studio-touch.png'),fullPage:true})
 await phone.goto(origin+'/?hall-preview');await phoneHall.waitFor();await phone.getByRole('button',{name:'Select Moonlit Archive',exact:true}).tap();await phone.locator('.hall-world .scene-arrival a').waitFor();await phone.emulateMedia({reducedMotion:'reduce'});assert.equal(await phone.locator('.hall-traveler').evaluate(e=>getComputedStyle(e).transitionDuration),'0s');await overflow(phone);await phone.screenshot({path:resolve(output,'hall-touch.png'),fullPage:true});await touch.close()
 checks.push('390px touch walking, position form rejection, touch drags in both editors, touch cancel, invalid touch drop, reduced motion')
 // Exercise actual Phaser graphics, authoritative guest snapshots and retained facing.
 await page.bringToFront()
 await page.evaluate(async()=>{
  const {createRoom}=await import('/src/world/renderer.ts'),{defaults}=await import('/src/appearance.ts'),{characterPixels}=await import('/src/character.ts')
  const mount=document.createElement('div');mount.style.cssText='position:fixed;inset:0;width:512px;height:384px';document.body.append(mount)
  const visitors=[{id:'fixture',name:'Visitor',x:8,y:8,sequence:8,character:defaults}]
  const game=createRoom(mount,()=>{},()=>({x:8,y:9}),()=>[],{appearance:defaults,people:()=>visitors})
  const wait=ms=>new Promise(r=>setTimeout(r,ms)),check=(ok,message)=>{if(!ok)throw new Error(message)}
  try{
   await new Promise(r=>game.events.once('postrender',r));const scene=game.scene.getScene('room'),actors=scene.children.list.filter(o=>o.type==='Container'),own=actors.find(o=>!o.list.some(c=>c.type==='Text')),guest=actors.find(o=>o.list.some(c=>c.text==='Visitor'))
   const matches=(actor,direction)=>{const expected=scene.add.graphics().clear();for(const p of characterPixels(defaults,direction)){expected.fillStyle(parseInt(p.color.slice(1),16));expected.fillRect(p.x,p.y,p.w,p.h)}const actual=actor.list.find(c=>c.type==='Graphics').commandBuffer;check(Array.isArray(actual)&&expected.commandBuffer.length>100,'graphics command buffers exist');const ok=JSON.stringify(actual.slice(-expected.commandBuffer.length))===JSON.stringify(expected.commandBuffer);expected.destroy();return ok}
   for(const [point,direction] of [[{x:8,y:8},'up'],[{x:7,y:8},'left'],[{x:8,y:8},'right'],[{x:8,y:9},'down']]){game.events.emit('room:move',point);await wait(300);check(matches(own,direction),`actual Phaser ${direction} artwork`);game.events.emit('room:move',point);check(matches(own,direction),'idle retains facing')}
   game.events.emit('room:people',[{...visitors[0],x:7,y:8,sequence:9}]);await wait(300);check(matches(guest,'left'),'guest faces accepted displacement')
   game.events.emit('room:people',[{...visitors[0],x:12,y:9,sequence:10}]);check(guest.x===400&&guest.y===315,'skipped snapshot snaps to authoritative tile')
   game.events.emit('room:people',[{...visitors[0],x:8,y:9,sequence:0}]);check(guest.x===272&&guest.y===315&&matches(guest,'down'),'re-entered visitor resets sequence and position')
  }finally{game.destroy(true);await wait(40);mount.remove()}
 })
 checks.push('actual Phaser directional graphics, idle facing, guest snapshot jumps and re-entry sequence reset')
 assert.deepEqual(errors,[]);await writeFile(resolve(output,'verification.json'),JSON.stringify({result:'PASS',checks,pageErrors:errors},null,2));console.log('PASS: '+checks.join('; '))
}catch(e){await page.screenshot({path:resolve(output,'failure.png'),fullPage:true});console.error((await page.locator('body').innerText()).slice(-2500));throw e}finally{await browser.close()}

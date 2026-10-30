import {chromium} from 'playwright'
import assert from 'node:assert/strict'
import {mkdir,writeFile} from 'node:fs/promises'
import {resolve} from 'node:path'
const origin=process.env.REALM_UI_ORIGIN??'http://127.0.0.1:5175',output=resolve('.impeccable/review/furniture-poses')
await mkdir(output,{recursive:true})
const browser=await chromium.launch({channel:process.env.REALM_BROWSER_CHANNEL??'chrome'}),errors=[]
try{
 const context=await browser.newContext({viewport:{width:1440,height:900}})
 await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort())
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000)
 await page.goto(origin+'/?room-preview');await page.locator('.room-canvas canvas').waitFor()
 for(const [name,label,file] of [['Project desk','Sit at PC','desk'],['Sofa','Sit on sofa','sofa'],['Linen bed','Rest on Bed','bed']]){
  await page.locator('.room-object-list button').filter({hasText:name}).click()
  const button=page.locator('.scene-arrival').getByRole('button',{name:label,exact:true});await button.waitFor()
  const before=await page.locator('.room-main .walk-position').innerText();await button.click()
  if(file==='bed')await page.getByRole('dialog').getByRole('button',{name:'Sleep',exact:true}).click()
  assert.equal(await page.locator('.room-main .walk-position').innerText(),before)
  await page.screenshot({path:resolve(output,`home-${file}-desktop.png`)})
  await page.locator('.scene-arrival').getByRole('button',{name:'Stand up',exact:true}).click()
 }
 // Inspect real Phaser actors, including repeated accepted-position snapshots and pose teardown.
 await page.evaluate(async()=>{
  const {createRoom}=await import('/src/world/renderer.ts'),{OBJECTS}=await import('/src/world/room.ts'),{seatedCharacterPixels}=await import('/src/character.ts'),{defaults}=await import('/src/appearance.ts')
  const mount=document.createElement('div');mount.style.cssText='position:fixed;inset:0;width:512px;height:384px;z-index:20000';document.body.append(mount)
  let point={x:5,y:3},objects=OBJECTS.map(o=>({...o}));const game=createRoom(mount,()=>{},()=>point,()=>objects,{appearance:defaults,action:()=>({type:'sit',target:'desk',label:'Sitting at PC'})})
  const check=(ok,label)=>{if(!ok)throw new Error(label)},pause=()=>new Promise(r=>setTimeout(r,260))
  try{
   await new Promise(r=>game.events.once('postrender',r));const scene=game.scene.getScene('room'),actor=scene.children.list.find(o=>o.type==='Container'),art=actor.list.find(o=>o.type==='Graphics')
   check(actor.x===112&&actor.y===109,'initial action is restored when the renderer loads after sitting');const seat={type:'sit',target:'desk',label:'Sitting at PC'};game.events.emit('room:action',seat)
   check(actor.x===112&&actor.y===109,'desk visual anchor lies in the chair, not at the adjacent floor tile')
   const expected=scene.add.graphics().clear();for(const p of seatedCharacterPixels(defaults,'up')){expected.fillStyle(parseInt(p.color.slice(1),16));expected.fillRect(p.x,p.y,p.w,p.h)}check(JSON.stringify(art.commandBuffer.slice(-expected.commandBuffer.length))===JSON.stringify(expected.commandBuffer),'actual actor uses rear seated artwork');expected.destroy()
   check(point.x===5&&point.y===3,'rendering does not move the accepted position');game.events.emit('room:move',point);check(actor.x===112&&actor.y===109,'unchanged shared snapshots preserve sitting')
   game.events.emit('room:action',null);check(actor.x===176&&actor.y===123,'stand returns to accepted tile')
   game.events.emit('room:action',seat);point={x:6,y:3};game.events.emit('room:move',point);await pause();check(actor.x===208&&actor.y===123,'movement clears pose before normal stepping')
   objects=objects.map(o=>o.id==='desk'?{...o,x:6,y:5}:o);point={x:9,y:6};game.events.emit('room:layout',objects);game.events.emit('room:move',point);game.events.emit('room:action',seat);check(actor.x===240&&actor.y===205,'moved furniture uses its new chair anchor')
   objects=objects.filter(o=>o.id!=='desk');game.events.emit('room:layout',objects);check(actor.x===304&&actor.y===219,'removed furniture clears its visual pose')
  }finally{game.destroy(true);mount.remove()}
 })
 // Both Hall renderers use the same anchor/foreground component; exercise actual hub layout.
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:width===1440?900:844});await page.goto(origin+'/?hall-preview')
  await page.evaluate(async()=>{const {starterHall,HALL_STORAGE_PREFIX}=await import('/src/world/hall-layout.ts');const layout=starterHall();layout.pieces.push({id:'pose-desk',kind:'desk',x:7,y:8});localStorage.setItem(HALL_STORAGE_PREFIX+'guest',JSON.stringify(layout))});await page.reload();await page.locator('.hall-pixel-canvas').waitFor()
  const details=page.getByRole('button',{name:'Servers & channels',exact:true});if(await details.isVisible())await details.click()
  await page.getByText('Hall objects',{exact:true}).click();await page.locator('.hall-object-list').getByRole('button',{name:'Project desk',exact:true}).click()
  const hall=page.getByRole('button',{name:'Hall',exact:true});if(await hall.isVisible())await hall.click()
  await page.locator('.scene-arrival').getByRole('button',{name:'Sit at PC',exact:true}).click()
  const actor=page.locator('.hall-traveler');assert.equal(await actor.getAttribute('data-facing'),'up');assert.equal(await actor.getAttribute('data-pose'),'sit')
  assert.equal(Number(await actor.getAttribute('data-world-x')),272);assert.equal(Number(await actor.getAttribute('data-world-y')),301)
  const matrix=await actor.evaluate(e=>{const m=e.getScreenCTM();return {a:m.a,d:m.d,x:m.e,y:m.f}}),canvas=await page.locator('.hall-pixel-canvas').boundingBox(),scale=Math.min(canvas.width/768,canvas.height/512);assert.ok(Math.abs(matrix.a-scale)<.001&&Math.abs(matrix.d-scale)<.001);assert.ok(Math.abs(matrix.x-(canvas.x+(canvas.width-768*scale)/2+272*scale))<1);assert.ok(Math.abs(matrix.y-(canvas.y+(canvas.height-512*scale)/2+301*scale))<1)
  await page.locator('.hall-pose-foreground').waitFor();await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await actor.getAttribute('data-pose'),'sit')
  await page.screenshot({path:resolve(output,`hall-desk-${width}.png`)})
  await page.locator('.scene-arrival').getByRole('button',{name:'Stand up',exact:true}).click();assert.equal(await actor.getAttribute('data-pose'),'standing');assert.equal(await page.locator('.hall-pose-foreground').count(),0)
 }
 assert.deepEqual(errors,[]);await writeFile(resolve(output,'verification.json'),JSON.stringify({passed:true,checks:['home desk/sofa/bed screenshots and unchanged coordinates','real Phaser seated pixels, repeated snapshots, stand/movement teardown, moved/removed targets','Hall chair alignment and foreground at desktop/phone and reduced motion'],errors},null,2));console.log('PASS furniture anchors, posture, foreground occlusion, snapshot stability and stand/move restoration')
}finally{await browser.close()}

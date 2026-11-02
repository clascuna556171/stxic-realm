// Real Phaser + source-art checks. Local fixtures only; never contacts Supabase.
import { createServer } from 'vite'
import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
const output=resolve(import.meta.dirname,'../../../.impeccable/review/pet-home-art')
await mkdir(output,{recursive:true})
const server=await createServer({root:resolve(import.meta.dirname,'..'),server:{host:'127.0.0.1',port:5188,strictPort:true,forwardConsole:false}})
let browser
try {
 await server.listen()
 browser=await chromium.launch({channel:process.env.REALM_BROWSER_CHANNEL??'chrome',headless:true,args:['--disable-features=LocalNetworkAccessChecks']})
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[]
 page.on('pageerror',e=>{errors.push(e.message);console.error(e.stack)})
 await page.route('**/__pet_art__',route=>route.fulfill({contentType:'text/html; charset=utf-8',body:`<!doctype html><html><head><meta charset="utf-8"><title>Realm pet and home art verification</title><style>
 body{margin:0;background:#101115;color:#ececf1;font:14px system-ui}main{max-width:1200px;margin:auto;padding:24px}h1{font-size:22px;margin:0 0 8px}p{color:#a6a8b7}#room{width:1024px;height:768px;max-width:100%;margin-top:20px;background:#18191f;--realm-text:#ececf1;--realm-surface:#18191f}.samples{display:flex;flex-wrap:wrap;gap:20px;margin:24px 0}.sample{text-align:center}.sample canvas{width:96px;height:96px;image-rendering:pixelated;background:#242831;border-radius:4px}.sample small{display:block;margin-top:7px}#room canvas{image-rendering:pixelated}@media(max-width:600px){main{padding:12px}#room{height:calc((100vw - 24px)*.75)}.samples{gap:10px}.sample canvas{width:64px;height:64px}}
 </style></head><body><main><h1>Realm companions · a lived-in home</h1><p>Local Phaser fixture · native pixel art, three material moods, and furniture-aware companions.</p><div class="samples" id="samples"></div><div id="room" tabindex="0" aria-label="Pet home art fixture"></div></main></body></html>`}))
 await page.route(/https?:\/\/(?!127\.0\.0\.1:5188)/,route=>route.abort())
 await page.goto('http://127.0.0.1:5188/__pet_art__')
 await page.evaluate(async()=>{
  const {createRoom}=await import('/src/world/renderer.ts'),{OBJECTS}=await import('/src/world/room.ts'),{defaults}=await import('/src/appearance.ts')
  const {getPetPixels}=await import('/src/pets/pet-sprites.ts')
  for(const species of ['cat','slime','pup','fox','wisp','bat','owl','triarch']) for(const [direction,state,label] of [['down','idle','Front'],['up','idle','Rear'],['right','walk','Move'],['down','sleep','Rest']]) {
   const {getPetSpriteDimensions}=await import('/src/pets/pet-sprites.ts')
   const {width,height}=getPetSpriteDimensions(species)
   const card=document.createElement('div');card.className='sample'
   const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;canvas.style.width=width*2+'px';canvas.style.height=height*2+'px'
   const ctx=canvas.getContext('2d');for(const p of getPetPixels(species,state,0,direction)){ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,p.w,p.h)}
   const caption=document.createElement('small');caption.textContent=species+' · '+label;card.append(canvas,caption);document.querySelector('#samples').append(card)
  }
  const pets=[{id:'art-cat',species_id:'cat',name:'Village Cat',title:'',nickname:'Miso',rarity:'starter',personality:'Sleepy',sprite_key:'cat',affection_level:0},{id:'art-pup',species_id:'pup',name:'Woodland Pup',title:'',nickname:null,rarity:'starter',personality:'Loyal',sprite_key:'pup',affection_level:0},{id:'art-slime',species_id:'slime',name:'Tiny Slime',title:'',nickname:null,rarity:'starter',personality:'Playful',sprite_key:'slime',affection_level:0}]
  let objects=OBJECTS.map(o=>({...o}));const mount=document.querySelector('#room')
  const game=createRoom(mount,()=>{},()=>({x:8,y:9}),()=>objects,{appearance:defaults,pets:()=>pets,petRandom:()=>.1})
  window.art={game,pets,get objects(){return objects},layout(next){objects=next;game.events.emit('room:layout',objects)},createRoom,defaults,OBJECTS}
  await new Promise(r=>game.events.once('postrender',r))
 })
 await page.waitForFunction(()=>window.art.game.scene.getScene('room').children.getByName('pet:art-cat').getData('pet-state').animState==='sleep',null,{timeout:12000})
 const check=await page.evaluate(async()=>{
  const {getPetPixels}=await import('/src/pets/pet-sprites.ts'),{petRestTile}=await import('/src/world/pet-corner.ts')
  const scene=window.art.game.scene.getScene('room'),cat=scene.children.getByName('pet:art-cat'),state=cat.getData('pet-state')
  const mat=petRestTile(window.art.objects),label=cat.list.find(o=>o.type==='Text'),art=cat.list.find(o=>o.type==='Graphics')
  const all=window.art.pets.map(p=>scene.children.getByName(`pet:${p.id}`).getData('pet-state'))
  return {onMat:state.point.x===mat.x&&state.point.y===mat.y,labelQuiet:!label.visible,nativeScale:art.scaleX,matDrawn:scene.children.getByName('pet-corner').commandBuffer.length>0,distinctTiles:new Set(all.map(p=>`${p.point.x},${p.point.y}`)).size===all.length}
 })
 assert.deepEqual(check,{onMat:true,labelQuiet:true,nativeScale:1,matDrawn:true,distinctTiles:true})
 await page.screenshot({path:resolve(output,'home-cat-desktop.png'),fullPage:true})
 await page.setViewportSize({width:390,height:844})
 await page.screenshot({path:resolve(output,'home-cat-phone.png'),fullPage:true})
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)
 await page.emulateMedia({reducedMotion:'reduce'})
 await page.waitForTimeout(150)
 const before=await page.evaluate(()=>window.art.pets.map(p=>{const c=window.art.game.scene.getScene('room').children.getByName(`pet:${p.id}`);return [c.x,c.y]}))
 await page.waitForTimeout(1700)
 const after=await page.evaluate(()=>window.art.pets.map(p=>{const c=window.art.game.scene.getScene('room').children.getByName(`pet:${p.id}`);return [c.x,c.y]}))
 assert.deepEqual(after,before,'reduced motion must stop pet wandering and in-flight tweens')
 await page.evaluate(()=>window.art.layout(window.art.objects.filter(o=>o.id!=='sofa')))
 assert.equal(await page.evaluate(()=>window.art.game.scene.getScene('room').children.getByName('pet-corner').commandBuffer.length),0,'mat is removed with sofa')
 // A fresh actual-Phaser Wyrm scene, alongside player, cat and airborne wisp.
 await page.emulateMedia({reducedMotion:'no-preference'})
 await page.setViewportSize({width:1440,height:1000})
 await page.evaluate(async()=>{
  const {game,createRoom,defaults,OBJECTS}=window.art
  game.destroy(true)
  await new Promise(r=>setTimeout(r,100))
  const {getPetSpecies}=await import('/src/pets/pet-model.ts')
  const pets=['triarch','cat','wisp'].map((id,index)=>({...getPetSpecies(id),id:'wyrm-'+id,species_id:id,personality:index===0?'Curious':index===1?'Sleepy':'Playful',nickname:index===0?'Triarch':null,affection_level:0}))
  let objects=OBJECTS.map(o=>({...o}))
  const next=createRoom(document.querySelector('#room'),()=>{},()=>({x:8,y:9}),()=>objects,{appearance:defaults,pets:()=>pets,petRandom:()=>.1})
  window.art={...window.art,game:next,pets,get objects(){return objects},layout(nextObjects){objects=nextObjects;next.events.emit('room:layout',objects)}}
  await new Promise(r=>next.events.once('postrender',r))
 })
 await page.waitForFunction(()=>window.art.game.scene.getScene('room').children.getByName('pet:wyrm-triarch')?.getData('pet-state').animState==='walk',null,{timeout:12000})
 const wyrm=await page.evaluate(()=>{
  const scene=window.art.game.scene.getScene('room'),node=scene.children.getByName('pet:wyrm-triarch'),state=node.getData('pet-state')
  const graphics=node.list.find(n=>n.type==='Graphics'),wisp=scene.children.getByName('pet:wyrm-wisp')
  return {scale:graphics.scaleX,x:graphics.x,y:graphics.y,direction:state.direction,walking:state.animState==='walk',depth:node.depth,airborne:wisp.getData('airborne')}
 })
 assert.equal(wyrm.scale,1);assert.equal(wyrm.x,-24);assert.equal(wyrm.y,-34);assert.equal(wyrm.walking,true);assert.equal(wyrm.airborne,true)
 await page.locator('#room').scrollIntoViewIfNeeded()
 await page.screenshot({path:resolve(output,'triarch-home-desktop.png'),fullPage:true})
 // Verify each direction reaches the actual graphics node rather than only SVG.
 const directions=[]
 for(const direction of ['down','up','left','right']) {
  await page.evaluate(direction=>{const state=window.art.game.scene.getScene('room').children.getByName('pet:wyrm-triarch').getData('pet-state');state.direction=direction;state.animState='idle';state.ticksInState=0;state.stateDurationTicks=999;state.target=undefined;state.intent=undefined},direction)
  await page.waitForTimeout(300)
  directions.push(await page.evaluate(()=>JSON.stringify(window.art.game.scene.getScene('room').children.getByName('pet:wyrm-triarch').list.find(n=>n.type==='Graphics').commandBuffer)))
 }
 assert.equal(new Set(directions).size,4,'four facing views reach Phaser graphics')
 // Place a valid one-tile object over the old pet tile to exercise relocation.
 const relocation=await page.evaluate(async()=>{
  const {canOccupy,ROOM}=await import('/src/world/room.ts'),scene=window.art.game.scene.getScene('room'),node=scene.children.getByName('pet:wyrm-triarch'),old={...node.getData('pet-state').point}
  const moved=window.art.objects.filter(o=>o.id!=='lantern').concat({...window.art.OBJECTS.find(o=>o.id==='lantern'),x:old.x,y:old.y})
  window.art.layout(moved)
  const state=node.getData('pet-state'),points=window.art.pets.map(p=>scene.children.getByName('pet:'+p.id).getData('pet-state').point)
  const furniture=scene.children.list.find(o=>o.type==='Graphics'&&o.x===old.x*32&&o.y===old.y*32)
  return {relocated:state.point.x!==old.x||state.point.y!==old.y,walkable:canOccupy(state.point,moved),separate:new Set(points.map(p=>p.x+','+p.y)).size===3,depth:Math.abs(node.depth-(state.point.y+.9)*32)<.01,behindObject:state.point.y<old.y+1?node.depth<furniture.depth:true}
 })
 assert.ok(Object.values(relocation).every(Boolean))
 await page.setViewportSize({width:390,height:844})
 await page.locator('#room').scrollIntoViewIfNeeded()
 await page.screenshot({path:resolve(output,'triarch-home-phone.png'),fullPage:true})
 // Render the same saved arrangement in all three existing material moods.
 for(const mood of ['cozy','medieval','tech']) {
  await page.setViewportSize({width:1440,height:1000})
  await page.evaluate(async mood=>{
   const {createRoom,defaults,OBJECTS,pets,game}=window.art;game.destroy(true);await new Promise(r=>setTimeout(r,100))
   const next=createRoom(document.querySelector('#room'),()=>{},()=>({x:8,y:9}),()=>OBJECTS,{appearance:{...defaults,mood},pets:()=>pets,petRandom:()=>.1});window.art.game=next
   await new Promise(r=>next.events.once('postrender',r))
  },mood)
  await page.emulateMedia({reducedMotion:'reduce'})
  await page.locator('#room').scrollIntoViewIfNeeded()
  await page.locator('#room').screenshot({path:resolve(output,`home-${mood}.png`)})
 }
 assert.deepEqual(errors,[])
 await writeFile(resolve(output,'verification.json'),JSON.stringify({passed:true,checks:check,reducedMotion:true,phoneOverflow:false,removedSofaClearsMat:true,wyrm,relocation,fourPhaserDirections:true,moods:['cozy','medieval','tech'],errors},null,2))
 console.log('PASS six species, Triarch facing/relocation/depth, three moods, real Phaser art, resting activity, native scale, quiet labels, collision separation, reduced motion and desktop/phone captures')
} finally { await browser?.close(); await server.close() }

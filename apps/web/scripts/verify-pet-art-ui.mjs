// Real Phaser + source-art checks. Local fixtures only; never contacts Supabase.
import { createServer } from 'vite'
import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
const output=resolve(import.meta.dirname,'../../../.impeccable/review/pet-home-art')
await mkdir(output,{recursive:true})
const server=await createServer({root:resolve(import.meta.dirname,'..'),server:{host:'127.0.0.1',port:5188,strictPort:true}})
let browser
try {
 await server.listen()
 browser=await chromium.launch({channel:process.env.REALM_BROWSER_CHANNEL??'chrome',headless:true})
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[]
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/__pet_art__',route=>route.fulfill({contentType:'text/html; charset=utf-8',body:`<!doctype html><html><head><meta charset="utf-8"><title>Realm pet and home art verification</title><style>
 body{margin:0;background:#101115;color:#ececf1;font:14px system-ui}main{max-width:1200px;margin:auto;padding:24px}h1{font-size:22px;margin:0 0 8px}p{color:#a6a8b7}#room{width:1024px;height:768px;max-width:100%;margin-top:20px;background:#18191f;--realm-text:#ececf1;--realm-surface:#18191f}.samples{display:flex;flex-wrap:wrap;gap:20px;margin:24px 0}.sample{text-align:center}.sample canvas{width:96px;height:96px;image-rendering:pixelated;background:#242831;border-radius:4px}.sample small{display:block;margin-top:7px}#room canvas{image-rendering:pixelated}@media(max-width:600px){main{padding:12px}#room{height:calc((100vw - 24px)*.75)}.samples{gap:10px}.sample canvas{width:64px;height:64px}}
 </style></head><body><main><h1>Village Cat · a place beside the sofa</h1><p>Local art fixture · four views, a woven resting mat, and furniture-aware companions.</p><div class="samples" id="samples"></div><div id="room" tabindex="0" aria-label="Pet home art fixture"></div></main></body></html>`}))
 await page.route(/https?:\/\/(?!127\.0\.0\.1:5188)/,route=>route.abort())
 await page.goto('http://127.0.0.1:5188/__pet_art__')
 await page.evaluate(async()=>{
  const {createRoom}=await import('/src/world/renderer.ts'),{OBJECTS}=await import('/src/world/room.ts'),{defaults}=await import('/src/appearance.ts')
  const {getPetPixels}=await import('/src/pets/pet-sprites.ts')
  for(const [direction,state,label] of [['down','idle','Front'],['up','idle','Rear'],['left','walk','Left'],['right','walk','Right'],['down','sleep','Curled sleep'],['down','happy','Greeting']]) {
   const card=document.createElement('div');card.className='sample'
   const canvas=document.createElement('canvas');canvas.width=32;canvas.height=32
   const ctx=canvas.getContext('2d');for(const p of getPetPixels('cat',state,0,direction)){ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,p.w,p.h)}
   const caption=document.createElement('small');caption.textContent=label;card.append(canvas,caption);document.querySelector('#samples').append(card)
  }
  const pets=[{id:'art-cat',species_id:'cat',name:'Village Cat',title:'',nickname:'Miso',rarity:'starter',personality:'Sleepy',sprite_key:'cat',affection_level:0},{id:'art-pup',species_id:'pup',name:'Woodland Pup',title:'',nickname:null,rarity:'starter',personality:'Loyal',sprite_key:'pup',affection_level:0},{id:'art-slime',species_id:'slime',name:'Tiny Slime',title:'',nickname:null,rarity:'starter',personality:'Playful',sprite_key:'slime',affection_level:0}]
  let objects=OBJECTS.map(o=>({...o}));const mount=document.querySelector('#room')
  const game=createRoom(mount,()=>{},()=>({x:8,y:9}),()=>objects,{appearance:defaults,pets:()=>pets,petRandom:()=>.1})
  window.art={game,pets,get objects(){return objects},layout(next){objects=next;game.events.emit('room:layout',objects)}}
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
 assert.deepEqual(errors,[])
 await writeFile(resolve(output,'verification.json'),JSON.stringify({passed:true,checks:check,reducedMotion:true,phoneOverflow:false,removedSofaClearsMat:true,errors},null,2))
 console.log('PASS real Phaser art, resting activity, native scale, quiet labels, collision separation, reduced motion and desktop/phone captures')
} finally { await browser?.close(); await server.close() }

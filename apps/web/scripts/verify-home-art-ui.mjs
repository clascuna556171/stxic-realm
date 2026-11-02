// Local production-renderer fixture; never contacts a hosted backend.
import {createServer} from 'vite'
import {chromium} from 'playwright'
import {mkdir,writeFile} from 'node:fs/promises'
import {resolve} from 'node:path'
import assert from 'node:assert/strict'
const phase=process.argv.includes('--before')?'before':'after'
const output=resolve('.impeccable/review/home-art');await mkdir(output,{recursive:true})
const server=await createServer({root:resolve('apps/web'),server:{host:'127.0.0.1',port:5190,strictPort:true,forwardConsole:false}})
let browser
try{
 await server.listen();browser=await chromium.launch({channel:'chrome'})
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[]
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/*',r=>new URL(r.request().url()).origin==='http://127.0.0.1:5190'?r.continue():r.abort())
 await page.goto('http://127.0.0.1:5190/?room-preview');await page.locator('.room-canvas canvas').waitFor()
 await page.screenshot({path:resolve(output,`${phase}-home-app.png`)})
 await page.evaluate(()=>{const host=document.createElement('div');host.id='review';host.style.cssText='position:fixed;inset:0;z-index:30000;background:#101115;display:grid;place-items:center';const mount=document.createElement('div');mount.id='authored-home';mount.style.cssText='width:min(1024px,100vw);aspect-ratio:4/3;image-rendering:pixelated';host.append(mount);document.body.append(host)})
 for(const mood of ['cozy','medieval','tech']){
  await page.setViewportSize({width:1440,height:1000})
  await page.emulateMedia({reducedMotion:'reduce'})
  await page.evaluate(async mood=>{
   if(window.homeArt){window.homeArt.game.destroy(true);await new Promise(r=>setTimeout(r,100))}
   const {createRoom}=await import('/src/world/renderer.ts'),{OBJECTS}=await import('/src/world/room.ts'),{defaults}=await import('/src/appearance.ts'),{getPetSpecies}=await import('/src/pets/pet-model.ts')
   const people=[{id:'rowan',name:'Rowan',x:7,y:8,sequence:1,character:{...defaults,outfit:'medieval',hairStyle:'curly'}},{id:'ash',name:'Ash',x:9,y:9,sequence:1,character:{...defaults,outfit:'tech',hairStyle:'long'}}]
   const pets=['cat','triarch','wisp'].map(id=>({...getPetSpecies(id),id:'home-'+id,species_id:id,affection_level:0,personality:'Sleepy'}))
   let objects=OBJECTS.map(o=>({...o})),point={x:8,y:9}
   const game=createRoom(document.querySelector('#authored-home'),()=>{},()=>point,()=>objects,{appearance:{...defaults,mood},people:()=>people,pets:()=>pets,petRandom:()=>.1})
   window.homeArt={game,layout(next){objects=next;game.events.emit('room:layout',next)},move(next){point=next;game.events.emit('room:move',next)}}
   await new Promise(r=>game.events.once('postrender',r))
  },mood)
  await page.waitForTimeout(300)
  await page.locator('#authored-home').screenshot({path:resolve(output,`${phase}-${mood}-desktop.png`)})
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(150)
  await page.screenshot({path:resolve(output,`${phase}-${mood}-phone.png`)})
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)
  if(phase==='after'){
   const textileSync=await page.evaluate(async mood=>{
    const {OBJECTS}=await import('/src/world/room.ts'),{roomTextilePixels,composedRoomPixels}=await import('/src/world/art.ts')
    const scene=window.homeArt.game.scene.getScene('room'),node=scene.children.getByName('room-textiles')
    const check=objects=>{
     window.homeArt.layout(objects)
     const expected=scene.add.graphics().clear()
     for(const p of roomTextilePixels(mood,objects)){expected.fillStyle(parseInt(p.color.slice(1),16));expected.fillRect(p.x,p.y,p.w,p.h)}
     const match=JSON.stringify(node.commandBuffer)===JSON.stringify(expected.commandBuffer);expected.destroy();return match
    }
    // Legacy seven-piece layouts, a relocated sofa, removal, and restoration.
    const legacy=OBJECTS.slice(0,7),moved=OBJECTS.map(o=>o.id==='sofa'?{...o,x:2,y:6}:o)
    const result=[check(legacy),check(moved),check(OBJECTS.filter(o=>o.id!=='sofa'&&o.id!=='bed')),node.commandBuffer.length===0,check(OBJECTS)]
    const floor=roomTextilePixels(mood,OBJECTS),composed=composedRoomPixels(mood,OBJECTS)
    result.push(floor.every(p=>composed.some(q=>JSON.stringify(p)===JSON.stringify(q))))
    return result.every(Boolean)
   },mood)
   assert.equal(textileSync,true,'Phaser and composed preview follow legacy/edited/removed/restored layouts')
   const reachable=await page.evaluate(async()=>{const {OBJECTS,ROOM,canOccupy}=await import('/src/world/room.ts'),{findRoute}=await import('/src/world/navigation.ts');return OBJECTS.every(o=>findRoute(ROOM.spawn,{object:o,label:o.name,id:o.id},p=>canOccupy(p,OBJECTS))!==null)})
   assert.equal(reachable,true,'all starter objects reachable from entrance')
   for(const id of ['desk','sofa','bed']){
    await page.evaluate(async id=>{const {OBJECTS,ROOM,canOccupy}=await import('/src/world/room.ts'),{findRoute}=await import('/src/world/navigation.ts');const object=OBJECTS.find(o=>o.id===id),route=findRoute(ROOM.spawn,{object,label:id,id},p=>canOccupy(p,OBJECTS));window.homeArt.move(route.at(-1)??ROOM.spawn);window.homeArt.game.events.emit('room:action',{target:id,type:id==='bed'?'rest':'sit',label:id})},id)
    await page.waitForTimeout(300);await page.locator('#authored-home').screenshot({path:resolve(output,`${mood}-${id}-phone.png`)})
    await page.evaluate(()=>window.homeArt.game.events.emit('room:action',null))
   }
  }
 }
 if(phase==='after'){
  await page.emulateMedia({reducedMotion:'no-preference'});await page.waitForTimeout(600)
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'))})
  await page.waitForTimeout(450)
  const snapshot=()=>page.evaluate(()=>{const scene=window.homeArt.game.scene.getScene('room');return scene.children.list.filter(n=>n.name?.startsWith('pet:')).map(n=>({point:n.getData('pet-state').point,state:n.getData('pet-state').animState,x:n.x,y:n.y}))})
  const hidden=await snapshot();await page.waitForTimeout(900);assert.deepEqual(await snapshot(),hidden,'hidden room pauses companion presentation')
  await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'))})
 }
 await page.evaluate(()=>window.homeArt.game.destroy(true));await page.waitForTimeout(150)
 await page.emulateMedia({reducedMotion:'no-preference'});await page.waitForTimeout(150)
 if(phase==='after')for(const mood of ['cozy','medieval','tech']){
  await page.evaluate(async mood=>{const {APPEARANCE_KEY,defaults}=await import('/src/appearance.ts');localStorage.setItem(APPEARANCE_KEY,JSON.stringify({...defaults,mood}))},mood)
  for(const width of [1440,390]){
   await page.setViewportSize({width,height:width===1440?1000:844})
   await page.goto('http://127.0.0.1:5190/?room-studio');await page.locator('.room-canvas canvas').waitFor()
   await page.screenshot({path:resolve(output,`${mood}-studio-${width}.png`),fullPage:true})
   await page.locator('.room-object-list button').filter({hasText:'Sofa'}).click()
   await page.getByLabel('Column',{exact:true}).fill('3')
   await page.getByRole('button',{name:'Move item',exact:true}).click()
   assert.equal(await page.getByLabel('Column',{exact:true}).inputValue(),'3')
   await page.getByRole('button',{name:'Undo',exact:true}).click()
   assert.equal(await page.getByLabel('Column',{exact:true}).inputValue(),'4')
   await page.getByRole('button',{name:'Redo',exact:true}).click()
   assert.equal(await page.getByLabel('Column',{exact:true}).inputValue(),'3')
   await page.getByRole('button',{name:'Undo',exact:true}).click()
   await page.goto('http://127.0.0.1:5190/?room-preview');await page.locator('.room-canvas canvas').waitFor()
   await page.screenshot({path:resolve(output,`${mood}-home-${width}.png`),fullPage:true})
  }
 }
 assert.deepEqual(errors,[])
 await writeFile(resolve(output,`${phase}-verification.json`),JSON.stringify({passed:true,moods:['cozy','medieval','tech'],residents:3,pets:['cat','triarch','wisp'],desktop:[1440,1000],phone:[390,844],errors},null,2))
 console.log(`PASS ${phase}: three moods, desktop/phone production Phaser, three residents and companions, teardown${phase==='after'?', entrance reachability and all furniture poses':''}`)
}finally{await browser?.close();await server.close()}

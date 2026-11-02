// Original source-art contact sheets plus actual app and Phaser fixture. No backend calls.
import {chromium} from 'playwright'
import {mkdir,writeFile,readFile} from 'node:fs/promises'
import {resolve} from 'node:path'
import assert from 'node:assert/strict'
import {createServer} from 'vite'
import {stripTypeScriptTypes} from 'node:module'
const phase=process.argv.includes('--before')?'before':'after'
const sheetsOnly=process.argv.includes('--sheets-only')
const origin='http://127.0.0.1:5189'
const server=await createServer({root:resolve('apps/web'),server:{host:'127.0.0.1',port:5189,strictPort:true,forwardConsole:false}});await server.listen()
const output=resolve('.impeccable/review/character-art');await mkdir(output,{recursive:true})
const browser=await chromium.launch({channel:'chrome',args:['--disable-features=LocalNetworkAccessChecks']})
const errors=[]
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}})
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort())
 if(phase==='before'&&sheetsOnly){
  const source=await readFile(resolve(output,'before-character.ts'),'utf8')
  const code=stripTypeScriptTypes(source.replace("'./appearance.ts'","'/src/appearance.ts'"))
  await page.route('**/__before-character.js',r=>r.fulfill({contentType:'text/javascript',body:code}))
 }
 await page.goto(origin+'/?appearance');await page.locator('.character-stage svg.pixel-character').waitFor()
 if(!sheetsOnly)await page.screenshot({path:resolve(output,`${phase}-studio-desktop.png`)})
 await page.evaluate(async({phase,sheetsOnly})=>{
  const art=await import(phase==='before'&&sheetsOnly?'/__before-character.js':'/src/character.ts'),a=await import('/src/appearance.ts')
  window.characterReview={art,a}
  const canvas=document.createElement('canvas');canvas.id='sheet';document.body.replaceChildren(canvas)
 },{phase,sheetsOnly})
 for(const outfit of ['everyday','medieval','tech'])for(const scale of [1,3]){
  await page.evaluate(({outfit,scale})=>{
   const {art,a}=window.characterReview,canvas=document.querySelector('#sheet')
   const states=['idle','blink','breath','walk A','walk B','seated','rest'],dirs=['down','up','left','right']
   canvas.width=(112+states.length*dirs.length*48)*scale;canvas.height=(32+16*82)*scale
   const ctx=canvas.getContext('2d');ctx.scale(scale,scale);ctx.fillStyle='#202630';ctx.fillRect(0,0,canvas.width,canvas.height)
   ctx.font='9px monospace';ctx.fillStyle='#ede7d9';ctx.fillText(`${outfit} · 48×64 · ${scale}× nearest-neighbor`,8,12)
   for(let row=0;row<16;row++){
    const hairStyle=a.hairStyles[Math.floor(row/4)],accessory=a.accessories[row%4]
    const look={...a.defaults,outfit,hairStyle,accessory,skin:a.skins[row%5],hair:a.hairs[(row*3)%5],eyes:Object.keys(a.eyeColors)[row%4]}
    const y=32+row*82;ctx.fillStyle='#ede7d9';ctx.fillText(hairStyle,4,y+20);ctx.fillText(accessory,4,y+32)
    dirs.forEach((dir,d)=>states.forEach((state,s)=>{
     const x=112+(d*states.length+s)*48
     ctx.fillStyle=row%2?'#2a3039':'#242a33';ctx.fillRect(x,y,48,64)
     let pixels=state==='seated'?art.seatedCharacterPixels(look,dir):state==='rest'&&art.restingCharacterPixels?art.restingCharacterPixels(look,dir):art.characterPixels(look,dir,state==='walk A'?1:state==='walk B'?2:0)
     if((state==='blink'||state==='breath')&&art.idleCharacterPixels)pixels=art.idleCharacterPixels(look,dir,state==='blink'?0:3)
     // The baseline blink lived in a separate room overlay, not character.ts.
     if(state==='blink'&&!art.idleCharacterPixels&&dir!=='up'){
      const eyes=dir==='down'?[15,29]:[dir==='left'?16:29]
      pixels=[...pixels,...eyes.flatMap(x=>[{x,y:21,w:dir==='down'?4:3,h:dir==='down'?2:3,color:look.skin},{x,y:dir==='down'?23:24,w:dir==='down'?4:3,h:1,color:'#181520'}])]
     }
     for(const p of pixels){ctx.fillStyle=p.color;ctx.fillRect(x+p.x,y+p.y,p.w,p.h)}
     ctx.fillStyle='#bdc6cf';ctx.fillText(`${dir[0]} ${state}`,x+1,y+74)
    }))
   }
   canvas.style.cssText=`width:${canvas.width}px;height:${canvas.height}px;image-rendering:pixelated`;document.body.style.cssText='margin:0'
  },{outfit,scale})
  // Export the canvas directly: tall element screenshots can crop at the scroll origin.
  const png=await page.locator('#sheet').evaluate(c=>c.toDataURL('image/png').split(',')[1])
  await writeFile(resolve(output,`${phase}-${outfit}-${scale}x.png`),Buffer.from(png,'base64'))
 }
 if(sheetsOnly){console.log(`PASS ${phase} native/3× contact-sheet exports`)}else{
 // Render the production Phaser scene alongside its real furniture, multiple residents and companions.
 await page.goto(origin+'/?room-preview');await page.locator('.room-canvas canvas').waitFor()
 await page.screenshot({path:resolve(output,`${phase}-home-desktop.png`)})
 await page.evaluate(async()=>{
  const {createRoom}=await import('/src/world/renderer.ts'),{OBJECTS}=await import('/src/world/room.ts'),{defaults}=await import('/src/appearance.ts'),{getPetSpecies}=await import('/src/pets/pet-model.ts')
  const host=document.createElement('div');host.id='character-room';host.style.cssText='position:fixed;inset:0;z-index:30000;background:#101115;display:grid;place-items:center'
  const mount=document.createElement('div');mount.style.cssText='width:min(1024px,100vw);aspect-ratio:4/3;image-rendering:pixelated';host.append(mount);document.body.append(host)
  const people=[{id:'guest-one',name:'Rowan',x:7,y:8,sequence:1,character:{...defaults,skin:'#493022',hairStyle:'curly',outfit:'medieval'}},{id:'guest-two',name:'Ash',x:9,y:9,sequence:1,character:{...defaults,hairStyle:'long',outfit:'tech',accessory:'headphones'}}]
  const pets=['cat','triarch','wisp'].map(id=>({...getPetSpecies(id),id:'character-'+id,species_id:id,affection_level:0,personality:'Sleepy'}))
  let point={x:8,y:9};const game=createRoom(mount,()=>{},()=>point,()=>OBJECTS,{appearance:defaults,people:()=>people,pets:()=>pets,petRandom:()=>.1})
  window.characterFixture={game,setPoint(p){point=p;game.events.emit('room:move',p)}}
  await new Promise(r=>game.events.once('postrender',r))
 })
 await page.waitForTimeout(700)
 await page.screenshot({path:resolve(output,`${phase}-phaser-residents-desktop.png`)})
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:resolve(output,`${phase}-phaser-residents-phone.png`)})
 await page.evaluate(()=>window.characterFixture.game.destroy(true))
 await page.goto(origin+'/?appearance');await page.locator('.character-stage svg.pixel-character').waitFor()
 await page.screenshot({path:resolve(output,`${phase}-studio-phone.png`),fullPage:true})
 if(phase==='after'){
  await page.emulateMedia({reducedMotion:'reduce'})
  for(const [direction,label] of [['down','Front'],['up','Rear'],['left','Left'],['right','Right']]){
   await page.getByRole('button',{name:label,exact:true}).click()
   for(const pose of ['idle','walking','seated','resting']){
    await page.getByLabel('Preview pose',{exact:true}).selectOption(pose)
    const match=await page.evaluate(async({direction,pose})=>{
     const art=await import('/src/character.ts'),{readAppearance}=await import('/src/appearance.ts'),a=readAppearance()
     const expected=pose==='seated'?art.seatedCharacterPixels(a,direction):pose==='resting'?art.restingCharacterPixels(a,direction):art.characterPixels(a,direction)
     const actual=[...document.querySelectorAll('.character-stage .pixel-character rect')].map(r=>({x:+r.getAttribute('x'),y:+r.getAttribute('y'),w:+r.getAttribute('width'),h:+r.getAttribute('height'),color:r.getAttribute('fill')}))
     return JSON.stringify(actual)===JSON.stringify(expected)
    },{direction,pose})
    assert.equal(match,true,`Studio ${direction}/${pose} shares the renderer art`)
   }
  }
  await page.emulateMedia({reducedMotion:'no-preference'})
  await page.getByLabel('Preview pose',{exact:true}).selectOption('idle')
  await page.getByRole('button',{name:'Front',exact:true}).click()
  const svg=page.locator('.character-stage .pixel-character')
  const samples=new Set()
  for(let i=0;i<7;i++){samples.add(await svg.innerHTML());await page.waitForTimeout(250)}
  assert.ok(samples.size>1,'Studio idle breath animates')
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'))})
  const hidden=await svg.innerHTML();await page.waitForTimeout(400);assert.equal(await svg.innerHTML(),hidden,'hidden Studio pauses')
  await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'))})
  await page.emulateMedia({reducedMotion:'reduce'})
  const still=await svg.innerHTML();await page.waitForTimeout(400);assert.equal(await svg.innerHTML(),still,'reduced motion Studio pauses')
 }
 assert.deepEqual(errors,[])
 await writeFile(resolve(output,`${phase}-verification.json`),JSON.stringify({passed:true,phase,errors,coverage:'48 appearance rows × 4 directions × 7 states; native and 3×; actual Studio, Home, Phaser residents with pets desktop/390px',checks:phase==='after'?['16 Studio direction/pose comparisons against shared source','idle animation changes','hidden document pauses Studio','reduced motion pauses Studio']:[]},null,2))
 console.log(`PASS ${phase} character sheets and actual Phaser desktop/phone captures`)
 }
}finally{await browser.close();await server.close()}

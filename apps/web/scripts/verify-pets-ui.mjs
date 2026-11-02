// Isolated real-component browser regressions. Remote requests are blocked; no live backend is used.
import { createServer } from 'vite'
import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
const outputDir=resolve(import.meta.dirname,'../../../.impeccable/review/pets-fixes')
await mkdir(outputDir,{recursive:true})
const output=[]
const log=(label,value)=>{output.push({label,value});console.log(label,JSON.stringify(value))}
const server = await createServer({root:resolve(import.meta.dirname,'..'),server:{host:'127.0.0.1',port:5187,strictPort:true}})
let browser
try {
 await server.listen()
 // Isolated localhost fixture: allow Vite's development websocket in Chrome.
 browser = await chromium.launch({channel:'chrome',headless:true,args:['--disable-features=LocalNetworkAccessChecks']})
 const page = await browser.newPage({viewport:{width:1200,height:800}})
 await page.route('**/__pets_review__', route=>route.fulfill({contentType:'text/html',body:'<html><body><button id="outside">Outside control</button><div id="root"></div></body></html>'}))
 await page.route(/https:\/\/.*/, route=>route.abort())
 await page.goto('http://127.0.0.1:5187/__pets_review__')
 await page.evaluate(async()=>{
  const refresh=(await import('/@react-refresh')).default;refresh.injectIntoGlobalHook(window)
  window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true
  const reactModule=await import('/node_modules/.vite/deps/react.js'); const React=reactModule.default??reactModule
  const clientModule=await import('/node_modules/.vite/deps/react-dom_client.js'); const {createRoot}=clientModule.default??clientModule
  const {ProfileBannerPet}=await import('/src/ProfileBannerPet.tsx')
  const {WildlifeEncounterModal}=await import('/src/world/WildlifeEncounterModal.tsx')
  const {getPetSpecies}=await import('/src/pets/pet-model.ts')
  await import('/src/styles.css'); await import('/src/modern-shell.css')
  window.review={React,root:createRoot(document.querySelector('#root')),ProfileBannerPet,WildlifeEncounterModal,getPetSpecies}
  const pet={...getPetSpecies('cat'),id:'review-cat',species_id:'cat',personality:'Curious',nickname:null,affection_level:0}
  const elem=React.createElement(ProfileBannerPet,{pet})
  window.review.root.render(React.createElement('div',{style:{position:'absolute',top:'2400px',height:'120px',width:'500px'}},elem))
 })
 await page.waitForSelector('.profile-banner-pet',{state:'attached'})
 const before=await page.locator('.profile-banner-pet').getAttribute('style')
 await page.waitForTimeout(4050)
 const after=await page.locator('.profile-banner-pet').getAttribute('style')
 assert.equal(after,before,'offscreen banner must not wander')
 log('Offscreen banner paused',true)
 await page.evaluate(()=>{document.querySelector('#root > div').style.top='16px'})
 await page.waitForTimeout(200)
 assert.equal(await page.locator('canvas').count(),0,'banner must not create a canvas')
 await page.emulateMedia({reducedMotion:'reduce'})
 await page.waitForTimeout(150)
 const reducedBefore=await page.locator('.profile-banner-pet svg').innerHTML()
 await page.waitForTimeout(1000)
 assert.equal(reducedBefore,await page.locator('.profile-banner-pet svg').innerHTML(),'reduced-motion sprite must stay static')
 log('Reduced-motion sprite stable',true)
 await page.evaluate(()=>{
  const {React,root,WildlifeEncounterModal,getPetSpecies}=window.review
  document.querySelector('#outside').focus()
  const encounter={...getPetSpecies('fox'),id:'review-fox',species_id:'fox',status:'active',created_at:new Date().toISOString()}
  window.review.closed=0
  root.render(React.createElement(WildlifeEncounterModal,{encounter,onClose:()=>{window.review.closed++;window.review.root.render(null)},onBonded:()=>{}}))
 })
 await page.waitForSelector('dialog[open]')
 assert.equal(await page.evaluate(()=>!!document.activeElement.closest('dialog[open]')),true,'opening dialog must move focus inside')
 await page.locator('dialog[open] button').last().focus()
 await page.keyboard.press('Tab')
 assert.equal(await page.evaluate(()=>document.activeElement===document.querySelector('dialog[open] button')),true,'Tab must wrap inside dialog')
 await page.keyboard.press('Shift+Tab')
 assert.equal(await page.evaluate(()=>document.activeElement===document.querySelectorAll('dialog[open] button')[1]),true,'Shift+Tab must wrap backwards')
 for(const width of [1200,390,320]) {
  await page.setViewportSize({width,height:844})
  await page.screenshot({path:resolve(outputDir,`wildlife-${width}.png`)})
  const sizes=await page.locator('dialog[open]').evaluate(el=>({width:el.getBoundingClientRect().width,scroll:el.scrollWidth,client:el.clientWidth}))
  assert.ok(sizes.width<=width && sizes.scroll<=sizes.client+1,`modal must fit ${width}px viewport`)
 }
 log('Native modal focus, Tab/Shift+Tab and three viewport sizes',true)
 await page.keyboard.press('Escape')
 await page.waitForFunction(()=>window.review.closed===1 && document.activeElement.id==='outside')
 log('Escape dismissal restores focus',true)
 // Exercise real collection components with a local, explicitly fake RPC boundary.
 await page.evaluate(async()=>{
  await import('/src/account-profile.css')
  const {PetCollection}=await import('/src/pets/PetCollection.tsx'),{client}=await import('/src/data.ts'),{PET_SPECIES_CATALOG}=await import('/src/pets/pet-model.ts')
  const owned=PET_SPECIES_CATALOG.map(sp=>({...sp,id:'collection-'+sp.id,user_id:'owner',species_id:sp.id,personality:sp.id==='triarch'?'Loyal':'Curious',nickname:sp.id==='triarch'?'Triarch the First Wyrm':sp.id==='fox'?'Bramble-of-the-Woodlands':null,affection_level:4,is_starter:sp.id==='cat',acquired_at:'2026-11-02T00:00:00Z'}))
  const full={user_id:'owner',own:true,is_founder:true,species:PET_SPECIES_CATALOG,owned,equipment:{banner_pet_id:owned[0].id,house_pet_ids:owned.slice(0,3).map(p=>p.id),banner_pet:owned[0],house_pets:owned.slice(0,3)},active_encounter:null}
  const empty={...full,is_founder:false,owned:[],equipment:{banner_pet_id:null,house_pet_ids:[],banner_pet:null,house_pets:[]}}
  window.collection={full,empty,mode:'full',callbacks:0,delayed:false,render(user='owner',isOwn=true,notifyOnLoad=true){
   window.review.root.render(window.review.React.createElement('main',{className:'account-profile-page',style:{padding:16,maxWidth:900,margin:'auto',display:'block'}},window.review.React.createElement(PetCollection,{userId:user,isOwn,notifyOnLoad,roomObjects:[{id:'plant'},{id:'potted-fern'},{id:'sofa'}],onBannerPetChange:()=>window.collection.callbacks++})))
  }}
  client.rpc=async(name,args)=>{
   const c=window.collection
   if(c.mode==='fail')return {data:null,error:{message:'Temporary companion connection failure.'}}
   if(c.mode==='delay') {c.delayed=true;return new Promise(resolve=>{c.release=()=>resolve({data:c.full,error:null})})}
   if(name==='equip_pet') {const key=args.p_slot==='banner'?'banner_pet_id':'house_pet_ids';if(key==='banner_pet_id'){c.full.equipment.banner_pet_id=args.p_pet_ids[0]??null;c.full.equipment.banner_pet=owned.find(p=>p.id===args.p_pet_ids[0])??null}return {data:structuredClone(c.full),error:null}}
   return {data:structuredClone(c.mode==='empty'?c.empty:c.full),error:null}
  }
  window.collection.render()
 })
 await page.getByRole('button',{name:'Inspect Village Cat',exact:true}).waitFor()
 await page.getByRole('button',{name:'Inspect Crystal Wisp',exact:true}).focus();await page.keyboard.press('Enter')
 assert.equal(await page.getByRole('button',{name:'Inspect Crystal Wisp',exact:true}).getAttribute('aria-pressed'),'true')
 const collectionSizes=[]
 for(const width of [1200,390,320]) {
  await page.setViewportSize({width,height:900})
  await page.screenshot({path:resolve(outputDir,`collection-${width}.png`),fullPage:true})
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)
  const wrong=await page.locator('.pet-card .pet-pixel-sprite').evaluateAll(nodes=>nodes.some(n=>n.getBoundingClientRect().width!==Number(n.getAttribute('width'))))
  assert.equal(wrong,false,'pixel art uses its intentional integer scale')
  collectionSizes.push(width)
 }
 await page.getByRole('button',{name:'Wildlife Journal',exact:true}).click()
 await page.getByText('Forest: 2/2',{exact:true}).waitFor()
 await page.screenshot({path:resolve(outputDir,'journal-phone.png'),fullPage:true})
 await page.evaluate(()=>{window.collection.mode='empty';window.collection.render('empty-owner')})
 await page.getByRole('button',{name:'Adopt Village Cat',exact:true}).waitFor()
 assert.equal(await page.getByRole('region',{name:'Adopt a starter pet'}).count(),1)
 await page.evaluate(()=>{window.collection.mode='fail';window.collection.render('failed-owner')})
 await page.getByRole('button',{name:'Try loading companions again',exact:true}).waitFor()
 assert.equal(await page.getByRole('button',{name:'Adopt Village Cat',exact:true}).count(),0,'failed reads cannot offer fabricated adoption state')
 await page.screenshot({path:resolve(outputDir,'collection-error-phone.png'),fullPage:true})
 await page.evaluate(()=>{window.collection.mode='empty'})
 await page.getByRole('button',{name:'Try loading companions again',exact:true}).click()
 await page.getByRole('button',{name:'Adopt Village Cat',exact:true}).waitFor()
 await page.evaluate(()=>{window.collection.mode='delay';window.collection.render('late-owner')})
 await page.waitForFunction(()=>window.collection.delayed)
 await page.evaluate(()=>{window.collection.mode='empty';window.collection.render('visitor',false)})
 await page.getByText('This resident has not welcomed any companions yet.',{exact:true}).waitFor()
 const callbacksBefore=await page.evaluate(()=>window.collection.callbacks)
 await page.evaluate(()=>window.collection.release())
 await page.waitForTimeout(150)
 assert.equal(await page.evaluate(()=>window.collection.callbacks),callbacksBefore,'late read cannot publish old equipment callbacks')
 assert.equal(await page.getByRole('button',{name:'Inspect Triarch the First Wyrm',exact:true}).count(),0)
 assert.equal(await page.getByRole('region',{name:'Adopt a starter pet'}).count(),0,'visitor has no adoption controls')
 log('Collection keyboard, integer art scales, phone layouts, saved habitat context, empty/error/retry and stale-response protection',{collectionSizes,passed:true})
 const profileCallbacks=await page.evaluate(()=>{const c=window.collection;c.mode='full';const before=c.callbacks;c.render('profile-owner',true,false);return before})
 await page.getByRole('button',{name:'Pet Collection (8)',exact:true}).click()
 await page.getByRole('button',{name:'Inspect Village Cat',exact:true}).waitFor()
 assert.equal(await page.evaluate(()=>window.collection.callbacks),profileCallbacks,'profile projection remains authoritative over initial collection reads')
 await page.getByRole('button',{name:'On banner',exact:true}).click()
 await page.getByText('Village Cat removed from profile banner.',{exact:true}).waitFor()
 assert.equal(await page.evaluate(()=>window.collection.callbacks),profileCallbacks+1,'successful mutations still publish authoritative equipment')
 log('Profile initial equipment projection preserved; equipment mutation still notifies',true)


 await page.evaluate(()=>{
  const {React,root,WildlifeEncounterModal,getPetSpecies}=window.review
  window.bonded=0;window.collection.mode='fail'
  root.render(React.createElement(WildlifeEncounterModal,{encounter:{...getPetSpecies('fox'),id:'bond-fox',species_id:'fox',status:'active',created_at:'2026-11-02'},onClose:()=>root.render(null),onBonded:()=>{window.bonded++;root.render(null)}}))
 })
 await page.getByRole('dialog').waitFor()
 for(let step=0;step<3;step++)await page.locator('dialog button').last().click()
 await page.getByRole('button',{name:'Adopt Moss Fox',exact:true}).waitFor()
 await page.locator('dialog input').fill('<invalid>')
 await page.getByRole('button',{name:'Adopt Moss Fox',exact:true}).click()
 await page.getByRole('alert').filter({hasText:'Nickname cannot contain'}).waitFor()
 await page.locator('dialog input').fill('Bramble')
 await page.getByRole('button',{name:'Adopt Moss Fox',exact:true}).click()
 await page.getByRole('alert').filter({hasText:'Temporary companion connection failure.'}).waitFor()
 assert.equal(await page.evaluate(()=>window.bonded),0)
 await page.screenshot({path:resolve(outputDir,'bonding-ready-phone.png')})
 await page.evaluate(()=>{window.collection.mode='full'})
 await page.getByRole('button',{name:'Adopt Moss Fox',exact:true}).click()
 await page.waitForFunction(()=>window.bonded===1)
 log('Three-step bonding, invalid nickname, failed adoption and successful retry',true)

} finally {
 await browser?.close()
 await server.close()
 await writeFile(resolve(outputDir,'ui-results.json'),JSON.stringify(output,null,2)+'\n')
}

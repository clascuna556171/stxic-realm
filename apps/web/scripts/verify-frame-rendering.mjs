// Render the real shared component independently of account/Auth transport.
import {chromium} from 'playwright'
import assert from 'node:assert/strict'
import {mkdir,writeFile} from 'node:fs/promises'
import {resolve} from 'node:path'
import {frameCatalog,frameShapes} from '../src/profile-frames.ts'
import {characterPixels} from '../src/character.ts'
import {defaults} from '../src/appearance.ts'
const origin=process.env.REALM_UI_ORIGIN??'http://127.0.0.1:5175',output=resolve(import.meta.dirname,'../../../.impeccable/review/profile-frames')
await mkdir(output,{recursive:true})
const browser=await chromium.launch({channel:process.env.REALM_BROWSER_CHANNEL??'chrome',headless:true})
const page=await browser.newPage({viewport:{width:1260,height:1000}})
const errors=[];page.on('pageerror',e=>errors.push(e.message))
await page.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort())
try{
 await page.goto(origin)
 await page.evaluate(async({catalog,shapes,pixels})=>{
  const {createElement:h}=(await import('/node_modules/.vite/deps/react.js')).default
  const {createRoot}=(await import('/node_modules/.vite/deps/react-dom_client.js')).default
  const {ProfileFrame}=await import('/src/ProfileFrame.tsx')
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="4 1 40 40" shape-rendering="crispEdges"><rect x="4" y="1" width="40" height="40" fill="#262c36"/>${pixels.map(p=>`<rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" fill="${p.color}"/>`).join('')}</svg>`
  const avatarSrc='data:image/svg+xml;base64,'+btoa(svg)
  document.querySelector('#root').style.display='none'
  const mount=document.createElement('main');document.body.append(mount);mount.id='frame-proof'
  const style=document.createElement('style');style.textContent=`body{background:#131519;color:#edeef0;margin:0;font:14px Inter,sans-serif}#frame-proof{padding:32px;max-width:1260px;margin:auto}#frame-proof h1{font:32px 'Realm Display',sans-serif;margin:0 0 12px}#frame-proof>p{color:#a8abb4;margin:0 0 24px}.proof-board{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}.proof-collection{padding:20px;background:#1b1e24;border-radius:8px;min-width:0}.proof-collection h2{font-size:18px;margin:0 0 8px}.proof-collection p{font-size:11px;color:#a8abb4;margin:0 0 18px}.proof-row{display:flex;justify-content:space-around;gap:10px;align-items:center}.proof-example{display:grid;justify-items:center;gap:8px;font-size:10px;color:#b8bbc3}.proof-sizes{padding:32px 0;display:flex;gap:22px;align-items:center;flex-wrap:wrap}.proof-sizes .proof-example{color:#b8bbc3}`;document.head.append(style)
  createRoot(mount).render(h('div',null,h('h1',null,'STXIC Realm / Frame collections'),h('p',null,'Original transparent artwork. Sample character shown for scale; account photos stay independent.'),h('div',{className:'proof-board'},...catalog.map(frame=>h('section',{key:frame.id,className:'proof-collection'},h('h2',null,frame.name),h('p',null,frame.material),h('div',{className:'proof-row'},...shapes.map(shape=>h('div',{key:shape,className:'proof-example'},h(ProfileFrame,{avatarSrc,frameId:frame.id,frameShape:shape,size:96,label:`${frame.name} ${shape}`}),h('span',null,shape))))))),h('div',{className:'proof-sizes'},...[32,48,64,96,128,256].map(size=>h('div',{key:size,className:'proof-example'},h(ProfileFrame,{avatarSrc,frameId:'nature-spirit',size,showEffects:true,label:`Size ${size}`}),h('span',null,`${size}px`)))),h('div',{className:'proof-fallbacks'},h(ProfileFrame,{avatarSrc:'/missing-photo.png',frameId:'invalid',size:64,initials:'ST',label:'Invalid frame fallback'}),h(ProfileFrame,{avatarSrc,frameId:'dark-realm',size:64,label:'Failed asset fallback',showEffects:true}))))
 },{catalog:frameCatalog,shapes:frameShapes,pixels:characterPixels(defaults)})
 await page.locator('.proof-collection').last().waitFor()
 await page.waitForFunction(()=>[...document.querySelectorAll('#frame-proof .profile-frame-art')].every(i=>i.complete&&i.naturalWidth>0))
 await page.screenshot({path:resolve(output,'collections.png'),fullPage:true,animations:'disabled'})
 for(const size of [32,48,64,96,128,256])assert.equal(await page.getByRole('img',{name:`Size ${size}`,exact:true}).evaluate(e=>e.getBoundingClientRect().width),size)
 assert.equal(await page.getByRole('img',{name:'Size 32',exact:true}).locator('.profile-frame-effect').count(),0)
 await page.emulateMedia({reducedMotion:'reduce'})
 assert.equal(await page.getByRole('img',{name:'Size 256',exact:true}).locator('.profile-frame-effect').evaluate(e=>getComputedStyle(e).display),'none')
 assert.equal(await page.getByRole('img',{name:'Invalid frame fallback',exact:true}).locator('.profile-frame-art').count(),0)
 await page.route('**/dark-realm-circle.svg*',route=>route.abort())
 await page.getByRole('img',{name:'Failed asset fallback',exact:true}).locator('.profile-frame-art').evaluate(img=>{img.src+='?failure-test'})
 await page.waitForFunction(()=>!document.querySelector('.proof-fallbacks .profile-frame[data-frame="dark-realm"] .profile-frame-art'))
 await page.waitForFunction(()=>!document.querySelector('.proof-fallbacks .profile-frame[data-frame="none"] .profile-frame-photo img'))
 await page.unroute('**/dark-realm-circle.svg*')
 await page.emulateMedia({reducedMotion:'no-preference'})
 // Exercise every collection/shape at every required size, not just the board's sample.
 await page.evaluate(async({catalog,shapes})=>{
  const {createElement:h}=(await import('/node_modules/.vite/deps/react.js')).default
  const {createRoot}=(await import('/node_modules/.vite/deps/react-dom_client.js')).default
  const {ProfileFrame}=await import('/src/ProfileFrame.tsx')
  const mount=document.createElement('div');mount.id='size-matrix';document.body.append(mount)
  createRoot(mount).render(h('div',null,...catalog.flatMap(frame=>shapes.flatMap(shape=>[32,48,64,96,128,256].map(size=>h(ProfileFrame,{key:`${frame.id}-${shape}-${size}`,frameId:frame.id,frameShape:shape,size,initials:'ST',label:`Matrix ${frame.id} ${shape} ${size}`}))))))
 },{catalog:frameCatalog,shapes:frameShapes})
 await page.locator('#size-matrix .profile-frame').last().waitFor()
 await page.waitForFunction(()=>[...document.querySelectorAll('#size-matrix .profile-frame-art')].every(i=>i.complete&&i.naturalWidth>0))
 const matrix=await page.locator('#size-matrix .profile-frame').evaluateAll(elements=>elements.map(e=>{
  const size=Number(e.getAttribute('aria-label').split(' ').at(-1)),r=e.getBoundingClientRect(),photo=e.querySelector('.profile-frame-photo').getBoundingClientRect(),art=e.querySelector('.profile-frame-art').getBoundingClientRect()
  return {size,width:r.width,height:r.height,photo:photo.width,art:art.width}
 }))
 assert.equal(matrix.length,108)
 assert.ok(matrix.every(r=>r.width===r.size&&r.height===r.size&&r.art===r.size&&Math.abs(r.photo-r.size*.75)<.01),'108 variants preserve alignment without stretching')
 assert.deepEqual(errors,[])
 await writeFile(resolve(output,'render-verification.json'),JSON.stringify({result:'PASS',shapes:18,renderedVariants:matrix.length,sizes:[32,48,64,96,128,256],checks:['real React component','uploaded-style and pixel artwork support','invalid ID fallback','failed image fallback','failed frame fallback','compact effects suppression','reduced motion'],errors},null,2))
 console.log('PASS frame component at all 6 sizes, 18 variants, reduced motion and fallbacks')
}finally{await browser.close()}

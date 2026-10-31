// Uses the actual UI component and browser animation engine. No backend calls.
import {chromium} from 'playwright'
import assert from 'node:assert/strict'
import {mkdir,writeFile} from 'node:fs/promises'
import {resolve} from 'node:path'
import {frameCatalog} from '../src/profile-frames.ts'
import {characterPixels} from '../src/character.ts'
import {defaults} from '../src/appearance.ts'
const origin=process.env.REALM_UI_ORIGIN??'http://127.0.0.1:5175',root=resolve(import.meta.dirname,'../../..'),output=resolve(root,'.impeccable/review/profile-frames/effects')
await mkdir(output,{recursive:true})
const preview=resolve(output,'index.html')
const html=`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Realm frame effects</title>
<style>body{margin:0;background:#101216;color:#ececf1;font:14px Inter,'Segoe UI',sans-serif}main{max-width:1100px;margin:auto;padding:32px}h1{font-size:28px;margin:0 0 10px}p{color:#aeb3be;line-height:1.6}header{margin-bottom:24px}header label{display:inline-flex;align-items:center;gap:10px;margin:12px 20px 0 0}button,select{background:#252a33;border:1px solid #555d6c;border-radius:6px;color:#ececf1;padding:10px;font:inherit;min-height:44px}input{accent-color:#c1d8ce}section{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}article{min-width:0;padding:24px;text-align:center;background:#1b1f26;border-radius:10px}h2{font-size:17px;margin:16px 0 6px}article p{font-size:12px;margin:0}article .profile-frame{margin:8px auto}article .profile-frame-photo img{image-rendering:pixelated}footer{padding-top:24px;font-size:12px;color:#aeb3be}:focus-visible{outline:2px solid #c1d8ce;outline-offset:3px}@media(max-width:900px){section{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:650px){main{padding:22px 14px}section{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}article{padding:14px 6px}article .profile-frame{width:132px!important;height:132px!important}h2{font-size:15px}}</style>
<main id="effects-preview"></main><script type="module">
import React from '/node_modules/.vite/deps/react.js';import ReactDOM from '/node_modules/.vite/deps/react-dom_client.js';import RefreshRuntime from '/@react-refresh';RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;const {ProfileFrame}=await import('/src/ProfileFrame.tsx');
const h=React.createElement,catalog=${JSON.stringify(frameCatalog)},pixels=${JSON.stringify(characterPixels(defaults))};
const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="4 1 40 40" shape-rendering="crispEdges"><rect x="4" y="1" width="40" height="40" fill="#303744"/>'+pixels.map(p=>'<rect x="'+p.x+'" y="'+p.y+'" width="'+p.w+'" height="'+p.h+'" fill="'+p.color+'"/>').join('')+'</svg>',photo='data:image/svg+xml;base64,'+btoa(svg);
const descriptions={ember:'Dancing flames and crimson embers',glimmer:'Sapphire starbursts and gilded flourishes',firefly:'Fluttering butterflies and woodland light',pulse:'Lightning branches and flying circuit shards',sparkle:'Rotating star flares and silver comets',twinkle:'Bobbing companions and heart balloons'};
let shape='circle',effects=true;function setShape(value){shape=value;render()}function setEffects(value){effects=value;render()}function Demo(){return h(React.Fragment,null,h('header',null,h('h1',null,'Frame effects, with a little more life.'),h('p',null,'Live preview of the shared Realm renderer. Sample character for scale; account photos stay separate.'),h('label',null,'Shape ',h('select',{'aria-label':'Preview shape',value:shape,onChange:e=>setShape(e.target.value)},...['circle','rounded-square','square'].map(v=>h('option',{key:v,value:v},v)))),h('label',null,h('input',{type:'checkbox',checked:effects,onChange:e=>setEffects(e.target.checked)}),'Animated effects')),h('section',null,...catalog.map(f=>h('article',{key:f.id},h(ProfileFrame,{avatarSrc:photo,frameId:f.id,frameShape:shape,showEffects:effects,size:200,label:f.name}),h('h2',null,f.name),h('p',null,descriptions[f.effect])))),h('footer',null,'Effects stop offscreen and with reduced motion. This development preview does not edit account settings.'))};const root=ReactDOM.createRoot(document.getElementById('effects-preview'));function render(){root.render(h(Demo))}render();
</script></html>`
await writeFile(preview,html)
const url=`${origin}/@fs/${preview.replaceAll('\\','/')}`
const browser=await chromium.launch({channel:process.env.REALM_BROWSER_CHANNEL??'chrome',headless:true})
const page=await browser.newPage({viewport:{width:1260,height:1000}})
const errors=[];page.on('pageerror',e=>errors.push(e.message))
await page.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort())
try{
 await page.goto(url)
 await page.waitForFunction(()=>document.querySelectorAll('article .frame-energy').length===6)
 await page.waitForFunction(()=>[...document.querySelectorAll('article .profile-frame')].every(e=>e.dataset.motion==='running'))
 const motion=await page.locator('article').evaluateAll(articles=>articles.map(article=>{
  const chase=article.querySelector('.frame-energy-chase'),mote=article.querySelector('.frame-mote'),a=chase.getAnimations()[0],b=mote.getAnimations()[0]
  a.pause();a.currentTime=0;const start=getComputedStyle(chase).strokeDashoffset;a.currentTime=1800;const end=getComputedStyle(chase).strokeDashoffset
  b.pause();b.currentTime=0;const initial=getComputedStyle(mote).transform;b.currentTime=2100;const moved=getComputedStyle(mote).transform
  return {collection:article.querySelector('h2').textContent,start,end,initial,moved,moteAnimation:b.animationName}
 }))
 assert.ok(motion.every(m=>m.start!==m.end&&m.initial!==m.moved),'all six have real perimeter and particle motion')
 assert.equal(new Set(motion.map(m=>m.moteAnimation)).size,5,'five authored particle motions with shared glints for royal/mono')
 const decorations=await page.locator('article').evaluateAll(articles=>articles.map(article=>{
  const piece=article.querySelector('.frame-spectacle>g>g,.spectacle-butterfly'),animation=piece.getAnimations()[0]
  animation.pause();animation.currentTime=0;const before=getComputedStyle(piece).transform;animation.currentTime=800;const after=getComputedStyle(piece).transform
  return {collection:article.querySelector('h2').textContent,animation:animation.animationName,before,after,width:piece.getBBox().width}
 }))
 assert.equal(new Set(decorations.map(d=>d.animation)).size,6,'six distinct large decoration choreographies')
 assert.ok(decorations.every(d=>d.before!==d.after),`large ornaments move in every collection: ${JSON.stringify(decorations)}`)
 await page.evaluate(()=>document.getAnimations().forEach(a=>{a.pause();a.currentTime=2100}))
 await page.screenshot({path:resolve(output,'desktop.png'),fullPage:true})
 await page.getByLabel('Preview shape').selectOption('rounded-square')
 assert.ok(await page.locator('.frame-energy-chase').evaluateAll(paths=>paths.every(p=>p.getAttribute('d').includes('Q'))),'rounded energy follows rounded artwork')
 await page.getByLabel('Preview shape').selectOption('square')
 assert.ok(await page.locator('.frame-energy-chase').evaluateAll(paths=>paths.every(p=>p.getAttribute('d')==='M28 28H228V228H28Z')))
 // Stop frames outside the viewport, then reconcile the document visibility event.
 await page.locator('article').first().evaluate(e=>{e.style.marginTop='2000px'})
 await page.waitForFunction(()=>document.querySelector('article .profile-frame').dataset.motion==='paused')
 await page.locator('article').first().evaluate(e=>{e.style.marginTop=''})
 await page.waitForFunction(()=>document.querySelector('article .profile-frame').dataset.motion==='running')
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'))})
 await page.waitForFunction(()=>[...document.querySelectorAll('article .profile-frame')].every(e=>e.dataset.motion==='paused'))
 await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'))})
 await page.getByLabel('Animated effects').uncheck()
 assert.equal(await page.locator('.frame-energy').count(),0,'toggle removes all effects')
 await page.getByLabel('Animated effects').check()
 await page.emulateMedia({reducedMotion:'reduce'})
 assert.ok(await page.locator('.profile-frame-effect').evaluateAll(elements=>elements.every(e=>getComputedStyle(e).display==='none')))
 assert.equal(await page.locator('.profile-frame-effect *').evaluateAll(elements=>elements.filter(e=>getComputedStyle(e).animationName!=='none').length),0,'no animation work with reduced motion')
 await page.emulateMedia({reducedMotion:'no-preference'})
 await page.getByLabel('Preview shape').selectOption('circle')
 for(const width of [768,663,390,320]){
  await page.setViewportSize({width,height:844});await page.evaluate(()=>{scrollTo(0,0);document.getAnimations().forEach(a=>{a.pause();a.currentTime=2100})})
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)
  await page.screenshot({path:resolve(output,`mobile-${width}.png`),fullPage:true})
 }
 assert.deepEqual(errors,[])
 await writeFile(resolve(output,'verification.json'),JSON.stringify({result:'PASS',motion,decorations,checks:['six distinct material effects','large animated ornaments','shape-following paths','toggle','offscreen and background pausing','reduced motion','768/663/390/320px overflow'],previewUrl:url,errors},null,2))
 console.log('PASS frame effects, real motion, toggle, visibility, shapes, reduced motion and responsive layouts')
 console.log('Live preview:',url)
}finally{await browser.close()}

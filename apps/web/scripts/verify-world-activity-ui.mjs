import {chromium} from 'playwright'
import assert from 'node:assert/strict'
import {mkdir,writeFile} from 'node:fs/promises'
import {resolve} from 'node:path'
const origin=process.env.REALM_UI_ORIGIN??'http://127.0.0.1:5178',output=resolve('.impeccable/review/world-activity')
await mkdir(output,{recursive:true})
const browser=await chromium.launch({channel:process.env.REALM_BROWSER_CHANNEL??'chrome',headless:true}),errors=[],checks=[]
try{
 for(const [width,height] of [[1440,900],[390,844],[320,740]]){
  const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'})
  await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort())
  await context.addInitScript(()=>{
   window.audioEvidence=JSON.parse(sessionStorage.getItem('audioEvidence')??'{"created":0,"resumed":0,"closed":0}')
   const record=()=>sessionStorage.setItem('audioEvidence',JSON.stringify(window.audioEvidence))
   const Original=window.AudioContext
   window.AudioContext=class extends Original{constructor(...args){super(...args);window.audioEvidence.created++;record()}resume(){window.audioEvidence.resumed++;record();return super.resume()}close(){window.audioEvidence.closed++;record();return super.close()}}
  })
  const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(20000)
  await page.goto(origin+'/?room-preview');await page.locator('.room-canvas canvas').waitFor()
  assert.equal(await page.evaluate(()=>audioEvidence.created),0,'no audio context before a gesture')
  const details=page.getByRole('button',{name:'Objects & details',exact:true});if(await details.isVisible())await details.click()
  await page.locator('.room-object-list button').filter({hasText:'Project desk'}).click()
  const open=page.locator('.room-object-detail').getByRole('button',{name:'Open Workstation',exact:true});await open.click()
  const dialog=page.getByRole('dialog');await dialog.getByRole('button',{name:'Start timer',exact:true}).click();await dialog.getByText('Deep Work · Standing up pauses your session.',{exact:true}).waitFor()
  assert.equal(await page.evaluate(()=>audioEvidence.created),0,'focus never starts audio')
  for(const name of ['Gentle Rain','Hearth Embers','Night Crickets','Lofi Focus'])await dialog.getByRole('button',{name:`${name} Off`,exact:true}).click()
  assert.equal(await page.evaluate(()=>audioEvidence.created),1,'one context for all four tracks')
  await dialog.getByLabel('Gentle Rain volume',{exact:true}).fill('18')
  await dialog.getByRole('button',{name:'Mute sounds',exact:true}).click();await dialog.getByRole('button',{name:'Unmute sounds',exact:true}).waitFor()
  await page.screenshot({path:resolve(output,`soundscape-${width}.png`)})
  await page.keyboard.press('Escape');await open.click();await dialog.getByRole('button',{name:'Pause timer',exact:true}).waitFor()
  await page.keyboard.press('Escape');const scene=page.getByRole('button',{name:'Room',exact:true});if(await scene.isVisible())await scene.click()
  await page.screenshot({path:resolve(output,`deep-work-${width}.png`)})
  await page.locator('.scene-arrival').getByRole('button',{name:'Stand up',exact:true}).click()
  if(await details.isVisible())await details.click();await open.click();await dialog.getByText('Session paused. Start to settle back in.',{exact:true}).waitFor();await page.keyboard.press('Escape')
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight+1),'world remains inside viewport')
  await page.goto(origin+'/?hall-preview');await page.locator('.hall-pixel-canvas').waitFor();assert.equal(await page.evaluate(()=>audioEvidence.closed),1,'route unmount closes context')
  checks.push(`${width}px: no autoplay, four mixes, volume/mute, close/reopen timer, stand pauses, viewport fit, audio unmount`)
  await context.close()
 }
 // Exercise the real Phaser scene graph, not a mocked lifecycle or DOM replacement.
 if(!process.env.REALM_PRODUCTION){
 const context=await browser.newContext({viewport:{width:800,height:600},reducedMotion:'reduce'}),page=await context.newPage()
 await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort())
 await page.goto(origin+'/?room-preview');await page.locator('.room-canvas canvas').waitFor()
 await page.evaluate(async()=>{
  const {createRoom}=await import('/src/world/renderer.ts'),{OBJECTS}=await import('/src/world/room.ts')
  const mount=document.createElement('div');mount.style.cssText='position:fixed;inset:0;width:512px;height:384px;z-index:50000';document.body.append(mount)
  let state={messages:[],activity:[]},point={x:1,y:1}
  let focus={status:'idle',remaining:1500,deadline:null,target:null};const game=createRoom(mount,()=>{},()=>point,()=>OBJECTS,{localId:'alice',activity:()=>state,focus:()=>focus,people:()=>[{id:'bob',name:'Bob',x:14,y:10,sequence:1,character:{}}]})
  const check=(value,label)=>{if(!value)throw new Error(label)},wait=ms=>new Promise(resolve=>setTimeout(resolve,ms))
  try{
   await new Promise(resolve=>game.events.once('postrender',resolve));const scene=game.scene.getScene('room')
   const containers=()=>scene.children.list.filter(item=>item.type==='Container'&&item.depth===20000)
   const say=(id,body,author_id='alice')=>({id,body,author_id,created_at:new Date().toISOString()})
   state={messages:[say('one','A'.repeat(130))],activity:[]};await wait(180)
   check(containers().length===1,'speech creates one actual Phaser container');const first=containers()[0],text=first.list.find(child=>child.type==='Text')
   check(text.text.endsWith('…')&&Array.from(text.text).length===120,'real rendered text truncates');check(text.width<=144,'unbroken text wraps within 144px')
   check(first.x>=0&&first.y>=0,'bubble clamps to top-left edge');const fixedY=first.y;await wait(150);check(first.alpha===1&&first.y===fixedY,'reduced motion keeps full opacity and a fixed anchor')
   state={messages:[say('two','Replacement speech'),say('remote','Remote visitor speech','bob')],activity:[]};await wait(180)
   check(containers().length===2&&containers().includes(first),'replacement reuses the local container while remote actor gets its own')
   check(first.list.find(child=>child.type==='Text').text==='Replacement speech','content replaced')
   focus={status:'running',remaining:1500,deadline:Date.now()+1500000,target:'desk'};state.activity=[{user_id:'alice',typing_until:new Date(Date.now()+5000).toISOString(),focus_target:'desk',focus_until:new Date(focus.deadline).toISOString()}];await wait(120);check(scene.children.list.some(item=>item.type==='Text'&&item.text.includes('⚡')&&item.text.includes('.')),'typing and focus stay visible during speech');focus={status:'idle',remaining:1500,deadline:null,target:null};state.activity=[]
   await wait(4600);check(containers().length===0,'expired bubbles and text destroyed')
   state={messages:[],activity:[{user_id:'alice',typing_until:new Date(Date.now()+5000).toISOString(),focus_target:null,focus_until:null}]};await wait(120);check(containers().length===1,'typing creates mini-bubble')
   state={messages:[],activity:[]};await wait(120);check(containers().length===0,'typing stops immediately when signaled')
  }finally{game.destroy(true);mount.remove()}
 })
 checks.push('Real Phaser: Unicode truncation, unbroken wrapping, edge clamping, actor anchoring, replacement reuse, timed destruction, typing stop')
 await context.close();
 }
 assert.deepEqual(errors,[]);await writeFile(resolve(output,process.env.REALM_PRODUCTION?'verification-production.json':'verification.json'),JSON.stringify({checks,errors},null,2));console.log(checks.join('\n'))
}finally{await browser.close()}

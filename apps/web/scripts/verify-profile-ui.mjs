// Intercepted Auth/PostgREST transport backed by local PGlite SQL/RLS, never the linked project.
// No real GoTrue, HTTP database connections, mail or Realtime is exercised here.
import {frameCatalog,frameShapes} from '../src/profile-frames.ts'
import {inspectProfileImage} from '../../../supabase/functions/_shared/profile-images.ts'
import { chromium } from 'playwright'
import { PGlite } from '@electric-sql/pglite'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import assert from 'node:assert/strict'
const root=resolve(import.meta.dirname,'../../..'),origin=process.env.REALM_UI_ORIGIN??'http://127.0.0.1:5175',output=resolve(root,'.impeccable/review/account-profiles')
await mkdir(output,{recursive:true})
const env=await readFile(resolve(root,'apps/web/.env.local'),'utf8'),backend=env.match(/^VITE_SUPABASE_URL=(.*)$/m)?.[1]?.trim()
assert.ok(backend,'Public backend URL needed only to intercept the configured client')
const frameOutput=resolve(root,'.impeccable/review/profile-frames');await mkdir(frameOutput,{recursive:true})
const storageKey=`sb-${new URL(backend).hostname.split('.')[0]}-auth-token`
const users={alice:'10000000-0000-4000-8000-000000000001',bob:'20000000-0000-4000-8000-000000000002',moderator:'30000000-0000-4000-8000-000000000003',outsider:'40000000-0000-4000-8000-000000000004'}
const space='70000000-0000-4000-8000-000000000007',channel='80000000-0000-4000-8000-000000000008'
const db=new PGlite({extensions:{pgcrypto}})
await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create schema extensions;
create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,encrypted_password text);
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
grant usage on schema auth to anon,authenticated,service_role;grant execute on all functions in schema auth to anon,authenticated,service_role;create schema storage;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
 alter table storage.objects enable row level security;
 grant usage on schema storage to authenticated,service_role;
 grant select,insert,update,delete on storage.objects to authenticated,service_role;
 create publication supabase_realtime;`)
for(const file of (await readdir(resolve(root,'supabase/migrations'))).filter(f=>f.endsWith('.sql')).sort()) await db.exec(await readFile(resolve(root,'supabase/migrations',file),'utf8'))
for(const [name,id] of Object.entries(users)) {
 await db.query('insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())',[id,`${name}@example.invalid`])
 await db.query('update public.profiles set display_name=$1 where id=$2',[name==='alice'?'Alice':name==='bob'?'Bob':name,id])
}
await db.exec(`update realm_private.accounts set state='active';update realm_private.settings set value='true' where key='administration';
insert into public.friendships(requester,addressee,status) values('${users.alice}','${users.bob}','accepted');
begin;insert into public.spaces(id,name) values('${space}','The shared conservatory');
insert into public.space_members(space_id,user_id,role) values('${space}','${users.alice}','owner'),('${space}','${users.bob}','member'),('${space}','${users.moderator}','moderator');
insert into public.channels(id,space_id,name) values('${channel}','${space}','general');commit;`)
let queue=Promise.resolve(),requests=[],pageErrors=[]
const blobs=new Map()
let loseNextUploadResponse=false
const uploadAttempts=[]
const failedReads=new Set()
function serialized(task) { const next=queue.then(task); queue=next.catch(()=>{}); return next }
async function asUser(id,task) {
 return serialized(async()=>{await db.exec('begin;set local role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,true)",[id]);try{const result=await task();await db.exec('commit');return result}catch(e){await db.exec('rollback');throw e}})
}
async function serviceOperation(actor,args){return serialized(async()=>{await db.exec('begin;set local role service_role');try{const result=await sqlRpc('profile_media_operation',{p_actor:actor,...args});await db.exec('commit');return result}catch(e){await db.exec('rollback');throw e}})}
const sqlRpc=(name,args)=>{
 assert.match(name,/^[a-z_]+$/);for(const arg of Object.keys(args))assert.match(arg,/^p_[a-z_]+$/)
 return db.query(`select public."${name}"(${Object.keys(args).map((key,i)=>`"${key}"=>$${i+1}`).join(',')}) as result`,Object.values(args).map(v=>v&&typeof v==='object'?JSON.stringify(v):v)).then(r=>r.rows[0].result)
}
// Local intercepted transport only; Chrome otherwise blocks the Vite websocket.
const browser=await chromium.launch({channel:process.env.REALM_BROWSER_CHANNEL??'chrome',headless:true,args:['--disable-features=LocalNetworkAccessChecks']})
async function contextFor(name,brokenRenderer=false) {
 const user={id:users[name],email:`${name}@example.invalid`,email_confirmed_at:new Date().toISOString(),aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{}}
 const b64=v=>Buffer.from(JSON.stringify(v)).toString('base64url'),token=`${b64({alg:'HS256',typ:'JWT'})}.${b64({sub:user.id,exp:Math.floor(Date.now()/1000)+3600,role:'authenticated'})}.fixture`
 const session={access_token:token,refresh_token:'fixture',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user}
 const context=await browser.newContext({viewport:{width:1440,height:1000}})
 await context.addInitScript(({key,session})=>localStorage.setItem(key,JSON.stringify(session)),{key:storageKey,session})
 if(brokenRenderer)await context.addInitScript(()=>{HTMLCanvasElement.prototype.getContext=function(){throw new Error('fixture renderer failure')}})
 await context.routeWebSocket('**/realtime/v1/**',ws=>ws.close())
 await context.route('**/*',async route=>{
  const req=route.request(),url=new URL(req.url())
  if(url.origin===origin)return route.continue()
  if(url.origin!==new URL(backend).origin)return route.abort()
  const reply=(data,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(data),headers:{'Access-Control-Allow-Origin':origin}})
  if(req.method()==='OPTIONS')return reply({})
  if(url.pathname.startsWith('/auth/v1/'))return reply(url.pathname.endsWith('/user')?user:session)
  try {
   if(url.pathname==='/functions/v1/realm-profile-media'){
    if(req.headers()['content-type']?.includes('application/json')){const input=req.postDataJSON(),m=await serviceOperation(user.id,{p_action:'cleanup',p_id:input.id});blobs.delete(m.object_path);await serviceOperation(user.id,{p_action:'removed',p_id:input.id});return reply({removed:true})}
    const bytes=new Uint8Array(req.postDataBuffer());uploadAttempts.push({client:req.headers()['x-realm-client'],bytes:Buffer.from(bytes)});const info=inspectProfileImage(bytes),m=await serviceOperation(user.id,{p_action:'reserve',p_client:req.headers()['x-realm-client'],p_kind:req.headers()['x-realm-slot'],p_mime:info.mime,p_bytes:bytes.length,p_width:info.width,p_height:info.height});blobs.set(m.object_path,{bytes,mime:info.mime});await serialized(()=>db.query('insert into storage.objects(bucket_id,name) select $1,$2 where not exists(select 1 from storage.objects where bucket_id=$1 and name=$2)',['realm-profiles',m.object_path]));const completed=await serviceOperation(user.id,{p_action:'finish',p_id:m.id});if(loseNextUploadResponse){loseNextUploadResponse=false;return route.abort('failed')}return reply(completed)
   }
   if(url.pathname.includes('/storage/v1/object/sign/realm-profiles/')){
    const path=decodeURIComponent(url.pathname.split('/realm-profiles/')[1]),rows=await asUser(user.id,()=>db.query('select name from storage.objects where bucket_id=$1 and name=$2',['realm-profiles',path]).then(r=>r.rows));if(!rows.length)throw {code:'42501',message:'Image access denied'}
    if(req.method()==='POST')return reply({signedURL:'/object/sign/realm-profiles/'+path+'?token=fixture'})
    const image=blobs.get(path);if(!image)return route.fulfill({status:404});return route.fulfill({status:200,contentType:image.mime,body:Buffer.from(image.bytes),headers:{'Access-Control-Allow-Origin':origin}})
   }
   if(url.pathname.includes('/rpc/')) {
    const name=url.pathname.split('/').pop(),args=req.postDataJSON()??{};requests.push({user:user.id,name,args})
    if(failedReads.has(`${user.id}:${name}`))return reply({code:'fixture_offline',message:'Temporary connection failure.'},503)
    return reply(await asUser(user.id,()=>sqlRpc(name,args)))
   }
   const table=url.pathname.split('/').pop();assert.ok(['spaces','channels','homes','profiles','profile_appearances','user_blocks','account_portraits','direct_conversations'].includes(table),`Unhandled fixture table ${table}`)
   const values=[],filters=[]
   for(const [column,value] of url.searchParams)if(value.startsWith('eq.')){assert.match(column,/^[a-z_]+$/);values.push(value.slice(3));filters.push(`"${column}"=$${values.length}`)}
   const rows=await asUser(user.id,()=>db.query(`select * from public."${table}"${filters.length?' where '+filters.join(' and '):''}`,values).then(r=>r.rows))
   return reply(req.headers().accept?.includes('vnd.pgrst.object')?rows[0]:rows)
  }catch(e){console.error('FIXTURE ERROR',url.pathname,e.message??e,e.code);return reply({code:e.code??'fixture',message:e.message,error:e.message,details:e.detail},e.code==='PT409'?409:e.code==='PT429'?429:e.code==='42501'?403:400)}
 })
 const page=await context.newPage();page.setDefaultTimeout(20000);page.on('pageerror',e=>{if(!brokenRenderer||!e.message.includes('fixture renderer failure'))pageErrors.push(e.message)});page.on('dialog',d=>d.accept())
 return {context,page}
}
const profileUrl=origin+'/?profile',peerUrl=origin+'/?profile='+users.alice+'&space='+space
const overflow=async p=>assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)
async function sampleImage(page,width,height,color,label){return Buffer.from(await page.evaluate(({width,height,color,label})=>{const c=document.createElement('canvas');c.width=width;c.height=height;const x=c.getContext('2d');x.fillStyle=color;x.fillRect(0,0,width,height);x.fillStyle='#b4c7a3';x.beginPath();x.arc(width*.75,height*.4,height*.65,0,Math.PI*2);x.fill();x.fillStyle='#18202a';x.font=`bold ${Math.max(16,height*.15)}px sans-serif`;x.fillText(label,20,height*.65);return c.toDataURL('image/png').split(',')[1]},{width,height,color,label}),'base64')}
try{
 const a=await contextFor('alice'),b=await contextFor('bob'),o=await contextFor('outsider'),alice=a.page,bob=b.page
 await alice.goto(profileUrl);await alice.getByRole('heading',{name:'Profile details',exact:true}).waitFor();assert.equal(await alice.locator('.pixel-character,.profile-scene').count(),0,'account profile has no world character')
 const beforeCharacter=await asUser(users.alice,()=>sqlRpc('get_identity',{}).then(v=>JSON.stringify(v.character)))
 await alice.getByLabel('Display name',{exact:true}).fill('Stxic');await alice.getByLabel('Pronouns',{exact:true}).fill('they / them');await alice.getByLabel('Profile status',{exact:true}).fill('What have you been reading?');await alice.getByLabel('About you',{exact:true}).fill("A place for my photos, projects and people.\nMake yourself at home.")
 await alice.getByRole('tab',{name:'Identity',exact:true}).focus();await alice.keyboard.press('ArrowRight');await alice.getByRole('tabpanel',{name:'Photos & banner',exact:true}).waitFor()
 const avatar=await sampleImage(alice,256,256,'#a5b6b4','S'),banner=await sampleImage(alice,1000,420,'#495b68','the quiet hours'),photo=await sampleImage(alice,600,600,'#696354','a little inspiration')
 loseNextUploadResponse=true;await alice.getByLabel('Upload account photo',{exact:true}).setInputFiles({name:'my-photo.png',mimeType:'image/png',buffer:avatar});await alice.getByRole('button',{name:'Retry image upload',exact:true}).waitFor();await alice.getByLabel('Upload account photo',{exact:true}).setInputFiles({name:'same-content-renamed.png',mimeType:'image/png',buffer:avatar});await alice.getByText('Image uploaded privately. Save your profile to share it.',{exact:true}).waitFor();assert.equal(uploadAttempts[0].client,uploadAttempts[1].client);assert.deepEqual(uploadAttempts[0].bytes,uploadAttempts[1].bytes);assert.equal(await serialized(()=>db.query('select count(*)::int n from public.profile_media where user_id=$1',[users.alice]).then(r=>r.rows[0].n)),1);await alice.getByAltText('Stxic account photo',{exact:true}).waitFor();await alice.waitForFunction(()=>document.querySelector('.account-profile-photo img')?.naturalWidth>0)
 loseNextUploadResponse=true;await alice.getByLabel('Upload banner',{exact:true}).setInputFiles({name:'my-banner.png',mimeType:'image/png',buffer:banner});await alice.getByRole('button',{name:'Retry image upload',exact:true}).waitFor();await alice.getByRole('button',{name:'Retry image upload',exact:true}).click();await alice.getByAltText('Stxic profile banner',{exact:true}).waitFor();assert.equal(uploadAttempts[2].client,uploadAttempts[3].client);assert.deepEqual(uploadAttempts[2].bytes,uploadAttempts[3].bytes);assert.notEqual(uploadAttempts[0].client,uploadAttempts[2].client)
 await alice.getByLabel('Upload gallery photo',{exact:true}).setInputFiles({name:'my-gallery.png',mimeType:'image/png',buffer:photo});await alice.getByAltText('Stxic shared photo 1',{exact:true}).waitFor()
 await alice.getByRole('tab',{name:'Style',exact:true}).click();await alice.getByLabel('Profile background',{exact:true}).fill('#24272c');await alice.getByLabel('Profile accent',{exact:true}).fill('#b1b8db');await alice.getByLabel('Photo shape',{exact:true}).selectOption('rounded')
 await alice.getByRole('tab',{name:'Profile frames',exact:true}).click()
 assert.equal(await alice.getByRole('button',{name:/^Select /}).count(),6)
 await alice.getByRole('button',{name:'Select Nature Spirit',exact:true}).click()
 await alice.getByRole('radio',{name:'Square',exact:true}).check()
 await alice.getByRole('checkbox',{name:'Animated effects',exact:true}).uncheck()
 assert.equal(await alice.locator('.account-profile-photo').getAttribute('data-frame'),'nature-spirit')
 assert.equal(await alice.locator('.account-profile-photo').getAttribute('data-shape'),'square')
 await alice.getByRole('button',{name:'Reset frame changes',exact:true}).click()
 assert.equal(await alice.locator('.account-profile-photo').getAttribute('data-frame'),'none')
 assert.equal(await alice.getByLabel('Photo shape',{exact:true}).inputValue(),'circle')
 await alice.getByRole('radio',{name:'Circle',exact:true}).focus();await alice.keyboard.press('ArrowRight');assert.equal(await alice.getByRole('radio',{name:'Rounded square',exact:true}).isChecked(),true)
 await alice.getByRole('button',{name:'Select Dark Realm',exact:true}).click()
 await alice.getByRole('radio',{name:'Rounded square',exact:true}).check()
 await alice.getByRole('checkbox',{name:'Animated effects',exact:true}).check()
 const selectedFrame=alice.getByRole('button',{name:'Select Dark Realm',exact:true})
 await selectedFrame.scrollIntoViewIfNeeded()
 await alice.waitForFunction(()=>document.querySelector('.frame-collection[aria-pressed=true] .profile-frame')?.getAttribute('data-motion')==='running')
 assert.equal(await selectedFrame.locator('.frame-energy-chase').evaluate(e=>getComputedStyle(e).animationPlayState),'running')
 const royalFrame=alice.getByRole('button',{name:'Select Royal Legend',exact:true})
 assert.equal(await royalFrame.locator('.frame-energy-chase').evaluate(e=>getComputedStyle(e).animationPlayState),'paused')
 await selectedFrame.focus();await alice.keyboard.press('Tab')
 assert.equal(await royalFrame.evaluate(e=>e===document.activeElement),true)
 assert.equal(await royalFrame.locator('.frame-energy-chase').evaluate(e=>getComputedStyle(e).animationPlayState),'running','keyboard focus previews effects')
 await alice.getByRole('checkbox',{name:'Animated effects',exact:true}).uncheck()
 assert.equal(await alice.locator('.frame-workshop .frame-energy').count(),0,'toggle clears preview effects')
 await alice.getByRole('checkbox',{name:'Animated effects',exact:true}).check()
 await alice.getByText(/Preview .*not saved yet/).waitFor()
 await alice.waitForFunction(()=>[...document.querySelectorAll('.frame-workshop img')].every(i=>i.complete&&i.naturalWidth>0))
 await alice.evaluate(()=>{window.scrollTo(0,0);document.activeElement?.blur()})
 await alice.screenshot({animations:'disabled',path:resolve(frameOutput,'desktop.png'),fullPage:true})
 for(const width of [390,320]){await alice.setViewportSize({width,height:844});await alice.evaluate(()=>window.scrollTo(0,0));await overflow(alice);await alice.screenshot({animations:'disabled',path:resolve(frameOutput,`mobile-${width}.png`),fullPage:true});await alice.getByRole('button',{name:'Save profile & equip',exact:true}).scrollIntoViewIfNeeded();assert.equal(await alice.getByRole('button',{name:'Save profile & equip',exact:true}).evaluate(e=>{const r=e.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===e}),true,'bottom save reachable above phone navigation')}
 await alice.setViewportSize({width:1440,height:1000})
 const alpha=await alice.evaluate(async catalog=>{
  const result=[]
  for(const item of catalog)for(const [shape,src] of Object.entries(item.assets)){
   const image=new Image();image.src=src;await image.decode()
   const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0)
   const center=ctx.getImageData(96,96,64,64).data,all=ctx.getImageData(0,0,256,256).data
   result.push({id:item.id,shape,clear:[...center].every((v,i)=>i%4!==3||v===0),painted:[...all].some((v,i)=>i%4===3&&v>0)})
  }return result
 },frameCatalog)
 assert.equal(alpha.length,21);assert.ok(alpha.every(a=>a.clear&&a.painted),'all independent artwork centers are transparent')
 await alice.getByRole('tab',{name:'Photos & banner',exact:true}).click()
 await alice.getByLabel('Upload account photo',{exact:true}).setInputFiles({name:'bad.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg onload="alert(1)"/>')});await alice.getByRole('alert').filter({hasText:'Choose a PNG, JPEG, WebP, GIF or AVIF image.'}).waitFor()
 await alice.getByRole('tab',{name:'Sections',exact:true}).click();await alice.getByRole('button',{name:'Add detail',exact:true}).click();await alice.getByLabel('Detail label 1',{exact:true}).fill('Currently reading');await alice.getByLabel('Detail text 1',{exact:true}).fill('A book worth staying up for')
 await alice.getByRole('button',{name:'Add connection',exact:true}).click();await alice.getByLabel('Connection name 1',{exact:true}).fill('My website');await alice.getByLabel('Connection URL 1',{exact:true}).fill('https://example.com');await alice.getByRole('button',{name:'Move Photos up',exact:true}).click()
 await alice.getByRole('button',{name:'Save profile',exact:true}).click();await alice.getByText('Profile saved to your account.',{exact:true}).waitFor()
 assert.equal(await asUser(users.alice,()=>sqlRpc('get_identity',{}).then(v=>JSON.stringify(v.character))),beforeCharacter,'account photos never replace world character')
 assert.equal(await asUser(users.alice,()=>sqlRpc('get_profile_card',{}).then(v=>v.card.style.frame_id)),'dark-realm')
 const dm=await asUser(users.alice,()=>sqlRpc('open_direct',{p_user:users.bob})),aliceDm=await a.context.newPage(),bobDm=await b.context.newPage();await aliceDm.goto(`${origin}/?dm=${dm}`);await bobDm.goto(`${origin}/?dm=${dm}`);await aliceDm.locator('#stream-body').fill('A direct conversation with rounded messages.');await aliceDm.getByRole('button',{name:'Send',exact:true}).click();await aliceDm.getByText('A direct conversation with rounded messages.',{exact:true}).waitFor();await bobDm.getByRole('button',{name:'Refresh messages',exact:true}).click();await bobDm.getByText('A direct conversation with rounded messages.',{exact:true}).waitFor();assert.equal(await aliceDm.locator('.message.is-own .message-bubble').count(),1);assert.equal(await bobDm.locator('.message.is-peer .message-bubble').count(),1);await bobDm.setViewportSize({width:390,height:844});await bobDm.locator('#stream-body').fill('x'.repeat(1000));await bobDm.getByRole('button',{name:'Send',exact:true}).click();await bobDm.locator('.message.is-own .message-bubble').waitFor();await overflow(bobDm);await bobDm.screenshot({path:resolve(output,'direct-message-phone.png')});await aliceDm.close();await bobDm.close()
 await alice.screenshot({animations:'disabled',path:resolve(output,'editor-desktop.png'),fullPage:true});await alice.reload();await alice.getByLabel('Display name',{exact:true}).waitFor();assert.equal(await alice.getByLabel('Display name',{exact:true}).inputValue(),'Stxic');await alice.waitForFunction(()=>document.querySelector('.account-profile-photo img')?.naturalWidth>0)
 // Pointer depth: a fine pointer tilts the card, leaving restores a flat card, reduced motion never tilts.
 {const card=alice.locator('.account-profile-card').first();await card.scrollIntoViewIfNeeded();const box=await card.boundingBox();assert.ok(box);const tilt=()=>card.evaluate(e=>e.dataset.tilt??null),transform=()=>card.evaluate(e=>getComputedStyle(e).transform)
  await alice.mouse.move(box.x+box.width*.85,box.y+60);await alice.waitForFunction(()=>document.querySelector('.account-profile-card')?.dataset.tilt==='active');await alice.waitForTimeout(300);assert.notEqual(await transform(),'none','card tilts toward a fine pointer')
  await card.screenshot({path:resolve(output,'card-tilt-desktop.png')})
  await alice.mouse.move(1,1);await alice.waitForFunction(()=>!document.querySelector('.account-profile-card')?.dataset.tilt);await alice.waitForTimeout(700);assert.equal(await transform(),'none','card rests flat after the pointer leaves')
  await alice.emulateMedia({reducedMotion:'reduce'});await alice.mouse.move(box.x+box.width*.85,box.y+60);await alice.waitForTimeout(250);assert.equal(await tilt(),null,'reduced motion never tilts');await alice.mouse.move(1,1);await alice.emulateMedia({reducedMotion:'no-preference'})}
 await alice.getByRole('tab',{name:'Profile frames',exact:true}).click();await alice.getByText('Currently equipped',{exact:true}).waitFor()
 assert.equal(await alice.getByRole('button',{name:'Select Dark Realm',exact:true}).getAttribute('aria-pressed'),'true')
 assert.equal(await alice.getByRole('radio',{name:'Rounded square',exact:true}).isChecked(),true)
 await alice.getByRole('button',{name:'No frame',exact:true}).click();await alice.getByRole('button',{name:'Save profile',exact:true}).click();await alice.getByText('Profile saved to your account.',{exact:true}).waitFor()
 await alice.reload();await alice.getByRole('tab',{name:'Profile frames',exact:true}).click();assert.equal(await alice.getByRole('button',{name:'No frame',exact:true}).getAttribute('aria-pressed'),'true')
 await alice.getByRole('button',{name:'Select Dark Realm',exact:true}).click();await alice.getByRole('button',{name:'Save profile',exact:true}).click();await alice.getByText('Profile saved to your account.',{exact:true}).waitFor()
 await bob.goto(peerUrl);await bob.getByRole('heading',{name:'Stxic',exact:true}).waitFor();await bob.getByAltText('Stxic account photo',{exact:true}).waitFor();await bob.getByRole('heading',{name:'Server roles',exact:true}).waitFor();assert.equal(await bob.getByRole('button',{name:'Save profile',exact:true}).count(),0)
 await bob.getByLabel('Private profile note',{exact:true}).fill('Only I can read this note.');await bob.getByRole('button',{name:'Save private note',exact:true}).click();await bob.getByText('Your private note is saved.',{exact:true}).waitFor();await bob.reload();await bob.getByLabel('Private profile note',{exact:true}).waitFor();assert.equal(await bob.getByLabel('Private profile note',{exact:true}).inputValue(),'Only I can read this note.')
 await o.page.goto(peerUrl);await o.page.getByLabel('Private profile note',{exact:true}).waitFor();assert.equal(await o.page.getByLabel('Private profile note',{exact:true}).inputValue(),'');assert.equal(await o.page.getByRole('heading',{name:'Server roles',exact:true}).count(),0)
 await bob.screenshot({animations:'disabled',path:resolve(output,'member-desktop.png'),fullPage:true});await bob.emulateMedia({reducedMotion:'reduce'});await bob.waitForFunction(()=>[...document.querySelectorAll('.account-profile-card img:not(.profile-frame-art)')].every(img=>img.getAttribute('data-reduced-motion')==='true'&&img.src.startsWith('data:image/png')));await bob.emulateMedia({reducedMotion:'no-preference'})
 for(const width of [390,320]){await bob.setViewportSize({width,height:844});await overflow(bob);await bob.screenshot({animations:'disabled',path:resolve(output,`member-${width}.png`),fullPage:true});await alice.setViewportSize({width,height:844});await overflow(alice);await alice.screenshot({animations:'disabled',path:resolve(output,`editor-${width}.png`),fullPage:true});await alice.getByRole('button',{name:'Preview profile',exact:true}).click();await overflow(alice);await alice.screenshot({animations:'disabled',path:resolve(output,`owner-preview-${width}.png`),fullPage:true});await alice.getByRole('button',{name:'Edit profile',exact:true}).click()}
 await alice.getByRole('tab',{name:'Identity',exact:true}).click();await alice.getByLabel('Profile status',{exact:true}).fill('Unsaved reconnect draft')
 failedReads.add(`${users.alice}:get_profile_card`);await alice.evaluate(()=>window.dispatchEvent(new Event('online')));await alice.getByRole('alert').filter({hasText:'Temporary connection failure.'}).waitFor();failedReads.delete(`${users.alice}:get_profile_card`);await alice.getByRole('button',{name:'Try opening profile again',exact:true}).click();await alice.getByLabel('Profile status',{exact:true}).waitFor();assert.equal(await alice.getByLabel('Profile status',{exact:true}).inputValue(),'Unsaved reconnect draft')
 const extra=await a.context.newPage();extra.on('dialog',d=>d.accept());await extra.goto(profileUrl);await extra.getByLabel('Profile status',{exact:true}).fill('Saved on another device');await extra.getByRole('button',{name:'Save profile',exact:true}).click();await extra.getByText('Profile saved to your account.',{exact:true}).waitFor();await alice.evaluate(()=>window.dispatchEvent(new Event('online')));await alice.getByText('Profile changed on another device. Reload before saving.',{exact:true}).waitFor();assert.equal(await alice.getByLabel('Profile status',{exact:true}).inputValue(),'Unsaved reconnect draft');await alice.getByRole('button',{name:'Reload from account',exact:true}).click();await alice.getByLabel('Profile status',{exact:true}).waitFor();await alice.waitForFunction(()=>document.querySelector('[aria-label="Profile status"]')?.value==='Saved on another device')
 await alice.getByRole('tab',{name:'Sections',exact:true}).click();await alice.getByLabel('Show Photos',{exact:true}).uncheck();await alice.getByRole('button',{name:'Save profile',exact:true}).click();await alice.getByText('Profile saved to your account.',{exact:true}).waitFor();await bob.reload();await bob.getByRole('heading',{name:'Stxic',exact:true}).waitFor();assert.equal(await bob.getByAltText('Stxic shared photo 1',{exact:true}).count(),0)
 await asUser(users.alice,()=>sqlRpc('set_block',{p_user:users.bob,p_block:true}));await bob.reload();await bob.getByRole('alert').filter({hasText:'Profile unavailable.'}).waitFor();assert.equal(await bob.locator('.account-profile-card').count(),0)
 // Account portrait is used in communication; avatar editor still draws the independent character.
 await alice.goto(origin);await alice.waitForFunction(()=>document.querySelector('.account .account-portrait img')?.naturalWidth>0);await alice.goto(origin+'/?appearance');await alice.locator('.pixel-character').first().waitFor()
 assert.deepEqual(pageErrors,[]);const result={passed:true,transport:'Intercepted Auth/PostgREST/Storage/Edge with actual local PGlite SQL/RLS and image parser; not hosted Supabase',checks:['seven frame collections and three shapes','all eighteen centers transparent','frame preview, reset, no-frame, save and reload','two-user DM bubbles and long-message phone layout','lost-response upload retry via file selection and button','image uploads and publish/reload','separate character identity','private notes','shared roles','hidden media','blocked access','stale saves','failed-read draft recovery','desktop/390/320px']};await writeFile(resolve(output,'verification.json'),JSON.stringify(result,null,2));console.log('PASS',JSON.stringify(result))
}catch(e){for(const [i,c]of browser.contexts().entries())for(const [j,p]of c.pages().entries()){console.error('PAGE',i,j,(await p.locator('body').innerText().catch(()=>'' )).slice(-1800));await p.screenshot({animations:'disabled',path:resolve(output,`failure-${i}-${j}.png`),fullPage:true}).catch(()=>{})}throw e}finally{await browser.close();await queue;await db.close()}

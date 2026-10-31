// Intercepted Auth/PostgREST transport backed by local PGlite SQL/RLS, never the linked project.
// No real GoTrue, HTTP database connections, mail or Realtime is exercised here.
import { chromium } from 'playwright'
import { PGlite } from '@electric-sql/pglite'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import assert from 'node:assert/strict'
const root=resolve(import.meta.dirname,'../../..'),origin=process.env.REALM_UI_ORIGIN??'http://127.0.0.1:5175',output=resolve(root,'.impeccable/review/world-social')
await mkdir(output,{recursive:true})
const env=await readFile(resolve(root,'apps/web/.env.local'),'utf8'),backend=env.match(/^VITE_SUPABASE_URL=(.*)$/m)?.[1]?.trim()
assert.ok(backend,'Public backend URL needed only to intercept the configured client')
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
let queue=Promise.resolve(),requests=[],pageErrors=[],moveDelay=0
const failedReads=new Set()
function serialized(task) { const next=queue.then(task); queue=next.catch(()=>{}); return next }
async function asUser(id,task) {
 return serialized(async()=>{await db.exec('begin;set local role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,true)",[id]);try{const result=await task();await db.exec('commit');return result}catch(e){await db.exec('rollback');throw e}})
}
const sqlRpc=(name,args)=>{
 assert.match(name,/^[a-z_]+$/);for(const arg of Object.keys(args))assert.match(arg,/^p_[a-z_]+$/)
 return db.query(`select public."${name}"(${Object.keys(args).map((key,i)=>`"${key}"=>$${i+1}`).join(',')}) as result`,Object.values(args).map(v=>v&&typeof v==='object'?JSON.stringify(v):v)).then(r=>r.rows[0].result)
}
const browser=await chromium.launch({channel:process.env.REALM_BROWSER_CHANNEL??'chrome',headless:true})
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
   if(url.pathname.includes('/rpc/')) {
    const name=url.pathname.split('/').pop(),args=req.postDataJSON()??{};requests.push({user:user.id,name,args})
    if(name==='move_home'&&moveDelay)await new Promise(r=>setTimeout(r,moveDelay))
    if(failedReads.has(`${user.id}:${name}`))return reply({code:'fixture_offline',message:'Temporary connection failure.'},503)
    return reply(await asUser(user.id,()=>sqlRpc(name,args)))
   }
   const table=url.pathname.split('/').pop();assert.ok(['spaces','channels','homes','profiles','profile_appearances','user_blocks','account_portraits','direct_conversations'].includes(table),`Unhandled fixture table ${table}`)
   const values=[],filters=[]
   for(const [column,value] of url.searchParams)if(value.startsWith('eq.')){assert.match(column,/^[a-z_]+$/);values.push(value.slice(3));filters.push(`"${column}"=$${values.length}`)}
   const rows=await asUser(user.id,()=>db.query(`select * from public."${table}"${filters.length?' where '+filters.join(' and '):''}`,values).then(r=>r.rows))
   return reply(req.headers().accept?.includes('vnd.pgrst.object')?rows[0]:rows)
  }catch(e){return reply({code:e.code??'fixture',message:e.message,details:e.detail},e.code==='PT409'?409:e.code==='PT429'?429:e.code==='42501'?403:400)}
 })
 const page=await context.newPage();page.setDefaultTimeout(20000);page.on('pageerror',e=>{if(!brokenRenderer||!e.message.includes('fixture renderer failure'))pageErrors.push(e.message)});page.on('dialog',d=>d.accept())
 return {context,page}
}
const hallUrl=origin+'/?server-hall='+space,homeUrl=origin+'/?home='+users.alice
const refresh=page=>page.getByRole('button',{name:'Refresh shared hall',exact:true}).click()
const openHallDetails=async page=>{await page.getByRole('button',{name:'Refresh shared hall',exact:true}).waitFor();const toggle=page.getByRole('button',{name:'Board & settings',exact:true});if(await toggle.isVisible())await toggle.click()}
const homeRefresh=page=>page.getByRole('button',{name:'Refresh home social',exact:true}).click()
const overflow=async page=>assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)
try {
 const a=await contextFor('alice'),b=await contextFor('bob'),m=await contextFor('moderator'),o=await contextFor('outsider'),alice=a.page,bob=b.page,mod=m.page,outsider=o.page
 await alice.goto(homeUrl);await alice.getByRole('heading',{name:'Guestbook',exact:true}).waitFor()
 // New direct movement is exercised against the actual local SQL function/RLS.
 await bob.goto(homeUrl);await bob.locator('.room-canvas canvas').waitFor()
 // Room conversation and typing use permission-checked SQL across separate browser identities.
 const eventually=async(check,label)=>{for(let i=0;i<40;i++){if(await check())return;await new Promise(r=>setTimeout(r,100))}assert.fail(label)}
 const roomState=()=>asUser(users.alice,()=>sqlRpc('world_activity_snapshot',{p_kind:'home',p_scope:users.alice}))
 const roomInput=alice.getByLabel('Say something in this room',{exact:true})
 await roomInput.fill('Hello in the shared world')
 await eventually(async()=> (await roomState()).activity.some(a=>a.user_id===users.alice&&a.typing_until),'typing is shared')
 await roomInput.fill('')
 await eventually(async()=> !(await roomState()).activity.some(a=>a.user_id===users.alice&&a.typing_until),'draft clear stops typing')
 await roomInput.fill('Hello in the shared world');await alice.getByRole('button',{name:'Say',exact:true}).click()
 await bob.locator('.world-conversation').getByText('Hello in the shared world',{exact:true}).waitFor()
 assert.equal((await roomState()).messages[0].author_id,users.alice)
 assert.equal((await roomState()).activity.find(a=>a.user_id===users.alice)?.typing_until,null)

 const clickHomeTile=async(page,x,y)=>{const box=await page.locator('.room-canvas canvas').boundingBox();await page.mouse.click(box.x+(x+.5)*box.width/16,box.y+(y+.5)*box.height/12)}
 await bob.evaluate(()=>document.fonts.ready);const sharedHomeBounds=await bob.locator('.room-canvas').boundingBox()
 await clickHomeTile(bob,2,2);await bob.locator('.scene-arrival').getByRole('button',{name:'Sit at PC',exact:true}).waitFor()
 for(const key of ['x','y','width','height'])assert.ok(Math.abs((await bob.locator('.room-canvas').boundingBox())[key]-sharedHomeBounds[key])<1,'shared Home arrival keeps scene geometry')
 const readBob=()=>serialized(()=>db.query('select x,y,sequence from public.home_visits where user_id=$1',[users.bob]).then(r=>r.rows[0]))
 const besideDesk=await readBob();assert.ok(besideDesk.sequence>1,'arrival uses multiple validated moves')
 assert.ok((besideDesk.x===1||besideDesk.x===5)&&besideDesk.y>=2&&besideDesk.y<4 || (besideDesk.y===1||besideDesk.y===4)&&besideDesk.x>=2&&besideDesk.x<5)
 await bob.locator('.scene-arrival').getByRole('button',{name:'Sit at PC',exact:true}).click();assert.deepEqual(await readBob(),besideDesk,'sitting never invents a shared coordinate')
 await alice.locator('.visitor-list li').filter({hasText:'Bob'}).getByText(`Column ${besideDesk.x+1}, row ${besideDesk.y+1}`,{exact:true}).waitFor()
 await bob.locator('.room-object-detail').getByRole('button',{name:'Open Workstation',exact:true}).click()
 await bob.getByRole('dialog').getByRole('button',{name:'Start timer',exact:true}).click();await bob.keyboard.press('Escape')
 await eventually(async()=> (await roomState()).activity.some(a=>a.user_id===users.bob&&a.focus_target==='desk'&&a.focus_until),'focus state synchronized to another visitor')

 moveDelay=350;const beforeRequests=requests.filter(r=>r.user===users.bob&&r.name==='move_home').length
 await clickHomeTile(bob,14,10)
 for(let i=0;i<100&&requests.filter(r=>r.user===users.bob&&r.name==='move_home').length===beforeRequests;i++)await new Promise(r=>setTimeout(r,10))
 await clickHomeTile(bob,8,5);await bob.locator('.room-main .walk-summary').getByText('Destination reached.',{exact:false}).waitFor();moveDelay=0
 assert.deepEqual({x:(await readBob()).x,y:(await readBob()).y},{x:8,y:5})
 await eventually(async()=> !(await roomState()).activity.some(a=>a.user_id===users.bob&&a.focus_until),'walking clears shared focus')
 // A new owner revision ends this active route; no remaining queued steps may bypass it.
 await clickHomeTile(bob,14,10)
 await asUser(users.alice,async()=>{const home=await db.query('select * from public.homes where owner_id=$1',[users.alice]).then(r=>r.rows[0]);return sqlRpc('save_home',{p_layout:home.layout,p_privacy:'private',p_revision:home.revision})})
 await bob.getByRole('heading',{name:'This visit has ended.',exact:true}).waitFor()
 const stopped=requests.filter(r=>r.user===users.bob&&r.name==='move_home').length;await new Promise(r=>setTimeout(r,700));assert.equal(requests.filter(r=>r.user===users.bob&&r.name==='move_home').length,stopped,'revoked route stops')
 await asUser(users.alice,async()=>{const home=await db.query('select * from public.homes where owner_id=$1',[users.alice]).then(r=>r.rows[0]);return sqlRpc('save_home',{p_layout:home.layout,p_privacy:'friends',p_revision:home.revision})})
 await alice.reload();await alice.getByRole('heading',{name:'Guestbook',exact:true}).waitFor();await bob.reload()
 await bob.goto(homeUrl);await bob.getByLabel('Leave a guestbook entry').fill('Hello from another account.');await bob.getByRole('button',{name:'Post entry',exact:true}).focus();await bob.keyboard.press('Enter')
 await bob.getByText('Guestbook entry saved.',{exact:true}).waitFor();await homeRefresh(alice);await alice.getByText('Hello from another account.',{exact:true}).waitFor()
 // Item content uses the real permission-checked RPCs across two identities.
 async function openNotebook(page){await page.locator('.room-object-list button').filter({hasText:'Coffee table'}).click();await page.locator('.room-object-detail').getByRole('button',{name:'Open Notebook',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Room Sticky Notes',exact:true}).click()}
 await openNotebook(alice);let sheet=alice.getByRole('dialog');await sheet.getByLabel('Write Note',{exact:true}).fill('Shared owner sticky');await sheet.getByRole('button',{name:'Add note',exact:true}).click();await sheet.getByText('Shared owner sticky',{exact:true}).waitFor();await alice.keyboard.press('Escape')
 await openNotebook(bob);sheet=bob.getByRole('dialog');await sheet.getByText('Shared owner sticky',{exact:true}).waitFor();assert.equal(await sheet.getByRole('button',{name:'Add note',exact:true}).count(),0,'visitor cannot edit owner stickies')
 failedReads.add(`${users.bob}:home_item_content`);await sheet.getByRole('button',{name:'Reload shared content',exact:true}).click();await sheet.getByRole('alert').filter({hasText:'Temporary connection failure.'}).waitFor();assert.equal(await sheet.getByText('Shared owner sticky',{exact:true}).count(),0,'failed reads clear protected stickies');failedReads.delete(`${users.bob}:home_item_content`);await sheet.getByRole('button',{name:'Guestbook',exact:true}).click();await sheet.getByRole('heading',{name:'Guestbook',exact:true}).waitFor();assert.equal(await sheet.locator('.home-social-navigation').isVisible(),false);await bob.keyboard.press('Escape')
 await alice.locator('.room-object-list button').filter({hasText:'Bookshelf'}).click();await alice.locator('.room-object-detail').getByRole('button',{name:'Browse Shelf',exact:true}).click();sheet=alice.getByRole('dialog');await sheet.getByLabel('Book or resource title').fill('Community reading');await sheet.getByLabel('Resource HTTPS address').fill('https://example.com/reading');await sheet.getByRole('button',{name:'Add bookmark',exact:true}).click();await sheet.getByRole('link',{name:/Community reading/}).waitFor();await alice.keyboard.press('Escape')
 await bob.locator('.room-object-list button').filter({hasText:'Bookshelf'}).click();await bob.locator('.room-object-detail').getByRole('button',{name:'Browse Shelf',exact:true}).click();await bob.getByRole('dialog').getByRole('link',{name:/Community reading/}).waitFor();await bob.keyboard.press('Escape')
 await alice.getByRole('button',{name:'Home social settings',exact:true}).click();assert.equal(await alice.locator('.home-social-settings').evaluate(el=>el.open),true);assert.equal(await alice.locator('.home-social-settings summary').evaluate(el=>el===document.activeElement),true);await alice.getByRole('button',{name:'Add project link',exact:true}).click()
 await alice.getByLabel('Link title',{exact:true}).fill('My project');await alice.getByLabel('HTTPS address',{exact:true}).fill('javascript:alert(1)');await alice.getByRole('button',{name:'Save home social settings',exact:true}).click();await alice.getByText('Give each link a title and a full HTTPS address.',{exact:true}).waitFor()
 await alice.getByLabel('HTTPS address',{exact:true}).fill('https://example.com/project');await alice.getByLabel('Guestbook posting',{exact:true}).selectOption('closed');await alice.getByRole('button',{name:'Save home social settings',exact:true}).click();await alice.getByText('Home social settings saved.',{exact:true}).waitFor()
 await alice.getByLabel('Link title',{exact:true}).fill('Unsaved link draft')
 failedReads.add(`${users.alice}:home_social`);await homeRefresh(alice);await alice.getByRole('alert').filter({hasText:'Temporary connection failure.'}).waitFor();assert.equal(await alice.getByLabel('Link title',{exact:true}).isVisible(),false)
 failedReads.delete(`${users.alice}:home_social`);await homeRefresh(alice);await alice.getByLabel('Link title',{exact:true}).waitFor();assert.equal(await alice.getByLabel('Link title',{exact:true}).inputValue(),'Unsaved link draft');await alice.getByLabel('Link title',{exact:true}).fill('My project')
 await homeRefresh(bob);await bob.getByText('The owner has closed guestbook posting.',{exact:true}).waitFor()
 const link=bob.getByRole('link',{name:'My project',exact:false});assert.equal(await link.getAttribute('href'),'https://example.com/project');assert.equal(await link.getAttribute('rel'),'noopener noreferrer')
 await bob.getByRole('button',{name:'Open guestbook',exact:true}).click();assert.equal(await bob.locator('#guestbook-heading').evaluate(el=>el.parentElement===document.activeElement),true)
 await alice.getByRole('button',{name:'Remove entry by Bob',exact:true}).click();await alice.getByText('Entry removed.',{exact:true}).waitFor();await homeRefresh(bob);await bob.getByText('Hello from another account.',{exact:true}).waitFor({state:'detached'})
 // Old DB-catalog metadata and saved arrangements load in the actual frontend/renderer.
 await bob.reload();await bob.getByRole('heading',{name:'Project desk',exact:true}).waitFor();await bob.locator('.walk-menu summary').click();await bob.getByRole('button',{name:'Move up',exact:true}).click()
 await bob.getByRole('button',{name:'Project desk',exact:true}).click();await bob.getByRole('button',{name:'Open project links',exact:true}).click()
 await bob.setViewportSize({width:390,height:844});await overflow(bob);await bob.screenshot({path:resolve(output,'home-phone.png'),fullPage:true})
 await alice.screenshot({path:resolve(output,'home-desktop.png'),fullPage:true})
 await outsider.goto(homeUrl);await outsider.getByRole('heading',{name:'This visit has ended.'}).waitFor();assert.equal(await outsider.getByText('My project',{exact:true}).count(),0)
 // Optional shared state starts disabled; owners opt in without changing the personal hub.
 await alice.goto(hallUrl);await openHallDetails(alice);await alice.getByRole('button',{name:'Enable shared hall',exact:true}).click();await alice.getByRole('heading',{name:'Announcement board',exact:true}).waitFor()
 await alice.getByRole('button',{name:'Grant decorator: Bob',exact:true}).click();await alice.getByRole('button',{name:'Revoke decorator: Bob',exact:true}).waitFor()
 await alice.getByLabel('West portal destination',{exact:true}).selectOption(channel);await alice.getByRole('button',{name:'Save channel portals',exact:true}).click();await alice.getByRole('button',{name:'Save channel portals',exact:true}).waitFor({state:'visible'});await alice.waitForFunction(()=>document.querySelector('.shared-hall-portals button')?.disabled===false);assert.equal(await alice.getByText('The hall changed. Reload destinations before saving.',{exact:true}).count(),0)
 await alice.getByLabel('New announcement',{exact:true}).fill('Welcome to our shared hall.');await alice.getByRole('button',{name:'Publish announcement',exact:true}).click();await alice.getByText('Announcement saved.',{exact:true}).waitFor()
 await bob.goto(hallUrl);await openHallDetails(bob);await bob.getByText('Welcome to our shared hall.',{exact:true}).waitFor();assert.equal(await bob.getByLabel('New announcement',{exact:true}).count(),0)
 await alice.getByRole('textbox',{name:'Message this channel',exact:true}).fill('Hall message bridges into the world')
 await alice.getByRole('button',{name:'Send',exact:true}).click()
 await alice.locator('.hall-speech').getByText('Hall message', {exact:false}).waitFor()
 await bob.locator('.hall-conversation').getByText('Hall message bridges into the world',{exact:true}).waitFor()


 await alice.screenshot({path:resolve(output,'hall-desktop.png'),fullPage:true})
 await bob.setViewportSize({width:320,height:780});await overflow(bob);await bob.screenshot({path:resolve(output,'hall-phone.png'),fullPage:true})
 await bob.getByRole('button',{name:'Decorate shared hall',exact:true}).click();await bob.getByRole('button',{name:'Remove component',exact:true}).click();await bob.getByRole('button',{name:'Undo',exact:true}).click();await bob.getByRole('button',{name:'Redo',exact:true}).click();await bob.getByRole('button',{name:'Save hall',exact:true}).click();await bob.getByText('Shared hall saved for server members.',{exact:true}).waitFor()
 assert.equal(await bob.evaluate(id=>localStorage.getItem('stxic-realm:hall:v1:'+id),users.bob),null,'shared saves never overwrite personal local layouts')
 await bob.reload();await bob.getByRole('button',{name:'Decorate shared hall',exact:true}).waitFor();await refresh(alice)
 await alice.waitForFunction(()=>document.querySelector('.hall-pixel-canvas')?.getAttribute('aria-label')?.includes('8 independently'))
 // A saved shared layout reloads for another member; stale drafts retain edits and require reload.
 await alice.getByRole('button',{name:'Decorate shared hall',exact:true}).click();await alice.getByRole('button',{name:'Add Potted fern',exact:true}).click()
 await bob.getByRole('button',{name:'Decorate shared hall',exact:true}).click();await bob.getByRole('button',{name:'Add Brass lantern',exact:true}).click();await bob.getByRole('button',{name:'Save hall',exact:true}).click();await bob.getByText('Shared hall saved for server members.',{exact:true}).waitFor()
 await alice.evaluate(()=>window.dispatchEvent(new Event('online')));await alice.getByText('The shared hall changed on the server. Reload before saving your changes.',{exact:true}).waitFor();assert.equal(await alice.getByRole('button',{name:'Save hall',exact:true}).isDisabled(),true)
 await alice.getByRole('button',{name:'Reload saved hall',exact:true}).click();await alice.getByText('Loaded the saved hall.',{exact:true}).waitFor()
 await alice.setViewportSize({width:390,height:844});await overflow(alice);await alice.screenshot({path:resolve(output,'editor-phone.png'),fullPage:true})
 const canvas=alice.locator('.hall-pixel-canvas');await canvas.focus();await alice.keyboard.press('ArrowRight');await alice.getByLabel('Column',{exact:true}).fill('8');await alice.getByLabel('Row',{exact:true}).fill('8');await alice.getByRole('button',{name:'Move component',exact:true}).click()
 // Moderator can edit/remove content; ordinary decorators cannot. Server rejects stale board edits.
 await mod.goto(hallUrl);await mod.getByLabel('New announcement',{exact:true}).fill('Unsaved announcement draft')
 failedReads.add(`${users.moderator}:get_server_hall`);await refresh(mod);await mod.getByRole('alert').filter({hasText:'Temporary connection failure.'}).waitFor();assert.equal(await mod.getByLabel('New announcement',{exact:true}).isVisible(),false)
 failedReads.delete(`${users.moderator}:get_server_hall`);await refresh(mod);await mod.getByLabel('New announcement',{exact:true}).waitFor();assert.equal(await mod.getByLabel('New announcement',{exact:true}).inputValue(),'Unsaved announcement draft')
 await mod.getByRole('button',{name:'Edit announcement',exact:true}).click();await mod.getByLabel('Edit announcement',{exact:true}).fill('Moderator revised this announcement.');await mod.getByRole('button',{name:'Save announcement edit',exact:true}).click();await mod.getByText('Moderator revised this announcement.',{exact:true}).waitFor()
 await alice.goto(hallUrl);await openHallDetails(alice);await alice.getByRole('button',{name:'Revoke decorator: Bob',exact:true}).click();await bob.evaluate(()=>window.dispatchEvent(new Event('online')));await bob.getByText('Editing permission changed. Your draft is still open. Reload to check current access.',{exact:true}).waitFor();assert.equal(await bob.getByRole('button',{name:'Save hall',exact:true}).isDisabled(),true)
 await alice.getByRole('button',{name:'Disable shared hall',exact:true}).click();await mod.getByRole('button',{name:'Refresh shared hall',exact:true}).click();await mod.getByText('This server’s hall is disabled. Its saved arrangement is retained. Chat remains available.',{exact:true}).waitFor();assert.equal(await mod.locator('.hall-pixel-canvas').count(),0);assert.ok(await mod.getByRole('link',{name:'Return to chat',exact:true}).getAttribute('href'))
 await alice.getByRole('button',{name:'Enable shared hall',exact:true}).click();await mod.reload();await mod.getByText('Moderator revised this announcement.',{exact:true}).waitFor()
 await outsider.goto(hallUrl);await outsider.getByRole('alert').filter({hasText:'Space unavailable or permission changed.'}).waitFor();assert.equal(await outsider.locator('.hall-pixel-canvas').count(),0)
 const broken=await contextFor('alice',true);await broken.page.goto(hallUrl);await broken.page.getByText('The hall scene could not load. Channel controls, announcements and chat are still available.',{exact:true}).waitFor();await broken.page.getByRole('heading',{name:'Announcement board',exact:true}).waitFor()
 await broken.page.getByRole('button',{name:'West channel portal · #general',exact:true}).click();await broken.page.locator('.scene-arrival').getByRole('button',{name:'Enter channel #general',exact:true}).click();await broken.page.getByRole('textbox',{name:'Message #general',exact:true}).fill('Chat survives the renderer failure.');await broken.page.getByRole('button',{name:'Send',exact:true}).click();await broken.page.getByText('Chat survives the renderer failure.',{exact:true}).waitFor();await broken.page.goto(hallUrl)
 await broken.page.getByRole('button',{name:'Decorate shared hall',exact:true}).click();await broken.page.getByText('The hall preview could not load. You can still arrange components using the list and position fields.',{exact:true}).waitFor();await broken.page.getByLabel('Column',{exact:true}).fill('8');await broken.page.getByRole('button',{name:'Move component',exact:true}).click();assert.ok(await broken.page.getByRole('link',{name:'Back to the hall',exact:true}).getAttribute('href'))
 const sharedHallBounds=await mod.locator('.shared-hall-scene').boundingBox();await mod.getByRole('button',{name:'West channel portal · #general',exact:true}).focus();await mod.keyboard.press('Enter');await mod.locator('.scene-arrival').getByRole('button',{name:'Enter channel #general',exact:true}).waitFor();for(const key of ['x','y','width','height'])assert.ok(Math.abs((await mod.locator('.shared-hall-scene').boundingBox())[key]-sharedHallBounds[key])<1,'shared Hall arrival keeps scene geometry');await mod.locator('.scene-arrival').getByRole('button',{name:'Enter channel #general',exact:true}).click();await mod.waitForURL('**/?space=*&channel=*');await mod.getByRole('textbox',{name:'Message #general',exact:true}).waitFor()
 // Simulated reconnect reloads persisted SQL state, and later revocation clears protected views.
 await asUser(users.alice,()=>sqlRpc('manage_space',{p_action:'remove',p_space:space,p_target:users.moderator,p_revision:0}))
 await mod.goto(hallUrl);await mod.getByRole('alert').filter({hasText:'Space unavailable or permission changed.'}).waitFor()
 // Viewport regression: stress only this disposable local fixture, never hosted data.
 const workspaceOutput=resolve(root,'.impeccable/review/workspace-layout');await mkdir(workspaceOutput,{recursive:true})
 await serialized(()=>db.query("insert into public.channels(space_id,name) select $1,'topic-'||n from generate_series(1,40) n",[space]))
 await serialized(async()=>{await db.exec('begin');try{await db.query("select set_config('request.jwt.claim.sub',$1,true)",[users.alice]);await db.exec("update realm_private.settings set value='1000' where key='send_burst'");await db.query("insert into public.messages(channel_id,author_id,client_id,body) select $1,$2,gen_random_uuid(),'A conversation with enough history to scroll. Message '||n from generate_series(1,45) n",[channel,users.alice]);await db.exec('commit')}catch(e){await db.exec('rollback');throw e}})
 const viewportFit=async(page,label)=>{const b=await page.evaluate(()=>({x:document.documentElement.scrollWidth-innerWidth,y:document.documentElement.scrollHeight-innerHeight}));assert.ok(b.x<=1&&b.y<=1,`${label}: ${JSON.stringify(b)}`)}
 const visibleInViewport=async(page,selector,label)=>assert.ok(await page.locator(selector).evaluate(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&r.top>=0&&r.bottom<=innerHeight+1}),label)
 for(const [label,width,height]of [['desktop',1440,900],['laptop',1280,720],['narrow',663,844],['phone',390,844],['landscape',844,390]]){
  await alice.setViewportSize({width,height});await alice.goto(`${origin}/?space=${space}&channel=${channel}`)
  await alice.locator('#stream-body').waitFor();await alice.getByText('A conversation with enough history to scroll. Message 45',{exact:true}).waitFor({state:'attached'})
  await viewportFit(alice,`chat ${label}`);await visibleInViewport(alice,'.composer',`composer ${label}`)
  const before=await alice.locator('.chat-header').boundingBox()
  await alice.locator('.dm-thread').evaluate(e=>e.scrollTop=0)
  assert.equal((await alice.locator('.chat-header').boundingBox()).y,before.y,'chat heading stays in place')
  await visibleInViewport(alice,'.composer',`composer after scroll ${label}`)
  if(width>800){
   const heading=await alice.locator('.sidebar-heading').boundingBox()
   assert.ok(await alice.locator('.sidebar>nav').evaluate(e=>e.scrollHeight>e.clientHeight),'long channels scroll inside their list')
   await alice.locator('.sidebar>nav').evaluate(e=>e.scrollTop=e.scrollHeight)
   assert.equal((await alice.locator('.sidebar-heading').boundingBox()).y,heading.y)
   await visibleInViewport(alice,'.account',`account controls ${label}`)
  }else await visibleInViewport(alice,'.account',`compact account controls ${label}`)
  await alice.locator('.dm-thread').evaluate(e=>e.scrollTop=e.scrollHeight)
  await alice.screenshot({path:resolve(workspaceOutput,`chat-${label}.png`),fullPage:true})
  await alice.goto(homeUrl);await alice.locator('.room-canvas canvas').waitFor();await viewportFit(alice,`shared home ${label}`);await visibleInViewport(alice,'.room-main .walk-menu summary',`home controls ${label}`)
  if(width<=900)await alice.getByRole('button',{name:'People, objects & guestbook',exact:true}).click()
  await alice.getByRole('button',{name:'Home social settings',exact:true}).click();await alice.getByRole('button',{name:'Save home social settings',exact:true}).scrollIntoViewIfNeeded();await viewportFit(alice,`home social ${label}`)
  if(width<=900)await alice.getByRole('button',{name:'Room',exact:true}).click()
  await alice.waitForFunction(()=>{const h=document.querySelector('.room-canvas')?.getBoundingClientRect(),c=document.querySelector('.room-canvas canvas')?.getBoundingClientRect();return h&&c&&c.width>=h.width*.9&&c.height>=h.height*.9})
  await alice.screenshot({path:resolve(workspaceOutput,`shared-home-${label}.png`),fullPage:true})
  await alice.goto(hallUrl);await alice.locator('.shared-hall-scene .hall-pixel-canvas').waitFor();await viewportFit(alice,`shared hall ${label}`)
  await openHallDetails(alice);await alice.getByLabel('West portal destination',{exact:true}).scrollIntoViewIfNeeded();await viewportFit(alice,`hall settings ${label}`)
  if(width<=900)await alice.getByRole('button',{name:'Hall',exact:true}).click()
  await alice.screenshot({path:resolve(workspaceOutput,`shared-hall-${label}.png`),fullPage:true})
 }
 await alice.setViewportSize({width:1280,height:720});await alice.goto(origin+'/?spaces');await alice.getByRole('heading',{name:'Server Halls',exact:true}).waitFor();await viewportFit(alice,'personal halls')
 await alice.getByRole('link',{name:'Create a server',exact:true}).click();await alice.getByRole('button',{name:'Create space',exact:true}).waitFor();await viewportFit(alice,'server management pane')
 await alice.locator('.hall-management>summary').click();await alice.locator('.hall-scene').waitFor();await viewportFit(alice,'return to halls')
 for(const [label,width,height] of [['wide',1920,972],['phone',390,844]]){
  await alice.setViewportSize({width,height});await viewportFit(alice,`personal halls ${label}`)
  await alice.screenshot({path:resolve(output,`personal-halls-${label}.png`),fullPage:true})
  if(width<=900)await alice.getByRole('button',{name:'Servers & channels',exact:true}).click()
  await alice.locator('.hall-enter').scrollIntoViewIfNeeded();await visibleInViewport(alice,'.hall-enter',`personal hall Enter ${label}`)
  await alice.getByRole('link',{name:'Join a server',exact:true}).click();await alice.getByLabel('Membership invitation',{exact:true}).waitFor();await viewportFit(alice,`personal hall management ${label}`)
  await alice.locator('.hall-management>summary').click()
  if(width<=900)await alice.getByRole('button',{name:'Hall',exact:true}).click()
  await alice.locator('.hall-scene').waitFor()
 }
 assert.deepEqual(pageErrors,[])
 const result={transport:'intercepted Auth/PostgREST with real local PGlite RLS; not live Supabase',passed:true,requests:requests.length,screenshots:['home-phone','home-desktop','hall-desktop','hall-phone','editor-phone']}
 await writeFile(resolve(output,'verification.json'),JSON.stringify(result,null,2));console.log('PASS',JSON.stringify(result))
}catch(e){
 for(const [i,context]of browser.contexts().entries())for(const [j,page]of context.pages().entries()){
  await page.screenshot({path:resolve(output,`failure-${i}-${j}.png`),fullPage:true}).catch(()=>{})
  console.error('FAILED PAGE',i,j,page.url(),(await page.locator('body').innerText().catch(()=>'' )).slice(-2400))
 }
 throw e
}finally{await browser.close();await queue;await db.close()}

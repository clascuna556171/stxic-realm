// Intercepted Auth/PostgREST transport backed by local PGlite SQL/RLS, never the linked project.
// No real GoTrue, HTTP database connections, mail or Realtime is exercised here.
import { chromium } from 'playwright'
import { PGlite } from '@electric-sql/pglite'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import assert from 'node:assert/strict'
const root=resolve(import.meta.dirname,'../../..'),origin=process.env.REALM_UI_ORIGIN??'http://127.0.0.1:5175',output=resolve(root,'.impeccable/review/community-places')
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
begin;insert into public.spaces(id,name) values('${space}','Alpha Testing Grounds');
insert into public.space_members(space_id,user_id,role) values('${space}','${users.alice}','owner'),('${space}','${users.bob}','member'),('${space}','${users.moderator}','moderator');
insert into public.channels(id,space_id,name) values('${channel}','${space}','general');commit;`)
let queue=Promise.resolve(),requests=[],pageErrors=[]
function serialized(task) { const next=queue.then(task); queue=next.catch(()=>{}); return next }
async function asUser(id,task) {
 return serialized(async()=>{await db.exec('begin;set local role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,true)",[id]);try{const result=await task();await db.exec('commit');return result}catch(e){await db.exec('rollback');throw e}})
}
const sqlRpc=(name,args)=>{
 assert.match(name,/^[a-z_]+$/);for(const arg of Object.keys(args))assert.match(arg,/^p_[a-z_]+$/)
 return db.query(`select public."${name}"(${Object.keys(args).map((key,i)=>`"${key}"=>$${i+1}`).join(',')}) as result`,Object.entries(args).map(([key,v])=>key==='p_pet_ids'?'{'+v.join(',')+'}':v&&typeof v==='object'?JSON.stringify(v):v)).then(r=>r.rows[0].result)
}

const secondChannel='80000000-0000-4000-8000-000000000009'
await db.query("insert into public.channels(id,space_id,name) values($1,$2,'albertos-pizza')",[secondChannel,space])
for(const [actor,body]of [[users.bob,'Anyone around for a little room building tonight?'],[users.alice,'Iâ€™m here! Just adding a few things to the shared hall.'],[users.moderator,'The new rooms are looking good. Iâ€™ll stop by after dinner.']])await asUser(actor,()=>sqlRpc('message_send',{p_kind:'channel',p_stream:channel,p_body:body,p_client:crypto.randomUUID()}))
const browser=await chromium.launch({channel:process.env.REALM_BROWSER_CHANNEL??'chrome',headless:true,args:['--disable-features=LocalNetworkAccessChecks']})
let failMembers=false, failList=false, holdList=false, failCommunity=false,holdChange=false
async function fixture(actor='alice'){
 const user={id:users[actor],email:actor+'@example.invalid',email_confirmed_at:new Date().toISOString(),aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{}}
 const b64=value=>Buffer.from(JSON.stringify(value)).toString('base64url'),token=`${b64({alg:'HS256',typ:'JWT'})}.${b64({sub:user.id,exp:Math.floor(Date.now()/1000)+3600,role:'authenticated'})}.fixture`
 const session={access_token:token,refresh_token:'fixture',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user}
 const context=await browser.newContext({viewport:{width:1630,height:886}})
 await context.addInitScript(({key,session})=>localStorage.setItem(key,JSON.stringify(session)),{key:storageKey,session})
 await context.routeWebSocket('**/realtime/v1/**',ws=>ws.close())
 await context.route('**/*',async route=>{
  const req=route.request(),url=new URL(req.url())
  if(url.origin===origin)return route.continue()
  if(url.origin!==new URL(backend).origin)return route.abort()
  const reply=(value,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(value),headers:{'Access-Control-Allow-Origin':origin}})
  if(req.method()==='OPTIONS')return reply({})
  if(url.pathname.startsWith('/auth/v1/'))return reply(url.pathname.endsWith('/user')?user:session)
  try{
   if(url.pathname.includes('/rpc/')){
    const name=url.pathname.split('/').pop(),args=req.postDataJSON()??{};requests.push({name,args})
    if(failCommunity&&name==='community_state')return reply({code:'fixture_offline',message:'Temporary connection failure. Retry activities.'},503)
    if(holdChange&&name==='community_change')await new Promise(r=>setTimeout(r,800))
    if(failMembers&&name==='space_admin_data')return reply({code:'fixture_offline',message:'Temporary connection failure.'},503)
    return reply(await asUser(user.id,()=>sqlRpc(name,args)))
   }
   const table=url.pathname.split('/').pop();if(table==='spaces'&&holdList)await new Promise(r=>setTimeout(r,2000));if(table==='spaces'&&failList)return reply({message:'Server list offline'},503);assert.ok(['spaces','channels','profiles','profile_appearances','account_portraits','space_members'].includes(table),`Unhandled fixture table ${table}`)
   const values=[],filters=[]
   for(const [column,value]of url.searchParams)if(value.startsWith('eq.')){assert.match(column,/^[a-z_]+$/);values.push(value.slice(3));filters.push(`"${column}"=$${values.length}`)}
   const rows=await asUser(user.id,()=>db.query(`select * from public."${table}"${filters.length?' where '+filters.join(' and '):''}`,values).then(result=>result.rows))
   return reply(req.headers().accept?.includes('vnd.pgrst.object')?rows[0]:rows)
  }catch(error){console.error('FIXTURE ERROR',url.pathname,error.message??error);return reply({code:error.code??'fixture',message:error.message},400)}
 })
 const page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',error=>pageErrors.push(error.message))
 return page
}

const checks=[]
async function check(name,fn){await fn();checks.push(name);console.log('PASS',name)}
async function fits(page){assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1&&document.documentElement.scrollHeight<=innerHeight+1),'viewport overflow')}
async function refresh(page){await page.getByRole('button',{name:'Refresh activities',exact:true}).click();await page.getByRole('heading',{name:'Community activities'}).waitFor();await page.waitForTimeout(200)}
async function section(page,name){await page.getByRole('navigation',{name:'Community sections'}).getByRole('button',{name,exact:true}).click()}
async function sql(actor,name,args){return asUser(users[actor],()=>sqlRpc(name,args))}
const captures=[]
async function capture(page,name){await page.locator('.shared-hall-sidebar').evaluate(e=>e.scrollTop=0);const path=resolve(output,name+'.png');await page.screenshot({path,fullPage:true});captures.push(path)}
try{
 await sql('alice','manage_server_hall',{p_space:space,p_action:'enabled',p_revision:0,p_enabled:true})
 const page=await fixture(),bob=await fixture('bob')
 await page.setViewportSize({width:1440,height:900});await page.goto(origin+'/?server-hall='+space);await page.getByRole('button',{name:'Start focus session',exact:true}).waitFor()
 await check('private first visit and honest empty state',async()=>{await fits(page);assert.equal((await serialized(()=>db.query('select count(*)::int n from realm_private.hall_visits'))).rows[0].n,0);assert.ok(await page.getByText('No focus session is running.',{exact:false}).isVisible());await capture(page,'desktop-empty')})
 await page.getByLabel('Session title',{exact:true}).fill('Welcome work hour');await page.getByRole('button',{name:'Start focus session',exact:true}).click();await page.getByRole('button',{name:'Join focus session',exact:true}).waitFor()
 await bob.goto(origin+'/?server-hall='+space);await bob.getByRole('button',{name:'Join focus session',exact:true}).waitFor()
 await check('two-client shared timer',async()=>{const a=await sql('alice','community_state',{p_space:space}),b=await sql('bob','community_state',{p_space:space});assert.equal(a.session.ends_at,b.session.ends_at);assert.equal(a.session.title,'Welcome work hour');assert.match(await bob.locator('.community-clock').innerText(),/^2[45]:\d{2}$/)})
 await bob.getByRole('button',{name:'Join focus session',exact:true}).click();await bob.getByRole('button',{name:'Leave focus session',exact:true}).waitFor()
 await check('join without walking or public presence',async()=>{const lease=(await serialized(()=>db.query('select token from realm_private.hall_visits where user_id=$1',[users.bob]))).rows[0].token;const state=await sql('bob','community_state',{p_space:space,p_token:lease});assert.equal(state.session.joined,true);assert.deepEqual(state.occupants,[]);assert.deepEqual(state.session.participants,[])})
 await bob.getByLabel('Show my name in this session',{exact:true}).check();await bob.getByRole('button',{name:'Update participant visibility',exact:true}).click();await refresh(page)
 await check('opt-in participant name visible to another member',async()=>{assert.ok((await sql('alice','community_state',{p_space:space})).session.participants.some(p=>p.id===users.bob));assert.ok(await page.getByRole('link',{name:'Bob',exact:true}).isVisible())})
 await bob.locator('.community-people summary').click();await bob.getByLabel('Show me in this hall',{exact:true}).check();await bob.getByLabel('Intent (optional)',{exact:true}).selectOption('chat');await bob.getByRole('button',{name:'Update hall presence',exact:true}).click();await refresh(page)
 await check('explicit hall presence and declared intent',async()=>{assert.equal((await sql('alice','community_state',{p_space:space})).occupants[0].intent,'chat')})
 await section(page,'Projects');await page.getByText('Start a community project',{exact:true}).click();await page.getByLabel('Project goal',{exact:true}).fill('A welcoming community guide');await page.getByLabel('Description',{exact:true}).fill('Help new members find a useful place and a friendly next step.');await page.getByLabel('Milestones (one per line, up to eight)',{exact:true}).fill('Draft the welcome guide\nCheck its links');await page.getByRole('button',{name:'Create project',exact:true}).click();await page.getByRole('heading',{name:'A welcoming community guide',exact:true}).waitFor()
 const project=(await sql('alice','community_state',{p_space:space})).projects[0]
 await refresh(bob);await section(bob,'Projects');await bob.getByText('Offer a contribution',{exact:true}).click();await bob.getByLabel('Your contribution',{exact:true}).fill('I wrote the guide and explained how to join the focus table.');await bob.getByRole('button',{name:'Submit contribution',exact:true}).click();await bob.getByText('Saved.',{exact:true}).waitFor()
 await refresh(page);await page.getByText('Contributions · 1 visible',{exact:true}).click();await page.getByRole('button',{name:'Accept contribution',exact:true}).click();await page.getByText('1 of 2 milestones accepted',{exact:true}).waitFor()
 await bob.getByLabel('Milestone',{exact:true}).selectOption('1');await bob.getByLabel('Your contribution',{exact:true}).fill('I checked all links and tested the new-member path.');await bob.getByRole('button',{name:'Submit contribution',exact:true}).click();await refresh(page);await page.getByRole('button',{name:'Accept contribution',exact:true}).filter({hasNot:page.locator('[disabled]')}).count()
 await page.getByRole('button',{name:'Accept contribution',exact:true}).and(page.locator(':enabled')).click();await page.getByText('2 of 2 milestones accepted',{exact:true}).waitFor();await page.getByText('Manage project',{exact:true}).click();await page.getByRole('button',{name:'Complete project',exact:true}).click();await page.getByRole('button',{name:'Commemorate in hall',exact:true}).waitFor()
 await check('project contributions reviewed and completed in the UI',async()=>{const state=await sql('alice','community_state',{p_space:space});assert.ok(state.projects[0].completed_at);assert.equal(state.projects[0].accepted.length,2);assert.equal(state.projects[0].contributions.length,2);await capture(page,'desktop-project')})
 await page.getByRole('button',{name:'Commemorate in hall',exact:true}).click();await section(page,'Memory');await page.getByRole('heading',{name:'A welcoming community guide',exact:true}).waitFor()
 await check('completed work becomes deliberate hall memory',async()=>{assert.equal((await sql('alice','community_state',{p_space:space})).memories[0].displayed,true);await capture(page,'desktop-memory')})
 await section(bob,'Noticeboard');await bob.getByLabel('Ask the community',{exact:true}).fill('Could someone help welcome members on Friday?');await bob.getByRole('button',{name:'Post help request',exact:true}).click();await bob.getByRole('button',{name:'Edit request',exact:true}).waitFor();await bob.getByRole('button',{name:'Edit request',exact:true}).click();await bob.getByLabel('Edit help request',{exact:true}).fill('Could someone help welcome new members next week?');await bob.getByRole('button',{name:'Save help request',exact:true}).click();await bob.getByRole('button',{name:'Mark resolved',exact:true}).click();await bob.getByRole('button',{name:'Mark resolved',exact:true}).waitFor({state:'detached'})
 await check('member help request editing and resolution',async()=>{const state=await sql('bob','community_state',{p_space:space});assert.equal(state.notices[0].resolved,true);assert.match(state.notices[0].body,/next week/);assert.equal(await bob.getByRole('button',{name:'Publish announcement',exact:true}).count(),0);assert.equal(await bob.getByText('Hall administration',{exact:true}).count(),0)})
 await section(page,'Noticeboard');await refresh(page);await page.getByRole('button',{name:'Report request',exact:true}).click();await page.getByRole('button',{name:'Submit report',exact:true}).click();await page.getByText('Report received. Authorized reviewers can investigate.',{exact:true}).waitFor()
 await check('entry report captures evidence in existing queue',async()=>{const reports=await sql('alice','report_queue',{p_space:space});assert.equal(reports[0].community_kind,'notice');assert.match(reports[0].evidence,/next week/)})
 await sql('alice','set_block',{p_user:users.bob,p_block:true});await refresh(page);await page.locator('.community-people summary').click()
 await check('blocked presence and requests removed on reconciliation',async()=>{assert.equal((await sql('alice','community_state',{p_space:space})).occupants.length,0);assert.equal((await sql('alice','community_state',{p_space:space})).notices.length,0)})
 await sql('alice','set_block',{p_user:users.bob,p_block:false});await section(bob,'Focus');await bob.getByRole('button',{name:'Leave focus session',exact:true}).click();await bob.getByRole('button',{name:'Join focus session',exact:true}).waitFor()
 await check('leave activity preserves ordinary chat access',async()=>{assert.equal((await sql('bob','community_state',{p_space:space})).session.joined,false);assert.ok(await bob.getByRole('link',{name:'Return to chat',exact:true}).isVisible())})
 await section(page,'Memory');await page.getByText('Preserve a memory',{exact:true}).click();await page.getByLabel('Memory type',{exact:true}).selectOption('conversation')
 const source=await sql('alice','message_send',{p_kind:'channel',p_stream:channel,p_body:'A welcoming first conversation.',p_client:crypto.randomUUID()})
 await page.getByLabel('Memory title',{exact:true}).fill('Our first hello');await page.getByLabel('Your channel message ID',{exact:true}).fill(source);await page.getByRole('button',{name:'Preserve memory',exact:true}).click();await page.getByRole('heading',{name:'Our first hello',exact:true}).waitFor()
 await serialized(()=>db.query("update public.messages set body='',removed_at=clock_timestamp() where id=$1",[source]));await refresh(page)
 await check('deliberate own-message preservation and source deletion',async()=>{await page.getByRole('heading',{name:'Our first hello',exact:true}).waitFor({state:'detached'});assert.equal((await sql('alice','community_state',{p_space:space})).memories.length,1)})
 await section(page,'Noticeboard');await page.getByLabel('Ask the community',{exact:true}).fill('An in-flight request during hall maintenance.');holdChange=true;await page.getByRole('button',{name:'Post help request',exact:true}).click();await page.locator('.community-hall-tools summary').click();await page.getByRole('button',{name:'Disable shared hall',exact:true}).click();await page.getByText('This server’s shared hall and activities are disabled.',{exact:false}).first().waitFor();await page.waitForTimeout(1000);holdChange=false
 await page.locator('.community-hall-tools summary').click();await page.getByRole('button',{name:'Enable shared hall',exact:true}).click();await page.getByRole('navigation',{name:'Community sections'}).waitFor();await section(page,'Noticeboard')
 await check('pending action does not lock controls across disable and enable',async()=>{assert.ok(await page.getByRole('button',{name:'Post help request',exact:true}).isEnabled())})
 // All viewports use the real new surface and real SQL-backed state.
 await page.locator('.community-people').evaluate(e=>e.open=false)
 for(const [name,width,height] of [['desktop',1440,900],['phone',390,844],['narrow',320,700],['landscape',720,450]]){
  await page.setViewportSize({width,height});await section(page,'Focus');await check(name+' conventional layout',async()=>{await fits(page);await page.getByRole('button',{name:'Join focus session',exact:true}).scrollIntoViewIfNeeded();assert.ok(await page.getByRole('button',{name:'Join focus session',exact:true}).isVisible());await page.locator('.shared-hall-sidebar').evaluate(e=>e.scrollTop=0);await capture(page,name+'-focus')})
  await section(page,'Memory');await page.locator('.shared-hall-sidebar').evaluate(e=>e.scrollTop=0);await capture(page,name+'-memory')
  await page.getByRole('button',{name:'Hall',exact:true}).click();await page.locator('.shared-hall-scene').waitFor();await fits(page);await capture(page,name+'-hall');await page.getByRole('button',{name:'Community',exact:true}).click()
 }
 await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:390,height:844});await section(page,'Focus');await page.getByRole('button',{name:'Projects',exact:true}).focus();await page.keyboard.press('Enter')
 await check('keyboard section access and reduced motion',async()=>{assert.equal(await page.getByRole('button',{name:'Projects',exact:true}).getAttribute('aria-pressed'),'true');assert.ok(await page.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches));await page.keyboard.press('Tab');assert.ok(await page.evaluate(()=>document.activeElement!==document.body))})
 await page.evaluate(()=>document.documentElement.dataset.glass='true');await capture(page,'phone-glass');await page.evaluate(()=>delete document.documentElement.dataset.glass)
 failCommunity=true;await refresh(page);await page.getByRole('button',{name:'Retry activities',exact:true}).waitFor()
 await check('activity failure clears protected content and retains chat recovery',async()=>{assert.equal(await page.getByRole('heading',{name:'A welcoming community guide',exact:true}).count(),0);assert.ok(await page.getByRole('link',{name:'Continue in chat',exact:true}).isVisible());await capture(page,'phone-retry')})
 failCommunity=false;await page.getByRole('button',{name:'Retry activities',exact:true}).click();await page.getByRole('button',{name:'Projects',exact:true}).waitFor()
 const outsider=await fixture('outsider');await outsider.goto(origin+'/?server-hall='+space);await outsider.getByRole('alert').first().waitFor()
 await check('nonmember access denied without protected data',async()=>{assert.equal(await outsider.getByRole('heading',{name:'A welcoming community guide',exact:true}).count(),0)})
 assert.deepEqual(pageErrors,[])
 await writeFile(resolve(output,'verification.json'),JSON.stringify({scope:'lead-run Chromium, intercepted Auth/PostgREST, local PGlite SQL/RLS; no hosted Auth/Realtime',checks,captures,pageErrors,requests:requests.length},null,2))
 console.log('PASS',checks.length,'community checks')
}catch(e){for(const [i,ctx] of browser.contexts().entries()){for(const p of ctx.pages())await p.screenshot({path:resolve(output,'failure-'+i+'.png'),fullPage:true}).catch(()=>{});console.log(await ctx.pages()[0]?.locator('.community-place').innerText().catch(()=>''))}throw e}finally{await browser.close();await db.close()}


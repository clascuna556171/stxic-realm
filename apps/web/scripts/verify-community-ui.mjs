// Intercepted Auth/PostgREST transport backed by local PGlite SQL/RLS, never the linked project.
// No real GoTrue, HTTP database connections, mail or Realtime is exercised here.
import { chromium } from 'playwright'
import { PGlite } from '@electric-sql/pglite'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import assert from 'node:assert/strict'
const root=resolve(import.meta.dirname,'../../..'),origin=process.env.REALM_UI_ORIGIN??'http://127.0.0.1:5175',output=resolve(root,'.impeccable/review/community-shell')
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
for(const [actor,body]of [[users.bob,'Anyone around for a little room building tonight?'],[users.alice,'I’m here! Just adding a few things to the shared hall.'],[users.moderator,'The new rooms are looking good. I’ll stop by after dinner.']])await asUser(actor,()=>sqlRpc('message_send',{p_kind:'channel',p_stream:channel,p_body:body,p_client:crypto.randomUUID()}))
const browser=await chromium.launch({channel:process.env.REALM_BROWSER_CHANNEL??'chrome',headless:true,args:['--disable-features=LocalNetworkAccessChecks']})
let failMembers=false
async function fixture(){
 const user={id:users.alice,email:'alice@example.invalid',email_confirmed_at:new Date().toISOString(),aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{}}
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
    if(failMembers&&name==='space_admin_data')return reply({code:'fixture_offline',message:'Temporary connection failure.'},503)
    return reply(await asUser(user.id,()=>sqlRpc(name,args)))
   }
   const table=url.pathname.split('/').pop();assert.ok(['spaces','channels','profiles','profile_appearances','account_portraits','space_members'].includes(table),`Unhandled fixture table ${table}`)
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
async function fits(page,name){assert.deepEqual(await page.evaluate(()=>({x:Math.max(0,document.documentElement.scrollWidth-innerWidth),y:Math.max(0,document.documentElement.scrollHeight-innerHeight)})),{x:0,y:0},name+' viewport');const input=await page.locator('#stream-body').boundingBox();assert.ok(input&&input.height>0&&input.y+input.height<=await page.evaluate(()=>innerHeight)-50,name+' composer visible')}
async function dialogFocus(page){
 const dialog=page.getByRole('dialog');await dialog.waitFor();assert.equal(await dialog.evaluate(el=>el.contains(document.activeElement)),true,'dialog takes focus')
 const controls=dialog.locator('button:not(:disabled),input:not(:disabled),textarea:not(:disabled),select:not(:disabled)').filter({visible:true});await controls.last().focus();await page.keyboard.press('Tab');assert.equal(await controls.first().evaluate(el=>el===document.activeElement),true,'Tab wraps');await page.keyboard.press('Shift+Tab');assert.equal(await controls.last().evaluate(el=>el===document.activeElement),true,'Shift Tab wraps')
}
try{
 const page=await fixture();await page.goto(origin);await page.locator('[data-message]').first().waitFor()
 for(const [name,width,height]of [['reference',1630,886],['desktop',1440,900],['laptop',1280,720],['tablet',900,844],['phone',390,844],['small',320,740],['landscape',844,390]]){
  await page.setViewportSize({width,height});await fits(page,name)
  if(width<=1100){await page.getByRole('button',{name:'Community',exact:true}).click();await page.getByRole('navigation',{name:'Channels',exact:true}).getByRole('button',{name:'general',exact:true}).waitFor();assert.equal(await page.locator('.community-open .community-rail').isVisible(),true);await page.getByRole('button',{name:'Close server details',exact:true}).press('Enter');assert.equal(await page.getByRole('button',{name:'Community',exact:true}).evaluate(el=>el===document.activeElement),true,name+' restores Community focus')}
  if(width>650)assert.ok(await page.getByRole('link',{name:'Settings',exact:true}).evaluate(el=>{const rect=el.getBoundingClientRect();return rect.top>=0&&rect.bottom<=innerHeight}),name+' Settings fits');await page.screenshot({path:resolve(output,name+'.png'),fullPage:true,animations:'disabled'});checks.push(name+' layout')
 }
 await page.setViewportSize({width:1440,height:900})
 const search=page.getByRole('searchbox',{name:'Search loaded messages in this room'})
 await search.fill('after dinner');assert.equal(await page.locator('[data-message]').count(),1)
 await search.fill('no matching phrase');await page.getByRole('status').filter({hasText:'0 messages matching your search'}).waitFor();await search.fill('')
 await page.keyboard.press('Control+k');assert.equal(await search.evaluate(el=>el===document.activeElement),true);checks.push('loaded-message search and shortcut')
 const body=page.getByRole('textbox',{name:'Message #general'})
 await body.fill('A note from the redesigned room.');await body.press('Shift+Enter');await body.press('End');await body.press('x');assert.ok((await body.inputValue()).includes('\n'))
 await body.press('Enter');await page.locator('[data-message]').filter({hasText:'A note from the redesigned room.'}).waitFor();await page.waitForFunction(()=>document.querySelector('#stream-body').value==='');assert.equal(await body.inputValue(),'');checks.push('multiline Enter send through local SQL/RLS')
 const message=page.locator('[data-message]').filter({hasText:'A note from the redesigned room.'});await message.locator('.member-portrait').focus();await message.getByRole('button',{name:'More',exact:true}).click();await page.getByRole('menuitem',{name:'Pin Message',exact:true}).click()
 await page.getByRole('button',{name:'Pinned',exact:true}).click();assert.equal(await page.locator('[data-message]').count(),1);await page.getByRole('button',{name:'All messages',exact:true}).click();checks.push('device-local pinned filter')
 await page.getByRole('navigation',{name:'Channels',exact:true}).getByRole('button',{name:'albertos-pizza',exact:true}).click();await page.getByRole('heading',{name:'Make yourself at home.'}).waitFor();checks.push('room switching and empty state')
 await page.getByRole('textbox',{name:'Message #albertos-pizza'}).fill('Draft stays in this room')
 await page.getByRole('navigation',{name:'Channels',exact:true}).getByRole('button',{name:'general',exact:true}).click();await page.getByRole('textbox',{name:'Message #general'}).waitFor()
 await page.getByRole('navigation',{name:'Channels',exact:true}).getByRole('button',{name:'albertos-pizza',exact:true}).click();assert.equal(await page.locator('#stream-body').inputValue(),'Draft stays in this room');checks.push('per-room draft preserved')
 await page.locator('.community-member-disclosure summary').click();await page.getByRole('link',{name:'Bob member'}).waitFor();checks.push('expand members and profile links')
 await page.getByRole('button',{name:'Alpha Testing Grounds server menu'}).click();await page.getByRole('menuitem',{name:'Create Category',exact:true}).click();await dialogFocus(page);await page.getByLabel('CATEGORY NAME',{exact:true}).fill('Evening conversations');await page.getByRole('button',{name:'Create Category',exact:true}).click();await page.getByText('Evening conversations',{exact:true}).waitFor();checks.push('existing room management and category dialog focus')
 await page.getByRole('button',{name:'Room settings',exact:true}).click();await dialogFocus(page);await page.getByRole('button',{name:'Cancel',exact:true}).click();assert.equal(await page.getByRole('button',{name:'Room settings',exact:true}).evaluate(el=>el===document.activeElement),true)
 await page.getByRole('button',{name:'Alpha Testing Grounds server menu'}).click();await page.getByRole('menuitem',{name:'Create Channel',exact:true}).click();await dialogFocus(page);await page.getByRole('button',{name:'Cancel',exact:true}).click();assert.equal(await page.locator('.community-space-switch').evaluate(el=>el===document.activeElement),true)
 await page.locator('.community-space-switch').click();await dialogFocus(page);await page.keyboard.press('Escape');assert.equal(await page.locator('.community-space-switch').evaluate(el=>el===document.activeElement),true);checks.push('channel settings, create channel and switch server dialog focus ownership')
 await page.getByRole('navigation',{name:'Channels',exact:true}).getByRole('button',{name:'general',exact:true}).click();await page.locator('[data-message]').first().waitFor()
 const action=page.locator('[data-message]').first().getByRole('button',{name:/Actions for message by/});await action.click();await page.getByRole('menuitem',{name:'Add Reaction',exact:true}).click();await dialogFocus(page);await page.keyboard.press('Escape');assert.equal(await action.evaluate(el=>el===document.activeElement),true);checks.push('reaction dialog focus containment and restoration')
 await page.reload();await page.locator('#stream-body').waitFor();failMembers=true;await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await page.getByRole('button',{name:'Retry member details'}).waitFor();failMembers=false;await page.getByRole('button',{name:'Retry member details'}).click();await page.locator('.community-member-disclosure').waitFor();checks.push('member error and retry')
 const longName='room-'.repeat(15)+'final';await db.query('update public.channels set name=$1 where id=$2',[longName,channel]);await page.setViewportSize({width:320,height:740});await page.goto(`${origin}/?channel=${channel}`);await page.locator('#stream-body').waitFor();await fits(page,'80-character room');const sendRect=await page.getByRole('button',{name:'Send',exact:true}).boundingBox(),chatRect=await page.locator('.chat').boundingBox();assert.ok(sendRect.y+sendRect.height<=chatRect.y+chatRect.height,'long room retains entire Send button');await page.screenshot({path:resolve(output,'long-room-phone.png'),fullPage:true});checks.push('80-character room keeps Send visible')
 await db.query("update public.channels set name='general' where id=$1",[channel]);await db.query("insert into public.channels(space_id,name) select $1,'topic-'||n from generate_series(1,40) n",[space]);await page.setViewportSize({width:1440,height:900});await page.goto(origin);await page.locator('#stream-body').waitFor();assert.ok(await page.locator('.sidebar>nav').evaluate(el=>el.scrollHeight>el.clientHeight),'long room list scrolls independently');await page.locator('.sidebar>nav').evaluate(el=>el.scrollTop=el.scrollHeight);await page.locator('.community-rail-footer').scrollIntoViewIfNeeded();assert.ok(await page.getByRole('button',{name:'Copy room link'}).isVisible());checks.push('40 rooms scroll and shared-hall footer stays reachable')
 await db.query('update public.channels set archived_at=now() where id=$1',[channel]);await page.goto(`${origin}/?channel=${channel}`);await page.locator('#stream-body').waitFor();assert.equal(await page.locator('#stream-body').isDisabled(),true);checks.push('read-only archive')
 assert.deepEqual(pageErrors,[])
 const result={passed:true,transport:'Intercepted Auth/PostgREST with actual local PGlite SQL/RLS; not hosted Supabase',checks,pageErrors};await writeFile(resolve(output,'verification.json'),JSON.stringify(result,null,2));console.log('PASS',JSON.stringify(result))
}catch(error){for(const context of browser.contexts())for(const page of context.pages()){console.error((await page.locator('body').innerText()).slice(-1300));await page.screenshot({path:resolve(output,'failure.png'),fullPage:true}).catch(()=>{})}throw error}finally{await browser.close();await queue;await db.close()}

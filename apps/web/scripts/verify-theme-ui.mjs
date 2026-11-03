// Intercepted Auth/PostgREST transport backed by local PGlite SQL/RLS, never the linked project.
// No real GoTrue, HTTP database connections, mail or Realtime is exercised here.
import { chromium } from 'playwright'
import { PGlite } from '@electric-sql/pglite'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import assert from 'node:assert/strict'
const root=resolve(import.meta.dirname,'../../..'),origin=process.env.REALM_UI_ORIGIN??'http://127.0.0.1:5175',output=resolve(root,'.impeccable/review/app-refinement')
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
async function fixture(authenticated=true){
 const user={id:users.alice,email:'alice@example.invalid',email_confirmed_at:new Date().toISOString(),aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{}}
 const b64=value=>Buffer.from(JSON.stringify(value)).toString('base64url'),token=`${b64({alg:'HS256',typ:'JWT'})}.${b64({sub:user.id,exp:Math.floor(Date.now()/1000)+3600,role:'authenticated'})}.fixture`
 const session={access_token:token,refresh_token:'fixture',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user}
 const context=await browser.newContext({viewport:{width:1630,height:886}})
 if(authenticated)await context.addInitScript(({key,session})=>localStorage.setItem(key,JSON.stringify(session)),{key:storageKey,session})
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
   const table=url.pathname.split('/').pop();assert.ok(['spaces','channels','profiles','profile_appearances','account_portraits','space_members','homes','user_blocks','friendships','direct_conversations'].includes(table),`Unhandled fixture table ${table}`)
   const values=[],filters=[]
   for(const [column,value]of url.searchParams)if(value.startsWith('eq.')){assert.match(column,/^[a-z_]+$/);values.push(value.slice(3));filters.push(`"${column}"=$${values.length}`)}
   const rows=await asUser(user.id,()=>db.query(`select * from public."${table}"${filters.length?' where '+filters.join(' and '):''}`,values).then(result=>result.rows))
   return reply(req.headers().accept?.includes('vnd.pgrst.object')?rows[0]:rows)
  }catch(error){console.error('FIXTURE ERROR',url.pathname,error.message??error);return reply({code:error.code??'fixture',message:error.message},400)}
 })
 const page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',error=>pageErrors.push(error.message))
 return page
}

// Fixture-only permissions and world setup; no linked Supabase state is touched.
await db.query('insert into realm_private.platform_admins(user_id) values($1)',[users.alice])
await db.exec("update realm_private.settings set value='false' where key='account_invitations'")
const initialHall=await asUser(users.alice,()=>sqlRpc('get_server_hall',{p_space:space}))
await asUser(users.alice,()=>sqlRpc('manage_server_hall',{p_space:space,p_action:'enabled',p_revision:initialHall.revision,p_enabled:true}))
const direct=await asUser(users.alice,()=>sqlRpc('open_direct',{p_user:users.bob}))
const checks=[],metrics=[]
const routes=[['chat','', '[data-message]'],['halls','?spaces','.hall-pixel-canvas'],['people','?friends','.social-content'],['profile','?profile','.account-profile-editor'],['settings','?settings','.settings-content'],['character','?appearance','.appearance-grid'],['home-studio','?room-studio','.room-layout'],['hall-studio','?hall-studio','.hall-workbench'],['privacy','?privacy','.admin-content'],['moderation','?moderation','.admin-content'],['platform','?platform','.admin-content'],['direct','?dm='+direct,'.conversation'],['home','?home='+users.alice,'.room-canvas canvas'],['shared-hall','?server-hall='+space,'.shared-hall-scene .hall-pixel-canvas'],['room-preview','?room-preview','.room-canvas canvas'],['hall-preview','?hall-preview','.hall-pixel-canvas']]
try{
 const page=await fixture()
 const sizes=process.env.REALM_UI_FOLLOWUP?[['phone',390,844],['narrow-phone',320,740],['zoom-reflow',720,450]]:[['desktop',1440,900],['laptop',1280,720],['phone',390,844],['narrow-phone',320,740],['reflow',720,900]]
 for(const [size,width,height]of sizes){
  await page.setViewportSize({width,height})
  for(const [name,path,ready]of routes){
   await page.goto(origin+'/'+path);await page.locator(ready).first().waitFor();await page.evaluate(()=>document.fonts.ready);if(name==='chat')await page.locator('.community-member-disclosure').waitFor({state:'attached'});if(name==='halls')await page.locator('a.hall-enter').waitFor({state:'attached'});if(name==='profile')assert.equal(await page.locator('.account-profile-content').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(48, 48, 48)','profile uses shared surface')
   const result=await page.evaluate(()=>{const root=getComputedStyle(document.documentElement),frame=document.querySelector('.workspace-page,.community-shell'),nav=document.querySelector('.workspace-nav'),style=getComputedStyle(frame),rect=frame.getBoundingClientRect(),navRect=nav.getBoundingClientRect();return{token:root.getPropertyValue('--realm-bg').trim(),background:style.backgroundColor,radius:style.borderTopLeftRadius,frame:{x:rect.x,y:rect.y,width:rect.width},nav:{x:navRect.x,y:navRect.y,bottom:navRect.bottom,width:navRect.width},horizontal:document.documentElement.scrollWidth>innerWidth,vertical:document.documentElement.scrollHeight>innerHeight,viewport:!!document.querySelector('.viewport-world,.dm-page,.community-shell')}})
   assert.equal(result.token,'#202020',name+' shared neutral token');assert.equal(result.background,'rgb(32, 32, 32)',name+' neutral frame');assert.equal(result.horizontal,false,name+' horizontal fit')
   if(result.viewport)assert.equal(result.vertical,false,name+' viewport fit')
   assert.ok(result.nav.y>=0&&result.nav.bottom<=height+1,name+' navigation fits')
   if(width>650){assert.equal(result.radius,'32px');assert.ok(Math.abs(result.nav.x-(width<=1300?22:32))<2,name+' same rail inset')}
   await page.screenshot({path:resolve(output,`${name}-${size}.png`),fullPage:true,animations:'disabled'});if(['character','profile'].includes(name)&&width<=390)await page.screenshot({path:resolve(output,`${name}-${size}-viewport.png`),animations:'disabled'});metrics.push({route:name,size,...result});checks.push(name+' '+size)
  }

  await page.goto(origin+'/?profile');await page.locator('.account-profile-editor').waitFor()
  for(const title of ['Identity','Photos & banner','Profile frames','Pets & wildlife','Style','Sections']){await page.getByRole('tab',{name:title,exact:true}).click();await page.getByRole('tabpanel',{name:title,exact:true}).waitFor();await page.screenshot({path:resolve(output,`profile-${title.toLowerCase().replace(/[^a-z]+/g,'-')}-${size}.png`),fullPage:true,animations:'disabled'});checks.push('profile '+title+' '+size)}
  await page.goto(origin+'/?appearance');await page.getByRole('button',{name:'Room & interface',exact:true}).click();const samples=await page.locator('.mood-sample').evaluateAll(elements=>elements.map(el=>getComputedStyle(el).backgroundColor));assert.equal(new Set(samples).size,3,'authored room material previews stay distinct');await page.screenshot({path:resolve(output,`interface-${size}.png`),fullPage:true,animations:'disabled'});checks.push('room & interface '+size)
  await page.goto(origin+'/?hall-studio');await page.getByRole('tab',{name:'Themes & architecture',exact:true}).click();await page.screenshot({path:resolve(output,`hall-themes-${size}.png`),fullPage:true,animations:'disabled'});assert.equal(await page.locator('.hall-check input').first().evaluate(el=>getComputedStyle(el).accentColor),'rgb(222, 222, 230)');checks.push('hall themes '+size)
 }
 await page.setViewportSize({width:390,height:844})
 await page.goto(origin+'/?settings');await page.getByRole('link',{name:/Interface & colors/}).waitFor();await page.locator('.workspace-more summary').click();await page.getByRole('navigation',{name:'More destinations'}).getByRole('link',{name:'Your profile',exact:true}).waitFor();await page.keyboard.press('Escape');assert.equal(await page.locator('.workspace-more').evaluate(el=>el.open),false);checks.push('shared mobile More keyboard dismissal')
 await page.setViewportSize({width:844,height:390});for(const [name,path,ready]of routes.filter(([name])=>['chat','settings','character','home','direct'].includes(name))){await page.goto(origin+'/'+path);await page.locator(ready).first().waitFor();await page.getByRole('link',{name:'Settings',exact:true}).scrollIntoViewIfNeeded();assert.ok(await page.getByRole('link',{name:'Settings',exact:true}).evaluate(el=>{const r=el.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight}),name+' landscape Settings');checks.push(name+' landscape')}

 await page.setViewportSize({width:390,height:844});await page.goto(origin+'/?profile');await page.getByLabel('Display name',{exact:true}).waitFor()
 const profileName=page.getByLabel('Display name',{exact:true});await profileName.fill('Alice Long Profile Name');await page.getByRole('button',{name:'Save profile',exact:true}).click();await page.getByRole('status').filter({hasText:'Profile saved to your account.'}).waitFor();assert.equal(await page.getByRole('button',{name:'Save profile',exact:true}).isDisabled(),true);checks.push('phone profile edit and server-backed local save')
 await page.getByRole('button',{name:'Preview profile',exact:true}).click();assert.equal(await page.locator('.account-profile-preview').isVisible(),true);await page.getByRole('button',{name:'Edit profile',exact:true}).click();assert.equal(await profileName.inputValue(),'Alice Long Profile Name');checks.push('phone Edit Preview preserves fields')
 await page.setViewportSize({width:1440,height:900});await page.goto(origin);const first=page.locator('[data-message]').first();const actions=first.getByRole('button',{name:/Actions for message by/});await actions.focus();await page.keyboard.press('Enter');await page.getByRole('menu',{name:'Message actions',exact:true}).waitFor();assert.equal(await page.getByRole('menuitem',{name:'Add Reaction',exact:true}).evaluate(el=>el===document.activeElement),true);await page.keyboard.press('End');assert.equal(await page.getByRole('menuitem',{name:'Report Message',exact:true}).evaluate(el=>el===document.activeElement),true);await page.keyboard.press('Escape');assert.equal(await actions.evaluate(el=>el===document.activeElement),true);checks.push('persistent message actions keyboard open, arrow navigation and Escape focus restoration')
 await page.setViewportSize({width:320,height:740});await actions.click();await page.getByRole('menuitem',{name:'Forward',exact:true}).click();const destination=page.getByRole('button',{name:/albertos-pizza/}).filter({has:page.locator('.realm-forward-dest-name')});await destination.focus();await page.keyboard.press('Space');assert.equal(await destination.getAttribute('aria-pressed'),'true');await page.getByRole('button',{name:'Cancel',exact:true}).click();checks.push('narrow-phone forwarding destinations keyboard selectable')
 const guest=await fixture(false);for(const [name,width,height]of [['desktop',1440,900],['phone',390,844]]){await guest.setViewportSize({width,height});await guest.goto(origin);await guest.locator('.login-panel').waitFor();assert.equal(await guest.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await guest.screenshot({path:resolve(output,'sign-in-'+name+'.png'),fullPage:true,animations:'disabled'});checks.push('sign-in '+name+' neutral theme')}
 assert.deepEqual(pageErrors,[])
 const result={passed:true,transport:'Intercepted Auth/PostgREST with real local PGlite SQL/RLS; not hosted Supabase',checks,metrics,pageErrors};await writeFile(resolve(output,process.env.REALM_UI_FOLLOWUP?'final-verification.json':'verification.json'),JSON.stringify(result,null,2));console.log('PASS',JSON.stringify({checks:checks.length,routes:routes.length,pageErrors}))
}catch(error){for(const context of browser.contexts())for(const page of context.pages()){console.error((await page.locator('body').innerText()).slice(-1500));await page.screenshot({path:resolve(output,'failure.png'),fullPage:true}).catch(()=>{})}throw error}finally{await browser.close();await queue;await db.close()}

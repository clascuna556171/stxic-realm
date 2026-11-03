// Intercepted Auth/PostgREST transport backed by local PGlite SQL/RLS, never the linked project.
// No real GoTrue, HTTP database connections, mail or Realtime is exercised here.
import { chromium } from 'playwright'
import { PGlite } from '@electric-sql/pglite'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import assert from 'node:assert/strict'
const root=resolve(import.meta.dirname,'../../..'),origin=process.env.REALM_UI_ORIGIN??'http://127.0.0.1:5175',output=resolve(root,'.impeccable/review/server-halls')
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
let failMembers=false, failList=false, holdList=false
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
try{
 const beta='70000000-0000-4000-8000-000000000008',empty='70000000-0000-4000-8000-000000000009',closed='70000000-0000-4000-8000-000000000010';
 for(const [id,name] of [[beta,'Moonlit Archive'],[empty,'The New Workshop'],[closed,'Closed Community']])await db.exec(`begin;insert into public.spaces(id,name) values('${id}','${name}');insert into public.space_members(space_id,user_id,role) values('${id}','${users.bob}','owner'),('${id}','${users.alice}','member');commit;`)
 await db.query('update public.spaces set archived_at=now() where id=$1',[beta]);await db.query('update public.spaces set closed_at=now() where id=$1',[closed]);
 await db.query("insert into public.channels(space_id,name,archived_at) values($1,'old-news',now())",[space]);
 const page=await fixture();
 for(const [name,width,height] of [['desktop',1440,900],['phone',390,844],['narrow',320,700],['landscape',720,450]]){
  await page.setViewportSize({width,height});await page.goto(origin+'/?spaces');await page.locator('.hall-selected h3').filter({hasText:'Alpha'}).waitFor();await page.getByRole('link',{name:'Enter server Alpha Testing Grounds'}).waitFor();
  await check(name+' selection and entry',async()=>{await fits(page);assert.match(await page.getByRole('link',{name:'Enter server Alpha Testing Grounds'}).getAttribute('href'),new RegExp('channel='+channel));const box=await page.locator('.hall-enter').boundingBox();assert.ok(box.y>=0&&box.y+box.height<height);});
  await page.screenshot({path:resolve(output,name+'.png')});
  if(width<=900)await page.getByRole('button',{name:'Servers & channels',exact:true}).click();
  await check(name+' search, wing and view context',async()=>{await page.getByLabel('Find a server').fill('workshop');await page.getByRole('button',{name:/The New Workshop.*Member server/}).click();await page.getByText('No channels yet. A server administrator').waitFor();assert.equal(await page.locator('.hall-enter').count(),0);if(width<=900){await page.getByRole('button',{name:'Hall',exact:true}).click();await page.getByRole('button',{name:'Servers & channels',exact:true}).click()}assert.equal(await page.getByLabel('Find a server').inputValue(),'workshop');assert.equal(await page.locator('.hall-selected h3').innerText(),'The New Workshop');await fits(page)});
  await page.getByLabel('Find a server').fill('nothing matches');await page.getByText('No servers match. Try another name.').waitFor();await page.getByLabel('Find a server').fill('');
  await check(name+' archived and closed',async()=>{await page.getByRole('button',{name:/Moonlit Archive.*Archived/}).click();await page.getByText('No channels yet. A server administrator').waitFor();await page.getByRole('button',{name:/Closed Community.*Permanently closed/}).click();await page.getByText('This server is permanently closed.').waitFor();assert.equal(await page.locator('.hall-channels a').count(),0)});
  await page.getByRole('button',{name:/Alpha Testing Grounds.*Member server/}).click();await page.getByRole('link',{name:'Enter server Alpha Testing Grounds'}).waitFor();await page.getByRole('link',{name:/# old-news/}).waitFor();
  await page.getByLabel('Find a server').scrollIntoViewIfNeeded();if(height>700)assert.ok((await page.locator('.hall-enter').boundingBox()).y>=0,'directory focus preserves entry header');await page.screenshot({path:resolve(output,name+'-directory.png')});
  await check(name+' join/create focus and return',async()=>{for(const task of ['join','create']){await page.locator(`[data-hall-task="${task}"]`).click();await page.waitForFunction(()=>document.activeElement?.matches('.hall-task input'));assert.equal(await page.locator('.hall-task input').count(),1);await page.keyboard.press('Escape');await page.waitForFunction(task=>document.activeElement?.matches(`[data-hall-task="${task}"]`),task);await fits(page)}});
  await check(name+' management access',async()=>{await page.getByRole('button',{name:'Server settings & membership',exact:true}).click();await page.locator('.hall-management[open]').waitFor();await page.getByRole('button',{name:'Rename space',exact:true}).waitFor();await page.locator('.hall-management>summary').click()});
 }
 await page.setViewportSize({width:1440,height:900});failMembers=true;await page.goto(origin+'/?spaces');await page.getByRole('button',{name:'Retry channels'}).waitFor();assert.equal(await page.locator('.hall-enter').count(),0);failMembers=false;await page.getByRole('button',{name:'Retry channels'}).click();await page.getByRole('link',{name:'Enter server Alpha Testing Grounds'}).waitFor();checks.push('channel failure and recovery');
 failList=true;await page.reload();await page.getByRole('button',{name:'Try again',exact:true}).waitFor();failList=false;holdList=true;await page.getByRole('button',{name:'Try again',exact:true}).click();await page.locator('.hall-inline-loading .skeleton-block').first().waitFor();await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('.hall-inline-loading .skeleton-block').first().evaluate(e=>getComputedStyle(e).animationName),'none');await page.screenshot({path:resolve(output,'loading.png')});holdList=false;await page.getByRole('link',{name:'Enter server Alpha Testing Grounds'}).waitFor();checks.push('list failure, skeleton, reduced motion and recovery');
 await page.keyboard.press('Tab');await page.locator('.hall-enter').focus();assert.notEqual(await page.locator('.hall-enter').evaluate(e=>getComputedStyle(e).outlineStyle),'none');checks.push('visible keyboard focus');

 await check('conventional entry navigation',async()=>{await page.getByRole('link',{name:'Enter server Alpha Testing Grounds'}).click();await page.locator('#stream-body').waitFor();assert.match(page.url(),new RegExp('channel='+channel));});
 await page.goto(origin+'/?spaces');await page.getByRole('link',{name:'Enter server Alpha Testing Grounds'}).waitFor();
 await check('create server submission',async()=>{await page.locator('[data-hall-task="create"]').click();await page.getByLabel('Server name',{exact:true}).fill('A New Community');await page.getByRole('button',{name:'Create server',exact:true}).click();await page.locator('.hall-selected h3').filter({hasText:'A New Community'}).waitFor();await page.getByRole('link',{name:'Enter server A New Community'}).waitFor();});
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>{document.documentElement.dataset.glass='true';localStorage.setItem('stxic-realm:glass','true')});await page.screenshot({path:resolve(output,'phone-glass.png')});checks.push('Glass appearance inspection');
 await page.goto(origin+'/?spaces');await page.getByRole('button',{name:'Servers & channels',exact:true}).click();await page.getByRole('button',{name:/Alpha Testing Grounds.*Member server/}).click();

 await check('empty account and join invitation',async()=>{const invitation=await asUser(users.alice,()=>sqlRpc('membership_invite',{p_action:'create',p_space:space,p_email:'outsider@example.invalid'}));const newcomer=await fixture('outsider');await newcomer.goto(origin+'/?spaces');await newcomer.getByText('No servers yet. Join with an invitation or create your first.').waitFor();await newcomer.locator('[data-hall-task="join"]').click();await newcomer.getByLabel('Membership invitation',{exact:true}).fill(origin+'/?spaces&invite='+invitation.token);await newcomer.getByRole('button',{name:'Accept invitation',exact:true}).click();await newcomer.getByRole('link',{name:'Enter server Alpha Testing Grounds'}).waitFor();await newcomer.close();});
 // Real fixture role permission: change owner to member, no administrative writes.
 await db.exec(`begin;update public.space_members set role=case when user_id='${users.bob}' then 'owner' else 'member' end where space_id='${space}';commit;`);await page.reload();await page.getByRole('link',{name:'Enter server Alpha Testing Grounds'}).waitFor();if(await page.getByRole('button',{name:'Server settings & membership',exact:true}).isVisible())await page.getByRole('button',{name:'Server settings & membership',exact:true}).click();else await page.locator('.hall-management>summary').click();assert.equal(await page.getByRole('button',{name:'Rename space',exact:true}).count(),0);checks.push('member management permissions');
 assert.deepEqual(pageErrors,[]);await writeFile(resolve(output,'verification.json'),JSON.stringify({passed:true,checks,pageErrors,scope:'Intercepted Auth/PostgREST backed by local PGlite. No hosted verification.'},null,2));console.log('PASS',checks.length,'halls checks');
}finally{await browser.close();await db.close()}

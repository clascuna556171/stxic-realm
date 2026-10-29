// Browser contract tests with simulated Auth/PostgREST. No real provider requests or email.
import {chromium} from 'playwright'
import assert from 'node:assert/strict'
import {setTimeout as delay} from 'node:timers/promises'
import {mkdir,readFile} from 'node:fs/promises'
import {resolve} from 'node:path'
const root=resolve(import.meta.dirname,'../../..'),origin=process.env.REALM_UI_ORIGIN??'http://127.0.0.1:5175',output=resolve(root,'.impeccable/access-review')
await mkdir(output,{recursive:true})
const env=await readFile(resolve(root,'apps/web/.env.local'),'utf8').catch(()=>''),backend=process.env.VITE_SUPABASE_URL??env.match(/^VITE_SUPABASE_URL=(.*)$/m)?.[1]?.trim()
assert.ok(backend,'Public Supabase URL is needed for the simulated frontend contract tests')
const storageKey=`sb-${new URL(backend).hostname.split('.')[0]}-auth-token`
const ids={alice:'10000000-0000-4000-8000-000000000001',bob:'20000000-0000-4000-8000-000000000002',space:'70000000-0000-4000-8000-000000000007',channel:'80000000-0000-4000-8000-000000000008'}
const character={skin:'#d9a27f',hair:'#282126',outfit:'everyday',hairStyle:'short',accessory:'none',eyes:'dark',version:1}
const profiles=Object.fromEntries(['alice','bob'].map(name=>[ids[name],{id:ids[name],username:name,display_name:name==='alice'?'Alice':'Bob',bio:'',revision:0,updated_at:new Date().toISOString()}]))
let spaces=[{id:ids.space,name:'The common room',revision:0,archived_at:null,closed_at:null}],channels=[{id:ids.channel,space_id:ids.space,name:'general',revision:0,archived_at:null}],messages=[],events=[],revision=0,denyBob=false,delayedSend=null,releaseSend=null
const cards=Object.fromEntries(Object.keys(profiles).map(user_id=>[user_id,{user_id,pronouns:'',status:'',about:'',avatar_id:null,banner_id:null,gallery:[],connections:[],details:[],style:{surface:'#202127',text:'#ececf1',accent:'#b3cdbd',font:'sans',avatar_shape:'circle',avatar_x:50,avatar_y:50,banner_x:50,banner_y:50,banner_height:180,sections:['about','details','connections','photos','member'],hidden:[]},revision:0,joined_at:'2026-10-28T00:00:00Z'}]))
const requests=[],pageErrors=[]
function addMessage(author,body,id=crypto.randomUUID()){
 const message={id,channel_id:ids.channel,author_id:author,body,created_at:new Date().toISOString(),client_id:crypto.randomUUID(),revision:++revision,created_revision:revision,removed_at:null,edited_at:null}
 messages.push(message);events.push({message_id:id,revision,operation:'create'});return message
}
addMessage(ids.alice,'Welcome to the common room.')
const browser=await chromium.launch({channel:process.env.REALM_BROWSER_CHANNEL??'chrome',headless:true})
async function contextFor(name){
 const user={id:ids[name],email:`${name}@example.invalid`,email_confirmed_at:new Date().toISOString(),aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{}}
 const b64=v=>Buffer.from(JSON.stringify(v)).toString('base64url'),access=`${b64({alg:'HS256',typ:'JWT'})}.${b64({sub:user.id,exp:Math.floor(Date.now()/1000)+3600,role:'authenticated'})}.fixture`
 const session={access_token:access,refresh_token:'fixture-refresh',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user}
 const context=await browser.newContext({viewport:{width:1440,height:1000}})
 await context.addInitScript(({key,session})=>localStorage.setItem(key,JSON.stringify(session)),{key:storageKey,session})
 await context.routeWebSocket('**/realtime/v1/**',ws=>ws.close())
 await context.route('**/*',async route=>{
  const req=route.request(),url=new URL(req.url())
  if(url.origin===origin)return route.continue()
  if(url.origin!==new URL(backend).origin)return route.abort()
  const reply=(data,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(data),headers:{'Access-Control-Allow-Origin':origin}})
  const payload=req.postDataJSON?.()??{},path=url.pathname
  if(req.method()==='OPTIONS')return reply({})
  if(path.startsWith('/auth/v1/')){
   if(path.endsWith('/user'))return reply(user)
   if(path.endsWith('/token'))return reply(session)
   if(path.endsWith('/logout'))return route.fulfill({status:204,headers:{'Access-Control-Allow-Origin':origin}})
   if(path.endsWith('/recover'))return reply({})
   if(path.endsWith('/verify'))return reply(session)
  }
  if(path.startsWith('/functions/v1/')){requests.push({name:path.split('/').pop(),args:payload});return reply({accepted:true})}
  if(path.includes('/rpc/')){
   const rpc=path.split('/').pop();requests.push({name:rpc,args:payload})
   if(rpc==='access_status')return reply({active:!denyBob||name!=='bob',state:denyBob&&name==='bob'?'suspended':'active',platform_admin:name==='alice',administration:true,account_invitations:true,privacy_jobs:true})
   if(rpc==='get_identity')return reply({profile:profiles[user.id],character,theme:{accent:'obsidian',logo:'mist'},mood:'cozy'})
   if(rpc==='get_profile_card'){const id=payload.p_user??user.id;return reply({profile:profiles[id],card:cards[id],media:[],own:id===user.id,friends:true,roles:[],note:{note:'',revision:0}})}
   if(rpc==='save_profile_card'){const p=profiles[user.id];if(p.revision!==payload.p_identity_revision||cards[user.id].revision!==payload.p_revision)return reply({code:'PT409',message:'Profile changed on another device. Reload before saving.'},409);profiles[user.id]={...p,...payload.p_profile,revision:p.revision+1};cards[user.id]={...payload.p_card,revision:cards[user.id].revision+1};return reply({profile:profiles[user.id],card:cards[user.id],media:[],own:true,friends:false,roles:[],note:{note:'',revision:0}})}
   if(rpc==='save_identity'){
    const profile=profiles[user.id]
    if(payload.p_revision!==profile.revision)return reply({code:'40001',message:'Changed in another tab. Reload before saving.'},409)
    profiles[user.id]={...profile,username:payload.p_username,display_name:payload.p_name,bio:payload.p_bio,revision:profile.revision+1}
    return reply({profile:profiles[user.id],character:payload.p_character,theme:payload.p_theme,mood:payload.p_mood})
   }
   if(denyBob&&name==='bob'&&rpc.startsWith('message_'))return reply({code:'42501',message:'Membership revoked.'},403)
   if(rpc==='message_history'){
    let rows=messages.filter(m=>!payload.p_before_time||m.created_at<payload.p_before_time||m.created_at===payload.p_before_time&&m.id<payload.p_before_id).sort((a,b)=>a.created_at.localeCompare(b.created_at)||a.id.localeCompare(b.id));rows=rows.slice(-50)
    return reply({messages:rows,watermark:revision,visibility:'fixture'})
   }
   if(rpc==='message_recover'){
    const high=payload.p_through??revision,changes=events.filter(e=>e.revision>payload.p_after&&e.revision<=high).slice(0,50),ids=changes.map(e=>e.message_id)
    return reply({reset:false,visibility:'fixture',events:changes,messages:messages.filter(m=>ids.includes(m.id)),next:changes.at(-1)?.revision??payload.p_after,watermark:high})
   }
   if(rpc==='message_send'){
    if(delayedSend){await new Promise(resolve=>{releaseSend=resolve});delayedSend=null}
    const m=addMessage(user.id,payload.p_body);return reply(m.id)
   }
   if(rpc==='message_change'){
    const m=messages.find(m=>m.id===payload.p_message);assert.equal(m.revision,payload.p_revision);m.body=payload.p_remove?'':payload.p_body;m.removed_at=payload.p_remove?new Date().toISOString():null;m.edited_at=payload.p_remove?m.edited_at:new Date().toISOString();m.revision=++revision;events.push({message_id:m.id,revision,operation:payload.p_remove?'remove':'edit'});return reply(null)
   }
   if(rpc==='message_unread')return reply(messages.filter(m=>m.author_id!==user.id&&!m.removed_at).length)
   if(rpc==='message_read')return reply(null)
   if(rpc==='space_admin_data')return reply({members:[{user_id:ids.alice,role:'owner',name:'Alice',username:'alice'},{user_id:ids.bob,role:'member',name:'Bob',username:'bob'}],invites:[],restrictions:[]})
   if(rpc==='manage_space'){
    if(payload.p_action==='create'){const s={id:crypto.randomUUID(),name:payload.p_name,revision:0,archived_at:null,closed_at:null};spaces.push(s);return reply(s.id)}
    if(payload.p_action==='rename'){const s=spaces.find(s=>s.id===payload.p_space);s.name=payload.p_name;s.revision++}return reply(payload.p_space)
   }
   if(rpc==='submit_report')return reply(crypto.randomUUID())
   if(rpc==='privacy_request')return reply(payload.p_action==='list'?[]:{id:crypto.randomUUID(),kind:payload.p_action,status:'pending'})
   return reply([])
  }
  if(path.endsWith('/spaces'))return reply(spaces)
  if(path.endsWith('/channels'))return reply(channels.filter(c=>c.space_id===(url.searchParams.get('space_id')??'').replace('eq.','')))
  if(path.endsWith('/profiles'))return reply(Object.values(profiles))
  if(path.endsWith('/profile_appearances'))return reply(Object.keys(profiles).map(user_id=>({user_id,character})))
  if(path.endsWith('/user_blocks'))return reply([])
  return reply([])
 })
 const page=await context.newPage();page.on('pageerror',e=>pageErrors.push(e.message));page.on('dialog',dialog=>dialog.accept())
 return {context,page}
}
try{
 const a=await contextFor('alice'),b=await contextFor('bob'),alice=a.page,bob=b.page
 await Promise.all([alice.goto(origin),bob.goto(origin)])
 await alice.getByText('Welcome to the common room.',{exact:true}).waitFor();await bob.getByText('Welcome to the common room.',{exact:true}).waitFor()
 await alice.screenshot({path:resolve(output,'chat-desktop.png')})
 await bob.setViewportSize({width:390,height:844});await bob.screenshot({path:resolve(output,'chat-phone.png')})
 // Two frontend clients, >100 missed events, then editing a message outside the latest snapshot.
 for(let n=0;n<125;n++)addMessage(ids.alice,`Gap message ${n+1}`)
 await bob.getByRole('button',{name:'Refresh messages',exact:true}).click()
 await bob.getByText('Gap message 125',{exact:true}).waitFor()
 assert.ok(requests.filter(r=>r.name==='message_recover'&&r.args.p_after>50).length>=2)
 await alice.getByRole('button',{name:'Edit',exact:true}).first().click();await alice.getByLabel('Edit message',{exact:true}).fill('Edited from the other window.');await alice.getByRole('button',{name:'Save edit',exact:true}).click()
 await bob.getByRole('button',{name:'Refresh messages',exact:true}).click();await bob.getByText('Edited from the other window.',{exact:true}).waitFor()
 await alice.getByRole('button',{name:'Remove',exact:true}).first().click();await bob.getByRole('button',{name:'Refresh messages',exact:true}).click();await bob.getByText('Message removed',{exact:true}).first().waitFor()
 // Editing while a send is in flight must preserve the new draft.
 delayedSend=true;await bob.getByRole('textbox',{name:'Message #general',exact:true}).fill('First draft');await bob.getByRole('button',{name:'Send',exact:true}).click();await bob.getByRole('textbox',{name:'Message #general',exact:true}).fill('A newer draft');for(let attempt=0;!releaseSend&&attempt<100;attempt++)await delay(50);assert.ok(releaseSend,'send request reached the delayed fixture');releaseSend();await bob.getByRole('button',{name:'Send',exact:true}).waitFor({state:'visible'});await bob.waitForFunction(()=>document.querySelector('#stream-body')?.value==='A newer draft');await bob.reload();await bob.getByRole('textbox',{name:'Message #general',exact:true}).waitFor();assert.equal(await bob.getByRole('textbox',{name:'Message #general',exact:true}).inputValue(),'A newer draft')
 await bob.getByRole('button',{name:'Report',exact:true}).first().click();await bob.getByLabel('Additional context (optional)').fill('Please review this message.');await bob.getByRole('button',{name:'Submit report',exact:true}).click();await bob.getByRole('heading',{name:'Report received'}).waitFor();await bob.getByRole('button',{name:'Done',exact:true}).click()
 // Halls use real membership fixtures, including pagination, archived/closed states and deep links.
 const guild={id:'70000000-0000-4000-8000-000000000009',name:'The Mosswood Guild',revision:0,archived_at:null,closed_at:null}
 spaces.push(guild,{...guild,id:'70000000-0000-4000-8000-000000000010',name:'Old Watchtower',archived_at:new Date().toISOString()},{...guild,id:'70000000-0000-4000-8000-000000000011',name:'Sealed Archive',closed_at:new Date().toISOString()})
 channels.push({id:'80000000-0000-4000-8000-000000000009',space_id:guild.id,name:'quest-board',revision:0,archived_at:null})
 await alice.goto(origin+'/?spaces');await alice.getByRole('heading',{name:'Server Halls'}).waitFor();await alice.getByRole('link',{name:'Enter server',exact:true}).waitFor()
 await alice.screenshot({path:resolve(output,'spaces-desktop.png')})
 await alice.getByLabel('Find a server').fill('mosswood');assert.equal(await alice.locator('.hall-server-list>button').count(),1)
 await alice.locator('.hall-server-list>button').click();await alice.getByRole('link',{name:'# quest-board',exact:true}).waitFor()
 await alice.getByRole('link',{name:'Enter server',exact:true}).click();await alice.getByRole('textbox',{name:'Message #quest-board',exact:true}).waitFor();assert.equal(await alice.locator('.space-switcher select').inputValue(),guild.id)
 await alice.goto(origin+'/?spaces');await alice.getByRole('heading',{name:'Server Halls'}).waitFor();await alice.getByRole('button',{name:'Next hall wing'}).click();await alice.getByRole('button',{name:'Select Sealed Archive, closed',exact:true}).click();await alice.getByText('Server closed',{exact:true}).waitFor();assert.equal(await alice.getByRole('link',{name:'Enter server',exact:true}).count(),0)
 await alice.locator('.hall-server-list>button').filter({hasText:'Old Watchtower'}).click();await alice.getByText('This server is archived. You can read its conversation history.').waitFor()
 await alice.getByLabel('Find a server').fill('no-such-server');await alice.getByText('No servers match. Try another name.').waitFor();await alice.getByLabel('Find a server').fill('')
 await alice.setViewportSize({width:390,height:844});await alice.screenshot({path:resolve(output,'spaces-phone.png')});assert.equal(await alice.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)
 await alice.locator('.hall-server-list>button').filter({hasText:'The common room'}).click();await alice.getByRole('link',{name:'Create a server',exact:true}).click();await alice.getByLabel('New channel name',{exact:true}).waitFor()

 await alice.getByLabel('Space name',{exact:true}).first().fill('A new place');await alice.getByRole('button',{name:'Create space',exact:true}).click();await alice.getByRole('heading',{name:'A new place',exact:true,level:2}).waitFor()
 // Hall arrangements are local and account-scoped; one user's theme must not leak to another.
 await alice.goto(origin+'/?hall-studio');await alice.getByRole('heading',{name:'Make an entrance.'}).waitFor();await alice.getByRole('tab',{name:'Themes & architecture',exact:true}).click();await alice.getByRole('button',{name:/Emberkeep hall/}).click();await alice.getByRole('button',{name:'Save hall',exact:true}).click()
 assert.equal(await alice.evaluate(id=>JSON.parse(localStorage.getItem('stxic-realm:hall:v1:'+id)).theme,ids.alice),'medieval');assert.equal(await alice.evaluate(()=>localStorage.getItem('stxic-realm:hall:v1:guest')),null)
 await alice.goto(origin+'/?spaces');await alice.locator('.hall-pixel-canvas').waitFor();assert.match(await alice.locator('.hall-pixel-canvas').getAttribute('aria-label'),/^medieval /)
 await bob.goto(origin+'/?spaces');await bob.locator('.hall-pixel-canvas').waitFor();assert.match(await bob.locator('.hall-pixel-canvas').getAttribute('aria-label'),/^cozy /)
 // Profile redesign retains actual account saves, live identity preview and private field boundaries.
 await alice.setViewportSize({width:1440,height:1000});await alice.goto(origin+'/?profile');await alice.getByRole('heading',{name:'Profile details',exact:true}).waitFor()
 assert.equal(await alice.getByRole('button',{name:'Save profile',exact:true}).isDisabled(),true)
 await alice.getByLabel('Display name',{exact:true}).fill('Alice Mosswood');await alice.getByLabel('About you',{exact:true}).fill('Books, plants and a place for friends.')
 await alice.getByRole('complementary',{name:'Profile preview'}).getByRole('heading',{name:'Alice Mosswood',exact:true}).waitFor()
 await alice.getByRole('button',{name:'Save profile',exact:true}).click();await alice.getByText('Profile saved to your account.',{exact:true}).waitFor()
 assert.equal(profiles[ids.alice].display_name,'Alice Mosswood');assert.equal(profiles[ids.bob].display_name,'Bob')
 const profileSave=requests.filter(r=>r.name==='save_profile_card').at(-1);assert.equal('p_character' in profileSave.args,false);assert.equal('p_theme' in profileSave.args,false)
 assert.equal(await alice.getByRole('navigation',{name:'Personalize your Realm'}).getByRole('link').count(),3)
 await alice.screenshot({path:resolve(output,'profile-desktop.png'),fullPage:true});await alice.reload()
 await alice.getByLabel('Display name',{exact:true}).waitFor();assert.equal(await alice.getByLabel('Display name',{exact:true}).inputValue(),'Alice Mosswood')
 for(const width of [390,320]){
  await alice.setViewportSize({width,height:844});assert.equal(await alice.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)
  assert.equal(await alice.locator('.account-profile-editor').isVisible(),true,'Phone opens directly on profile editing');await alice.getByRole('button',{name:'Preview profile',exact:true}).click();assert.equal(await alice.locator('.account-profile-card').isVisible(),true);await alice.getByRole('button',{name:'Edit profile',exact:true}).click()
  await alice.screenshot({path:resolve(output,`profile-${width}.png`),fullPage:true})
 }
 await alice.goto(`${origin}/?privacy`);await alice.getByRole('heading',{name:'Your account, your choices.'}).waitFor();await alice.screenshot({path:resolve(output,'privacy-phone.png')});await alice.getByLabel('Confirm your current password').fill('Test password only');await alice.getByRole('button',{name:'Request data export',exact:true}).click();await alice.getByText('Export queued. Refresh after processing completes.').waitFor()
 await alice.goto(`${origin}/auth/recover`);await alice.getByLabel('Email',{exact:true}).fill('nobody@example.invalid');await alice.getByRole('button',{name:'Send recovery link',exact:true}).click();await alice.getByText('If eligible, you’ll receive a recovery link. Delivery can take a few minutes.').waitFor()
 await alice.goto(`${origin}/auth/callback?flow=invite&admission=fixture#access_token=${Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')}.${Buffer.from(JSON.stringify({exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')}.fixture&refresh_token=fixture&type=invite`);await alice.getByRole('heading',{name:'Make yourself at home.'}).waitFor();await alice.getByLabel('New password',{exact:true}).fill('Long-enough-password-123');await alice.getByLabel('Confirm password',{exact:true}).fill('Long-enough-password-123');await alice.getByRole('button',{name:'Save password',exact:true}).click();await alice.getByRole('heading',{name:'Your password is saved.'}).waitFor();assert.ok(requests.some(r=>r.name==='realm-onboarding'))
 denyBob=true;await bob.goto(origin);await bob.getByRole('heading',{name:'Account unavailable'}).waitFor();assert.equal(await bob.getByText('Gap message 125',{exact:true}).count(),0)
 for(const page of [alice,bob]){assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'horizontal page overflow')}
 assert.deepEqual(pageErrors,[]);console.log('PASS: simulated two-client recovery/edit/remove, drafts, reports, space creation, privacy, callbacks, suspension; desktop/phone captures saved.')
}catch(e){console.error('Browser errors:',pageErrors);for(const context of browser.contexts())for(const page of context.pages()){console.error((await page.locator('body').innerText()).slice(0,3000));await page.screenshot({path:resolve(output,`failure-${Date.now()}.png`)})}throw e}finally{await browser.close()}

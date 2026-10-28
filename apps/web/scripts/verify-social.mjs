import { createClient } from '@supabase/supabase-js'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const env=Object.fromEntries(fs.readFileSync(path.join(root,'.env.local'),'utf8').split(/\r?\n/).filter(l=>l&&!l.startsWith('#')&&l.includes('=')).map(l=>{const i=l.indexOf('=');return[l.slice(0,i),l.slice(i+1)]}))
const url=process.env.VITE_SUPABASE_URL||env.VITE_SUPABASE_URL,key=process.env.VITE_SUPABASE_ANON_KEY||env.VITE_SUPABASE_ANON_KEY,secret=process.env.SUPABASE_SERVICE_ROLE_KEY
if(!url||!key||!secret)throw new Error('Supabase public config and an admin key in SUPABASE_SERVICE_ROLE_KEY are required. Never pass the admin key to the browser.')
if(process.env.REALM_TEST_PROJECT_URL!==url)throw new Error('Set REALM_TEST_PROJECT_URL to the dedicated test project URL. Never run this suite incidentally against the linked project.')
const options={auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(input,init)=>fetch(input,{...init,signal:AbortSignal.timeout(30000)})}},admin=createClient(url,secret,options),fixtures=path.resolve(root,'../../supabase/.temp/browser-fixtures.json')
if(process.argv.includes('--cleanup-fixtures')){
 if(fs.existsSync(fixtures)){const saved=JSON.parse(fs.readFileSync(fixtures,'utf8'));for(const u of saved.users){const {error}=await admin.auth.admin.deleteUser(u.id);if(error)throw error}fs.unlinkSync(fixtures);console.log('Browser test accounts cleaned up.')}
 process.exit(0)
}
const users=[],clients=[],channels=[];let passed=false
const wait=ms=>new Promise(r=>setTimeout(r,ms))
async function call(db,name,args){const start=Date.now();const {data,error}=await db.rpc(name,args);if(error)throw error;if(Date.now()-start>3000)console.log(`Slow RPC ${name}: ${Date.now()-start}ms`);return data}
async function denied(result,label){const response=await result;assert.ok(response.error,label)}
try{
 const tag=Date.now().toString(36),password=crypto.randomUUID()+'Aa1!'
 for(let i=0;i<3;i++){
  console.log(`Preparing temporary test identity ${i+1}/3`);
  const email=`realm-check-${tag}-${i}@example.invalid`,{data,error}=await admin.auth.admin.createUser({email,password,email_confirm:true});if(error)throw error
  users.push({id:data.user.id,email,password,handle:`check_${tag}_${i}`})
  const admitted=await admin.rpc('realm_test_fixture',{p_users:[data.user.id]});if(admitted.error)throw new Error('Install supabase/tests/integration_fixture_support.sql in the dedicated test project first.')
  const db=createClient(url,key,options),auth=await db.auth.signInWithPassword({email,password});if(auth.error)throw auth.error
  clients.push(db);await db.realtime.setAuth(auth.data.session.access_token)
  const identity=await call(db,'get_identity');await call(db,'save_identity',{p_username:users[i].handle,p_name:['Alex (test)','Blair (test)','Casey (test)'][i],p_bio:'Temporary verification account',p_character:identity.character,p_theme:{accent:i?'obsidian':'violet',logo:'mist'},p_mood:'cozy',p_revision:identity.profile.revision})
 }
 const [a,b,c]=clients,[alice,bob,eve]=users
 const aIdentity=await call(a,'get_identity');assert.equal(aIdentity.profile.display_name,'Alex (test)')
 const privateTheme=await b.from('user_themes').select('theme').eq('user_id',alice.id);assert.ifError(privateTheme.error);assert.equal(privateTheme.data.length,0)
 await denied(a.rpc('save_identity',{p_username:alice.handle,p_name:'stale',p_bio:'',p_character:aIdentity.character,p_theme:aIdentity.theme,p_mood:'cozy',p_revision:0}),'stale profile save rejected')
 await denied(b.rpc('enter_home',{p_owner:alice.id,p_token:crypto.randomUUID()}),'nonfriend home denied')
 console.log('PASS: real authentication, profile persistence, private themes and stale revisions')
 const friendship=await call(a,'request_friend',{p_username:bob.handle})
 await denied(a.rpc('respond_friend',{p_request:friendship,p_action:'accept'}),'requester cannot self-accept')
 await denied(c.rpc('respond_friend',{p_request:friendship,p_action:'accept'}),'outsider cannot accept')
 await call(b,'respond_friend',{p_request:friendship,p_action:'accept'})
 const conversation=await call(a,'open_direct',{p_user:bob.id});assert.equal(await call(b,'open_direct',{p_user:alice.id}),conversation)
 let eventResolve
 const received=new Promise(resolve=>{eventResolve=resolve})
 const channel=b.channel(`social-verify-${tag}`).on('postgres_changes',{event:'INSERT',schema:'public',table:'direct_messages',filter:`conversation_id=eq.${conversation}`},payload=>eventResolve(payload.new))
 channels.push([b,channel])
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Realtime subscription timed out')),10000);channel.subscribe(status=>{if(status==='SUBSCRIBED'){clearTimeout(timer);resolve()}else if(status==='CHANNEL_ERROR'){clearTimeout(timer);reject(new Error('Realtime subscription failed'))}})})
 const retryId=crypto.randomUUID(),message=await call(a,'send_direct',{p_conversation:conversation,p_body:'Hello from an authenticated friend.',p_client:retryId})
 assert.equal(await call(a,'send_direct',{p_conversation:conversation,p_body:'Hello from an authenticated friend.',p_client:retryId}),message)
 let eventTimer;let event;try{event=await Promise.race([received,new Promise((_,reject)=>{eventTimer=setTimeout(()=>reject(new Error('Direct-message realtime event was not delivered after the insert completed')),15000)})])}finally{clearTimeout(eventTimer)}assert.equal(event.id,message)
 const read=await b.from('direct_messages').select('id,author_id,body').eq('conversation_id',conversation);assert.ifError(read.error);assert.equal(read.data.length,1);assert.equal(read.data[0].author_id,alice.id)
 const hidden=await c.from('direct_messages').select('id').eq('conversation_id',conversation);assert.ifError(hidden.error);assert.equal(hidden.data.length,0)
 await denied(c.rpc('send_direct',{p_conversation:conversation,p_body:'intrusion',p_client:crypto.randomUUID()}),'outsider DM send denied')
 await denied(b.from('direct_messages').insert({conversation_id:conversation,author_id:alice.id,body:'spoof',client_id:crypto.randomUUID()}),'direct author spoofing denied')
 console.log('PASS: friend acceptance, private DMs, idempotent retries, anti-spoofing and realtime delivery')
 const tokenA=crypto.randomUUID(),tokenB=crypto.randomUUID()
 await call(a,'enter_home',{p_owner:alice.id,p_token:tokenA});let room=await call(b,'enter_home',{p_owner:alice.id,p_token:tokenB});assert.equal(room.visitors.length,2)
 await wait(170);await call(a,'move_home',{p_owner:alice.id,p_token:tokenA,p_x:8,p_y:8})
 room=await call(b,'room_state',{p_owner:alice.id,p_token:tokenB});assert.equal(room.visitors.find(v=>v.id===alice.id).y,8)
 await denied(a.rpc('move_home',{p_owner:alice.id,p_token:tokenA,p_x:1,p_y:1}),'teleport denied')
 for(const x of [7,6]){await wait(170);await call(a,'move_home',{p_owner:alice.id,p_token:tokenA,p_x:x,p_y:8})}
 await wait(170);await call(a,'move_home',{p_owner:alice.id,p_token:tokenA,p_x:6,p_y:7});
 await wait(170);await denied(a.rpc('move_home',{p_owner:alice.id,p_token:tokenA,p_x:5,p_y:7}),'furniture collision denied')
 const home=room.home
 const saved=await call(a,'save_home',{p_layout:home.layout,p_privacy:'private',p_revision:home.revision})
 await denied(a.rpc('save_home',{p_layout:home.layout,p_privacy:'friends',p_revision:home.revision}),'stale home save denied')
 await denied(b.rpc('room_state',{p_owner:alice.id,p_token:tokenB}),'privacy change revokes active visitor')
 await denied(b.rpc('enter_home',{p_owner:alice.id,p_token:crypto.randomUUID()}),'private home denies friends')
 await call(a,'save_home',{p_layout:saved.layout,p_privacy:'friends',p_revision:saved.revision})
 console.log('PASS: two-user home visits, authoritative movement/collision, privacy revocation and save conflicts')
 await call(b,'set_block',{p_user:alice.id,p_block:true})
 const revoked=await a.from('direct_messages').select('id').eq('conversation_id',conversation);assert.ifError(revoked.error);assert.equal(revoked.data.length,0)
 await denied(a.rpc('request_friend',{p_username:bob.handle}),'block denies friend requests')
 await denied(a.rpc('send_direct',{p_conversation:conversation,p_body:'after block',p_client:crypto.randomUUID()}),'block denies DM sends')
 await denied(b.rpc('enter_home',{p_owner:alice.id,p_token:crypto.randomUUID()}),'block denies visits')
 // Restore test friendship solely for browser checks; test fixtures are deleted afterward.
 if(process.argv.includes('--keep-browser-fixtures')){
  await call(b,'set_block',{p_user:alice.id,p_block:false});const f=await call(a,'request_friend',{p_username:bob.handle});await call(b,'respond_friend',{p_request:f,p_action:'accept'})
  fs.writeFileSync(fixtures,JSON.stringify({users,conversation,created_at:new Date().toISOString()}));console.log('Temporary browser fixtures prepared in ignored Supabase temp storage.')
 }
 console.log('PASS: blocking revokes DMs, requests and home access')
 passed=true;console.log('ALL AUTHENTICATED SOCIAL/HOME INTEGRATION CHECKS PASSED')
}finally{
 for(const [db,channel]of channels)await db.removeChannel(channel)
 for(const db of clients)await db.removeAllChannels()
 if(!passed||!process.argv.includes('--keep-browser-fixtures')){
  const failures=[];for(const user of users){const {error}=await admin.auth.admin.deleteUser(user.id);if(error)failures.push(user.id)}
  if(failures.length)throw new Error(`Could not clean up ${failures.length} temporary test accounts. Use the test admin to remove them.`)
  console.log('Temporary integration accounts cleaned up.')
 }
}

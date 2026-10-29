// Dedicated Supabase integration only. Never sends real invitation/recovery mail.
import {createClient} from '@supabase/supabase-js'
import assert from 'node:assert/strict'
import {requireDisposableTarget} from './disposable-target.mjs'
const url=process.env.REALM_TEST_PROJECT_URL,key=process.env.SUPABASE_ANON_KEY,secret=process.env.SUPABASE_SERVICE_ROLE_KEY
if(!url||!key||!secret)throw new Error('Provide REALM_TEST_PROJECT_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY for a dedicated disposable project with the test-only fixture SQL installed.')
requireDisposableTarget(url)
const options={auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(input,init)=>fetch(input,{...init,signal:AbortSignal.timeout(30000)})}}
const admin=createClient(url,secret,options),users=[],clients=[];let space
async function call(db,name,args){const {data,error}=await db.rpc(name,args);if(error)throw error;return data}
async function deny(result,code){const r=await result;assert.ok(r.error,'denial expected');if(code)assert.equal(r.error.code,code);return r}
try{
 const tag=Date.now().toString(36),password=crypto.randomUUID()+'Aa1!'
 for(let n=0;n<5;n++){const email=`realm-access-${tag}-${n}@example.invalid`,created=await admin.auth.admin.createUser({email,password,email_confirm:true});if(created.error)throw created.error;users.push(created.data.user)}
 const fixture=await call(admin,'realm_test_fixture',{p_users:users.map(u=>u.id),p_space:true});space=fixture.space;const channel=fixture.channel
 for(const user of users){const db=createClient(url,key,options),auth=await db.auth.signInWithPassword({email:user.email,password});if(auth.error)throw auth.error;clients.push(db)}
 const [owner,member,third,fourth,outsider]=clients
 const invite=await call(owner,'membership_invite',{p_action:'create',p_space:space,p_email:users[2].email})
 const redemption=await Promise.all([third.rpc('membership_invite',{p_action:'redeem',p_token:invite.token}),third.rpc('membership_invite',{p_action:'redeem',p_token:invite.token})])
 assert.equal(redemption.filter(r=>!r.error).length,1,'exactly one concurrent redemption succeeds')
 await deny(outsider.rpc('space_admin_data',{p_space:space}),'42501')
 const nextInvite=await call(owner,'membership_invite',{p_action:'create',p_space:space,p_email:users[3].email});await call(fourth,'membership_invite',{p_action:'redeem',p_token:nextInvite.token})
 const identity=await call(member,'get_identity'),friend=await call(owner,'request_friend',{p_username:identity.profile.username});await call(member,'respond_friend',{p_request:friend,p_action:'accept'})
 const dm=await call(owner,'open_direct',{p_user:users[1].id}),retry=crypto.randomUUID()
 const same=await Promise.all(Array.from({length:12},()=>owner.rpc('message_send',{p_kind:'channel',p_stream:channel,p_body:'One idempotent send',p_client:retry})))
 same.forEach(r=>assert.ifError(r.error));assert.equal(new Set(same.map(r=>r.data)).size,1)
 const flood=await Promise.all(Array.from({length:15},(_,n)=>n%3===0?owner.from('messages').insert({channel_id:channel,author_id:users[0].id,client_id:crypto.randomUUID(),body:`Raw ${n}`}):owner.rpc('message_send',{p_kind:n%3===1?'channel':'direct',p_stream:n%3===1?channel:dm,p_body:`Limited ${n}`,p_client:crypto.randomUUID()})))
 assert.equal(flood.filter(r=>!r.error).length,9,'one accepted retry plus nine parallel sends exhaust shared bucket');flood.filter(r=>r.error).forEach(r=>assert.equal(r.error.code,'PT429'))
 console.log('PASS: five identities, concurrent single-use redemption/retries and shared REST/RPC channel/DM quota')
 await call(admin,'realm_test_control',{p_user:users[0].id})
 const before=await call(member,'message_history',{p_kind:'channel',p_stream:channel});await call(admin,'realm_test_control',{p_user:users[0].id,p_history_channel:channel})
 let cursor=before.watermark,high,events=0
 do{const page=await call(member,'message_recover',{p_kind:'channel',p_stream:channel,p_after:cursor,p_through:high??null});assert.equal(page.reset,false);events+=page.events.length;cursor=page.next;high=page.watermark}while(cursor<high)
 assert.equal(events,125)
 const message=before.messages[0];await call(owner,'message_change',{p_kind:'channel',p_stream:channel,p_message:message.id,p_revision:message.revision,p_body:'Edited old history'})
 const edit=await call(member,'message_recover',{p_kind:'channel',p_stream:channel,p_after:high});assert.equal(edit.messages[0].body,'Edited old history')
 await deny(owner.rpc('message_change',{p_kind:'channel',p_stream:channel,p_message:message.id,p_revision:message.revision,p_body:'stale'}),'PT409')
 await call(owner,'message_change',{p_kind:'channel',p_stream:channel,p_message:message.id,p_revision:edit.messages[0].revision,p_remove:true})
 const removed=await call(member,'message_recover',{p_kind:'channel',p_stream:channel,p_after:edit.watermark});assert.equal(removed.messages[0].body,'');assert.ok(removed.messages[0].removed_at)
 console.log('PASS: 125-event recovery and revisioned edits/tombstones outside latest page')
 const evil=await call(member,'message_send',{p_kind:'direct',p_stream:dm,p_body:'Reportable integration fixture',p_client:crypto.randomUUID()})
 await call(owner,'submit_report',{p_kind:'direct',p_stream:dm,p_message:evil,p_reason:'spam',p_block:true})
 await deny(member.rpc('message_history',{p_kind:'direct',p_stream:dm}),'42501');await deny(owner.rpc('report_queue',{}),'42501')
 await call(admin,'realm_test_control',{p_user:users[1].id,p_state:'suspended'})
 assert.equal((await member.from('profiles').select('id')).data.length,0);await deny(member.rpc('get_identity'),'42501');assert.equal((await call(member,'access_status')).active,false)
 await call(admin,'realm_test_control',{p_user:users[1].id,p_state:'active'})
 const transfers=await Promise.all([owner.rpc('manage_space',{p_action:'transfer',p_space:space,p_target:users[1].id,p_revision:0}),owner.rpc('manage_space',{p_action:'transfer',p_space:space,p_target:users[2].id,p_revision:0})])
 assert.equal(transfers.filter(r=>!r.error).length,1);const roster=await call(owner,'space_admin_data',{p_space:space});assert.equal(roster.members.filter(m=>m.role==='owner').length,1)
 const job=await call(third,'privacy_request',{p_action:'export'});await call(admin,'process_privacy_jobs');await deny(fourth.rpc('privacy_request',{p_action:'download',p_job:job.id}),'42501')
 const own=await call(third,'privacy_request',{p_action:'download',p_job:job.id});assert.equal(own.profile.id,users[2].id);assert.equal(Object.hasOwn(own,'reports'),false)
 console.log('PASS: report-before-block, scoped DM evidence, suspended old JWT, concurrent transfer and private export authorization')
 console.log('ACCESS INTEGRATION PASSED. Real mail, scheduler, deletion rehearsal and browser realtime remain separate gates.')
}finally{
 for(const db of clients)await db.removeAllChannels()
 const failures=[]
 if(space){const r=await admin.from('spaces').delete().eq('id',space);if(r.error)failures.push('space')}
 for(const user of users){const r=await admin.auth.admin.deleteUser(user.id);if(r.error)failures.push('account')}
 if(failures.length)throw new Error('Fixture cleanup needs operator review; no success claim is made.')
}

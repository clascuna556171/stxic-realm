import test from 'node:test'
import assert from 'node:assert/strict'
import {defaults} from '../src/appearance.ts'
import {appearanceFor,identityPayload,saveIdentity,getIdentity,invoke,errorText} from '../src/account-repository.ts'
import {mergeDirectMessages} from '../src/direct.ts'
const profile={id:'alice',username:' alice ',display_name:' Alice ',bio:' Hello ',revision:3,updated_at:''}
test('public character payload excludes private theme and separates home mood',()=>{
 const payload=identityPayload(profile,{...defaults,accent:'violet',logo:'ocean',mood:'tech'})
 assert.equal(payload.p_username,'alice');assert.equal(payload.p_name,'Alice');assert.equal(payload.p_revision,3)
 assert.equal(payload.p_character.version,1);assert.equal(Object.hasOwn(payload.p_character,'accent'),false);assert.equal(Object.hasOwn(payload.p_character,'logo'),false);assert.equal(Object.hasOwn(payload.p_character,'mood'),false)
 assert.deepEqual(payload.p_theme,{accent:'violet',logo:'ocean'});assert.equal(payload.p_mood,'tech')
 assert.deepEqual(appearanceFor({character:payload.p_character,theme:payload.p_theme,mood:payload.p_mood}),{...defaults,accent:'violet',logo:'ocean',mood:'tech'})
})
test('identity save propagates conflict and connection failures without claiming success',async()=>{
 const error={code:'40001',message:'Profile changed elsewhere'}
 await assert.rejects(saveIdentity({rpc:async()=>({data:null,error})},profile,defaults),e=>e===error)
 const identity={profile,character:{},theme:{},mood:'cozy'}
 assert.equal(await getIdentity({rpc:async(name)=>{assert.equal(name,'get_identity');return {data:identity,error:null}}}),identity)
})
test('direct-message recovery merges duplicate hints and retains older history with stable tie order',()=>{
 const base={author_id:'alice',client_id:'client',conversation_id:'dm',body:'hello',created_at:'2026-10-28T00:00:00Z'}
 const old={...base,id:'a',created_at:'2026-10-27T00:00:00Z'},a={...base,id:'b'},b={...base,id:'c'}
 assert.deepEqual(mergeDirectMessages([old,b],[a,b]).map(m=>m.id),['a','b','c'])
 assert.equal(mergeDirectMessages([a],[{...a,body:'canonical'}])[0].body,'canonical')
})
test('Edge failures preserve the actionable server explanation and retry interval',async()=>{
 const error={context:new Response(JSON.stringify({code:'PT429',error:'Wait before replacing this invitation.'}),{status:429,headers:{'Retry-After':'60'}})}
 await assert.rejects(invoke({functions:{invoke:async()=>({data:null,error})}},'realm-invitations',{}),e=>errorText(e).includes('60 seconds')&&errorText(e).includes('Wait before'))
})

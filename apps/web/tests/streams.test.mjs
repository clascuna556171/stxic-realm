import test from 'node:test'
import assert from 'node:assert/strict'
import {mergeMessages,recoverStream,draftKey,sameDraft} from '../src/stream-repository.ts'
import {parseAuthCallback,callbackUrl} from '../src/auth-flow.ts'
import {membershipToken} from '../src/space-repository.ts'
const base={author_id:'alice',body:'hello',client_id:'retry',created_at:'2026-10-28T00:00:00Z',created_revision:1,removed_at:null,edited_at:null}
test('journal recovery drains a fixed watermark across more than 100 missed changes',async()=>{
 const requests=[],applied=[]
 const db={rpc:async(name,args)=>{requests.push(args);const next=Math.min(args.p_after+50,125);return {error:null,data:{reset:false,next,watermark:125,messages:[],events:Array.from({length:next-args.p_after},(_,i)=>({message_id:String(args.p_after+i+1),revision:args.p_after+i+1}))}}}}
 assert.equal(await recoverStream(db,'channel','space',0,page=>applied.push(...page.events)),125)
 assert.deepEqual(requests.map(r=>r.p_after),[0,50,100]);assert.deepEqual(requests.map(r=>r.p_through),[null,125,125]);assert.equal(applied.length,125)
})
test('expired journal explicitly resets and a missing journal page never silently advances',async()=>{
 let reset=false
 assert.equal(await recoverStream({rpc:async()=>({data:{reset:true,watermark:99},error:null})},'direct','dm',0,page=>{reset=page.reset}),-1);assert.equal(reset,true)
 await assert.rejects(recoverStream({rpc:async()=>({data:{reset:false,next:0,watermark:99},error:null})},'channel','id',0,()=>{}),/interrupted/)
})
test('old edits and tombstones merge by revision and hidden messages are evicted',()=>{
 const first={...base,id:'a',revision:1},second={...base,id:'b',revision:2},removed={...first,body:'',removed_at:'2026-10-28T01:00:00Z',revision:8}
 const rows=mergeMessages([first,second],[removed,second],['b'])
 assert.deepEqual(rows.map(m=>m.id),['a','b']);assert.equal(rows[0].body,'')
 assert.equal(mergeMessages(rows,[first])[0].removed_at,removed.removed_at)
 assert.deepEqual(mergeMessages(rows,[],['a']).map(m=>m.id),['b'])
})
test('drafts isolate accounts and streams and a late send preserves a newer draft',()=>{
 assert.notEqual(draftKey('a','channel','x'),draftKey('b','channel','x'));assert.notEqual(draftKey('a','direct','x'),draftKey('a','channel','x'))
 assert.equal(sameDraft(1,2),false);assert.equal(sameDraft(2,2),true)
})
test('callbacks accept only invitation/recovery proofs and preserve the application grant',()=>{
 assert.deepEqual(parseAuthCallback('http://127.0.0.1:5175/auth/callback?flow=invite&admission=grant#access_token=access&refresh_token=refresh&type=invite'),{type:'invite',accessToken:'access',refreshToken:'refresh',tokenHash:undefined,admission:'grant'})
 assert.equal(parseAuthCallback('http://127.0.0.1:5175/auth/callback?type=invite'),null)
 assert.equal(parseAuthCallback('http://127.0.0.1:5175/auth/callback?type=signup&token_hash=wrong'),null)
 assert.throws(()=>parseAuthCallback('http://127.0.0.1:5175/auth/callback#error=access_denied'),/expired/)
 assert.equal(new URL(callbackUrl('https://realm.example','recovery')).origin,'https://realm.example')
 assert.equal(new URL(callbackUrl('https://realm.example','invite','a&b')).searchParams.get('admission'),'a&b')
})
test('pasted membership links extract a token and malformed pasted text remains safely rejectable',()=>{
 assert.equal(membershipToken('https://realm.example/?spaces&invite=grant'),'grant')
 assert.equal(membershipToken('invite=malformed'),'invite=malformed')
})

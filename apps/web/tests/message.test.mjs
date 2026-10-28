import test from 'node:test'
import assert from 'node:assert/strict'
import { sendMessage } from '../src/message-repository.ts'
test('accepts a previously committed matching retry', async () => {
  const db={rpc:async(name,args)=>{assert.equal(name,'message_send');assert.deepEqual(args,{p_kind:'channel',p_stream:'channel',p_body:'hello',p_client:'key'});return {data:'committed-id',error:null}}}
  await sendMessage(db, 'channel', 'user', 'hello', 'key')
})
test('rejects a duplicate key belonging to different content', async () => {
  const error={code:'PT409',message:'Retry identifier belongs to different content.'}
  await assert.rejects(sendMessage({rpc:async()=>({error})}, 'channel', 'user', 'hello', 'key'),e=>e===error)
})
test('propagates authorization errors', async () => {
  const error={code:'42501',message:'Account access is unavailable.'}
  await assert.rejects(sendMessage({rpc:async()=>({error})}, 'channel', 'user', 'hello', 'key'),e=>e===error)
})

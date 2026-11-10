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

test('formats reply citation with quote block and parent author', () => {
  const replyAuthor = 'Alice'
  const parentBody = 'Hello world\nSecond line'
  const userText = 'Replying back'
  const replyQuote = `> 💬 *In reply to @${replyAuthor}*:\n> ${parentBody.replace(/\n/g, '\n> ')}\n\n`
  const fullBody = `${replyQuote}${userText}`
  assert.equal(
    fullBody,
    '> 💬 *In reply to @Alice*:\n> Hello world\n> Second line\n\nReplying back'
  )
})

test('formats markdown links and nested bold/italic', () => {
  const regex = /(\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\))|(https?:\/\/[^\s<]+[^<.,:;"')\]\s])|(`[^`\n]+`)|(\*\*[^\n]+?\*\*)|(~~[^\n]+?~~)|(\*[^*\n]+?\*)|(_[^_\n]+?_)/g
  const text = 'Check [Link](https://realm.chat) and **bold *italic* text**'
  const matches = []
  let match
  while ((match = regex.exec(text)) !== null) {
    matches.push({ token: match[0], isMdLink: !!match[1], label: match[2], url: match[3], isBold: !!match[6] })
  }
  assert.equal(matches.length, 2)
  assert.equal(matches[0].isMdLink, true)
  assert.equal(matches[0].label, 'Link')
  assert.equal(matches[0].url, 'https://realm.chat')
  assert.equal(matches[1].isBold, true)
  assert.equal(matches[1].token, '**bold *italic* text**')
})

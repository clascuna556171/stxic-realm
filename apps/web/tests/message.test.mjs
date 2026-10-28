import test from 'node:test'
import assert from 'node:assert/strict'
import { sendMessage } from '../src/message-repository.ts'
function db(insertError, existing) {
  const lookup = { maybeSingle: async () => ({ data: existing, error: null }) }
  return { from: () => ({
    insert: async () => ({ error: insertError }),
    select: () => ({ eq: () => ({ eq: () => lookup }) }),
  }) }
}
test('accepts a previously committed matching retry', async () => {
  await sendMessage(db({code:'23505'}, {channel_id:'channel',body:'hello'}), 'channel', 'user', 'hello', 'key')
})
test('rejects a duplicate key belonging to different content', async () => {
  await assert.rejects(sendMessage(db({code:'23505'}, {channel_id:'other',body:'hello'}), 'channel', 'user', 'hello', 'key'))
})
test('propagates authorization errors', async () => {
  await assert.rejects(sendMessage(db({code:'42501'}, null), 'channel', 'user', 'hello', 'key'))
})

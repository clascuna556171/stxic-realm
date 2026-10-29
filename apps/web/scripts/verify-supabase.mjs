import { createClient } from '@supabase/supabase-js'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {requireDisposableTarget} from './disposable-target.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

// Read environment from apps/web/.env.local if present
let envUrl = process.env.VITE_SUPABASE_URL
let envAnonKey = process.env.VITE_SUPABASE_ANON_KEY
const envLocalPath = path.join(__dirname, '..', '.env.local')

if (fs.existsSync(envLocalPath)) {
  const content = fs.readFileSync(envLocalPath, 'utf8')
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (trimmed.startsWith('#') || !trimmed.includes('=')) continue
    const [k, ...rest] = trimmed.split('=')
    const val = rest.join('=').trim()
    if (k === 'VITE_SUPABASE_URL' && !envUrl) envUrl = val
    if (k === 'VITE_SUPABASE_ANON_KEY' && !envAnonKey) envAnonKey = val
  }
}

const SUPABASE_URL = envUrl || process.env.SUPABASE_URL
const SUPABASE_ANON_KEY = envAnonKey || process.env.SUPABASE_ANON_KEY
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing required environment variables:')
  console.error('  VITE_SUPABASE_URL:', Boolean(SUPABASE_URL))
  console.error('  VITE_SUPABASE_ANON_KEY:', Boolean(SUPABASE_ANON_KEY))
  console.error('  SUPABASE_SERVICE_ROLE_KEY:', Boolean(SUPABASE_SERVICE_ROLE_KEY))
  process.exit(1)
}

if(process.env.REALM_TEST_PROJECT_URL!==SUPABASE_URL)throw new Error('Set REALM_TEST_PROJECT_URL to the dedicated disposable test project URL.')
requireDisposableTarget(SUPABASE_URL)

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

function createUserClient() {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

async function run() {
  console.log('=== STARTING SUPABASE INTEGRATION & RLS VERIFICATION ===')
  console.log(`Target: ${SUPABASE_URL}`)
  const timestamp = Date.now()
  const password = `TestPassword_${timestamp}!123`

  const email1 = `member1_${timestamp}@test.realm`
  const email2 = `member2_${timestamp}@test.realm`
  const email3 = `nonmember_${timestamp}@test.realm`

  let u1, u2, u3
  let spaceId, channelId

  try {
    // 1. Provision Auth Users
    console.log('\n[1/8] Provisioning 3 test accounts via Admin API...')
    const res1 = await admin.auth.admin.createUser({ email: email1, password, email_confirm: true })
    if (res1.error) throw res1.error
    u1 = res1.data.user
    console.log(`  ✓ Created member1: ${u1.id} (${email1})`)

    const res2 = await admin.auth.admin.createUser({ email: email2, password, email_confirm: true })
    if (res2.error) throw res2.error
    u2 = res2.data.user
    console.log(`  ✓ Created member2: ${u2.id} (${email2})`)

    const res3 = await admin.auth.admin.createUser({ email: email3, password, email_confirm: true })
    if (res3.error) throw res3.error
    u3 = res3.data.user
    console.log(`  ✓ Created nonmember: ${u3.id} (${email3})`)

    // Atomic owner/member creation preserves the deferred exact-owner invariant.
    const fixture = await admin.rpc('realm_test_fixture', { p_users: [u1.id,u2.id,u3.id], p_space: true })
    if(fixture.error) throw new Error('Install supabase/tests/integration_fixture_support.sql in the dedicated test project first.')
    spaceId=fixture.data.space
    channelId=fixture.data.channel
    // 3. Test Unauthenticated (Anon) Access Denied
    console.log('\n[3/8] Testing unauthenticated (Anon) access restrictions...')
    const { data: anonSpaces } = await anon.from('spaces').select('*')
    assert.equal(anonSpaces?.length ?? 0, 0, 'Anon should see 0 spaces')

    const { data: anonChannels } = await anon.from('channels').select('*')
    assert.equal(anonChannels?.length ?? 0, 0, 'Anon should see 0 channels')

    const { data: anonMessages } = await anon.from('messages').select('*')
    assert.equal(anonMessages?.length ?? 0, 0, 'Anon should see 0 messages')

    const { error: anonInsertErr } = await anon.from('messages').insert({
      channel_id: channelId,
      author_id: u1.id,
      client_id: crypto.randomUUID(),
      body: 'Anon intrusion attempt',
    })
    assert(anonInsertErr, 'Anon insert must fail')
    console.log(`  ✓ Anon access blocked as expected (error code: ${anonInsertErr.code})`)

    // 4. Authenticate User Clients
    console.log('\n[4/8] Authenticating test clients...')
    const client1 = createUserClient()
    const { error: auth1Err } = await client1.auth.signInWithPassword({ email: email1, password })
    if (auth1Err) throw auth1Err
    console.log('  ✓ Client 1 authenticated')

    const client2 = createUserClient()
    const { error: auth2Err } = await client2.auth.signInWithPassword({ email: email2, password })
    if (auth2Err) throw auth2Err
    console.log('  ✓ Client 2 authenticated')

    const client3 = createUserClient()
    const { error: auth3Err } = await client3.auth.signInWithPassword({ email: email3, password })
    if (auth3Err) throw auth3Err
    console.log('  ✓ Nonmember Client 3 authenticated')

    // 5. Test Membership-Based Read Access
    console.log('\n[5/8] Testing membership-based data boundary...')
    const { data: c1Spaces } = await client1.from('spaces').select('id, name')
    assert.equal(c1Spaces?.length, 1, 'Member1 should see 1 space')
    assert.equal(c1Spaces[0].id, spaceId)

    const { data: c2Spaces } = await client2.from('spaces').select('id, name')
    assert.equal(c2Spaces?.length, 1, 'Member2 should see 1 space')

    const { data: c3Spaces } = await client3.from('spaces').select('id, name')
    assert.equal(c3Spaces?.length ?? 0, 0, 'Nonmember should see 0 spaces')

    const { data: c1Channels } = await client1.from('channels').select('id, name')
    assert.equal(c1Channels?.length, 1, 'Member1 should see 1 channel')

    const { data: c3Channels } = await client3.from('channels').select('id, name')
    assert.equal(c3Channels?.length ?? 0, 0, 'Nonmember should see 0 channels')
    console.log('  ✓ Members can read space/channels; Nonmember sees 0 spaces and 0 channels')

    // 6. Test Messaging, RLS, and Anti-Spoofing
    console.log('\n[6/8] Testing messaging RLS, anti-spoofing, and idempotency...')
    const clientId1 = crypto.randomUUID()
    const msgText = 'Hello Realm from member 1!'

    // 6a. Member 1 posts a message
    const { error: postErr } = await client1.from('messages').insert({
      channel_id: channelId,
      author_id: u1.id,
      client_id: clientId1,
      body: msgText,
    })
    assert(!postErr, `Member 1 failed to post message: ${postErr?.message}`)
    console.log('  ✓ Member 1 successfully posted message')

    // 6b. Member 2 reads the message
    const { data: c2Messages, error: readErr } = await client2.from('messages').select('id, body, author_id').eq('channel_id', channelId)
    assert(!readErr)
    assert.equal(c2Messages.length, 1)
    assert.equal(c2Messages[0].body, msgText)
    console.log('  ✓ Member 2 successfully read Member 1 message')

    // 6c. Nonmember attempts to read messages
    const { data: c3Messages } = await client3.from('messages').select('*').eq('channel_id', channelId)
    assert.equal(c3Messages?.length ?? 0, 0, 'Nonmember must not see messages')
    console.log('  ✓ Nonmember cannot see messages (0 rows returned)')

    // 6d. Nonmember attempts to insert message
    const { error: c3InsertErr } = await client3.from('messages').insert({
      channel_id: channelId,
      author_id: u3.id,
      client_id: crypto.randomUUID(),
      body: 'Nonmember intrusion attempt',
    })
    assert(c3InsertErr, 'Nonmember insert must be rejected')
    console.log(`  ✓ Nonmember message insert rejected by RLS: ${c3InsertErr.message}`)

    // 6e. Author spoofing: Member 2 tries to post as Member 1
    const { error: spoofErr } = await client2.from('messages').insert({
      channel_id: channelId,
      author_id: u1.id, // Trying to spoof Member 1!
      client_id: crypto.randomUUID(),
      body: 'Spoofed message',
    })
    assert(spoofErr, 'Author spoofing must be rejected by RLS check (author_id = auth.uid())')
    console.log(`  ✓ Author spoofing correctly rejected: ${spoofErr.message}`)

    // 6f. Privilege escalation: Member 2 attempts to grant membership or add channel
    const { error: escMemErr } = await client2.from('space_members').insert({
      space_id: spaceId,
      user_id: u3.id,
      role: 'owner',
    })
    assert(escMemErr, 'Client membership insertion must be rejected')

    const { error: escChanErr } = await client2.from('channels').insert({
      space_id: spaceId,
      name: 'unauthorized-channel',
    })
    assert(escChanErr, 'Client channel insertion must be rejected')
    console.log('  ✓ Privilege escalation attempts (unauthorized space_members/channels insert) rejected')

    // 7. Test Realtime Subscriptions
    console.log('\n[7/8] Testing Supabase Realtime broadcast/postgres_changes...')
    let receivedRealtime = false
    const realtimePayloads = []

    // Ensure Realtime WebSocket carries the authenticated user's JWT in Node.js
    const session2 = (await client2.auth.getSession()).data.session
    if (session2?.access_token) {
      await client2.realtime.setAuth(session2.access_token)
    }

    const realtimeChannel = client2
      .channel(`test-messages-${timestamp}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `channel_id=eq.${channelId}` }, payload => {
        receivedRealtime = true
        realtimePayloads.push(payload)
      })

    const subscriptionStatus = await new Promise((resolve) => {
      const timer = setTimeout(() => resolve('TIMED_OUT'), 10000)
      realtimeChannel.subscribe(status => {
        if (status === 'SUBSCRIBED') {
          clearTimeout(timer)
          resolve(status)
        }
      })
    })

    console.log(`  Subscription status: ${subscriptionStatus}`)
    if (subscriptionStatus === 'SUBSCRIBED') {
      const liveMsg = 'Live realtime test message!'
      await client1.from('messages').insert({
        channel_id: channelId,
        author_id: u1.id,
        client_id: crypto.randomUUID(),
        body: liveMsg,
      })

      // Wait up to 5s for event
      for (let i = 0; i < 50; i++) {
        if (receivedRealtime) break
        await new Promise(r => setTimeout(r, 100))
      }

      assert(receivedRealtime, 'Member 2 should have received realtime message')
      assert.equal(realtimePayloads[0]?.new?.body, liveMsg)
      console.log('  ✓ Member 2 received realtime INSERT event successfully!')
      await client2.removeChannel(realtimeChannel)
    } else {
      throw new Error('Realtime subscription did not succeed: ' + subscriptionStatus)
    }

    // 8. Test Membership Revocation
    console.log('\n[8/8] Testing membership revocation...')
    const { error: delMemErr } = await admin.from('space_members').delete().eq('space_id', spaceId).eq('user_id', u2.id)
    assert(!delMemErr)
    console.log('  ✓ Admin removed Member 2 from space_members')

    const { data: revMsgRead } = await client2.from('messages').select('*').eq('channel_id', channelId)
    assert.equal(revMsgRead?.length ?? 0, 0, 'Revoked member must no longer see messages')

    const { error: revMsgInsert } = await client2.from('messages').insert({
      channel_id: channelId,
      author_id: u2.id,
      client_id: crypto.randomUUID(),
      body: 'Message after revocation',
    })
    assert(revMsgInsert, 'Revoked member must not be able to insert messages')
    console.log('  ✓ Revoked member immediately loses read and write permissions!')

    console.log('\n=== ALL SUPABASE BACKEND & RLS CHECKS PASSED SUCCESSFULLY ===\n')
  } finally {
    console.log('Cleaning up test resources...')
    const cleanupFailures=[]
    if (spaceId) {
      const deleted=await admin.from('spaces').delete().eq('id', spaceId)
      if(deleted.error)cleanupFailures.push('space')
      console.log('  ✓ Deleted test space')
    }
    for(const user of [u1,u2,u3])if(user?.id){const deleted=await admin.auth.admin.deleteUser(user.id);if(deleted.error)cleanupFailures.push('account')}
    if(cleanupFailures.length)throw new Error('Temporary resource cleanup needs operator review; no success claim is made.')
    console.log('  ✓ Deleted test auth users')
  }
}

run().catch(err => {
  console.error('\n❌ TEST FAILED:', err)
  process.exit(1)
})

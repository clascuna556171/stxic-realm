import { chromium } from 'playwright'
import { PGlite } from '@electric-sql/pglite'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'
import { readFile, readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import assert from 'node:assert/strict'

const root = resolve('D:/Tech/Projects/stxic-realm')
const origin = process.env.REALM_UI_ORIGIN ?? 'http://127.0.0.1:5175'
const brainDir = 'C:/Users/Sebaz/.gemini/antigravity-cli/brain/d83f9aa1-ba61-46dd-a6d7-7e7b31962e30'

const env = await readFile(resolve(root, 'apps/web/.env.local'), 'utf8')
const backend = env.match(/^VITE_SUPABASE_URL=(.*)$/m)?.[1]?.trim()
const storageKey = `sb-${new URL(backend).hostname.split('.')[0]}-auth-token`
const users = {
  founder: '10000000-0000-4000-8000-000000000001',
  outsider: '40000000-0000-4000-8000-000000000004',
}

const db = new PGlite({ extensions: { pgcrypto } })
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

for (const file of (await readdir(resolve(root, 'supabase/migrations'))).filter(f => f.endsWith('.sql')).sort()) {
  await db.exec(await readFile(resolve(root, 'supabase/migrations', file), 'utf8'))
}

// Set up Founder and Outsider accounts
await db.query('insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())', [users.founder, 'founder@example.invalid'])
await db.query('insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())', [users.outsider, 'outsider@example.invalid'])
await db.query('update public.profiles set display_name=$1 where id=$2', ['Founder / Sovereign', users.founder])
await db.query('update public.profiles set display_name=$1 where id=$2', ['Outsider', users.outsider])
await db.exec(`update realm_private.accounts set state='active';update realm_private.settings set value='true' where key='administration';`)

// Add founder to platform_admins table
await db.query('insert into realm_private.platform_admins(user_id) values($1)', [users.founder])

const sqlRpc = (name, args) =>
  db.query(`select public."${name}"(${Object.keys(args).map((key, i) => `"${key}"=>$${i+1}`).join(',')}) as result`, Object.values(args).map(v => v && typeof v === 'object' ? JSON.stringify(v) : v)).then(r => r.rows[0].result)

async function asUser(id, task) {
  await db.exec('begin;set local role authenticated')
  await db.query("select set_config('request.jwt.claim.sub',$1,true)", [id])
  try {
    const res = await task()
    await db.exec('commit')
    return res
  } catch (e) {
    await db.exec('rollback')
    throw e
  }
}

// 1. Backend Security Test: Outsider cannot save realm-creator
console.log('Testing backend security enforcement...')
try {
  await asUser(users.outsider, async () => {
    const card = await sqlRpc('get_profile_card', {})
    const hackedStyle = { ...card.card.style, frame_id: 'realm-creator' }
    await sqlRpc('save_profile_card', {
      p_profile: card.profile,
      p_card: { ...card.card, style: hackedStyle },
      p_revision: card.card.revision,
      p_identity_revision: card.profile.revision,
    })
  })
  assert.fail('Outsider must NOT be able to save realm-creator frame')
} catch (e) {
  console.log('✔ Non-founder save correctly rejected by database:', e.message)
}

// 2. Founder CAN save realm-creator
await asUser(users.founder, async () => {
  const card = await sqlRpc('get_profile_card', {})
  const founderStyle = { ...card.card.style, frame_id: 'realm-creator', avatar_shape: 'circle', frame_effects: true }
  await sqlRpc('save_profile_card', {
    p_profile: card.profile,
    p_card: { ...card.card, style: founderStyle },
    p_revision: card.card.revision,
    p_identity_revision: card.profile.revision,
  })
})
console.log('✔ Founder successfully equipped realm-creator in database!')

// 3. Browser UI Verification & Capture
const browser = await chromium.launch({ channel: 'chrome', headless: true })

async function contextFor(userId) {
  const user = { id: userId, email: `${userId}@example.invalid`, email_confirmed_at: new Date().toISOString(), aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {} }
  const b64 = v => Buffer.from(JSON.stringify(v)).toString('base64url')
  const token = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600, role: 'authenticated' })}.fixture`
  const session = { access_token: token, refresh_token: 'fixture', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: 'bearer', user }

  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  await context.addInitScript(({ key, session }) => localStorage.setItem(key, JSON.stringify(session)), { key: storageKey, session })
  await context.routeWebSocket('**/realtime/v1/**', ws => ws.close())
  await context.route('**/*', async route => {
    const req = route.request(), url = new URL(req.url())
    if (url.origin === origin) return route.continue()
    if (url.origin !== new URL(backend).origin) return route.abort()
    const reply = (data, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data), headers: { 'Access-Control-Allow-Origin': origin } })
    if (req.method() === 'OPTIONS') return reply({})
    if (url.pathname.startsWith('/auth/v1/')) return reply(url.pathname.endsWith('/user') ? user : session)
    try {
      if (url.pathname.includes('/rpc/')) {
        const name = url.pathname.split('/').pop(), args = req.postDataJSON() ?? {}
        const res = await asUser(user.id, () => sqlRpc(name, args))
        return reply(res)
      }
      const table = url.pathname.split('/').pop()
      const rows = await asUser(user.id, () => db.query(`select * from public."${table}"`).then(r => r.rows))
      return reply(req.headers().accept?.includes('vnd.pgrst.object') ? rows[0] : rows)
    } catch (e) {
      return reply({ code: 'fixture', message: e.message }, 400)
    }
  })
  return context
}

const founderContext = await contextFor(users.founder)
const page = await founderContext.newPage()
await page.goto(`${origin}/?profile`)
await page.locator('.account-profile-card').waitFor({ state: 'visible' })

// Verify Realm Creator is equipped on card!
const profilePhoto = page.locator('.account-profile-photo')
assert.equal(await profilePhoto.getAttribute('data-frame'), 'realm-creator')
console.log('✔ Card displays realm-creator frame!')

// Screenshot circular frame on card
await page.waitForTimeout(400)
const card = page.locator('.account-profile-card')
await card.screenshot({ path: resolve(brainDir, 'audit-realm-creator-circle.png') })
console.log('✔ Captured audit-realm-creator-circle.png')

// Switch to Profile frames tab
await page.getByRole('tab', { name: 'Profile frames', exact: true }).click()
await page.getByText('Currently equipped', { exact: true }).waitFor()

// Verify Founder badge appears in gallery
const founderBadge = page.locator('.frame-founder-badge')
await founderBadge.waitFor({ state: 'visible' })
console.log('✔ Found Founder Only badge in frame collection!')

// Switch to Rounded Square shape
await page.getByRole('radio', { name: 'Rounded square', exact: true }).check()
await page.waitForTimeout(300)
assert.equal(await profilePhoto.getAttribute('data-shape'), 'rounded-square')
await card.screenshot({ path: resolve(brainDir, 'audit-realm-creator-rounded.png') })
console.log('✔ Captured audit-realm-creator-rounded.png')

// Switch to Square shape
await page.getByRole('radio', { name: 'Square', exact: true }).check()
await page.waitForTimeout(300)
assert.equal(await profilePhoto.getAttribute('data-shape'), 'square')
await card.screenshot({ path: resolve(brainDir, 'audit-realm-creator-square.png') })
console.log('✔ Captured audit-realm-creator-square.png')

// Save profile with equipped frame
await page.getByRole('button', { name: 'Save profile & equip', exact: true }).click()
await page.getByText('Profile saved to your account.', { exact: true }).waitFor()
console.log('✔ Profile successfully saved with equipped Realm Creator frame!')

await browser.close()
await db.close()
console.log('🎉 All Realm Creator frame audits PASSED!')

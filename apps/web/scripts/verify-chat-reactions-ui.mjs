// Intercepted Auth/PostgREST transport backed by local PGlite SQL/RLS
import { chromium } from 'playwright'
import { PGlite } from '@electric-sql/pglite'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'
import { readFile, readdir, mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import assert from 'node:assert/strict'

const root = resolve(import.meta.dirname, '../../..')
const origin = process.env.REALM_UI_ORIGIN ?? 'http://127.0.0.1:5175'
const output = resolve(root, '.impeccable/review/chat-reactions')
await mkdir(output, { recursive: true })

const env = await readFile(resolve(root, 'apps/web/.env.local'), 'utf8')
const backend = env.match(/^VITE_SUPABASE_URL=(.*)$/m)?.[1]?.trim()
assert.ok(backend, 'Public backend URL needed to intercept client')
const storageKey = `sb-${new URL(backend).hostname.split('.')[0]}-auth-token`

const users = {
  alice: '10000000-0000-4000-8000-000000000001',
  bob: '20000000-0000-4000-8000-000000000002'
}
const space = '70000000-0000-4000-8000-000000000007'
const channel = '80000000-0000-4000-8000-000000000008'

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

for (const [name, id] of Object.entries(users)) {
  await db.query('insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())', [id, `${name}@example.invalid`])
  await db.query('update public.profiles set display_name=$1 where id=$2', [name === 'alice' ? 'Alice' : 'Bob', id])
}

await db.exec(`update realm_private.accounts set state='active';update realm_private.settings set value='true' where key='administration';
insert into public.friendships(requester,addressee,status) values('${users.alice}','${users.bob}','accepted');
begin;insert into public.spaces(id,name) values('${space}','Alpha Testing Grounds');
insert into public.space_members(space_id,user_id,role) values('${space}','${users.alice}','owner'),('${space}','${users.bob}','member');
insert into public.channels(id,space_id,name) values('${channel}','${space}','general');commit;`)

let queue = Promise.resolve(), pageErrors = []
function serialized(task) { const next = queue.then(task); queue = next.catch(() => {}); return next }
async function asUser(id, task) {
  return serialized(async () => {
    await db.exec('begin;set local role authenticated')
    await db.query("select set_config('request.jwt.claim.sub',$1,true)", [id])
    try { const res = await task(); await db.exec('commit'); return res } catch (e) { await db.exec('rollback'); throw e }
  })
}

const sqlRpc = (name, args) => {
  return db.query(`select public."${name}"(${Object.keys(args).map((k, i) => `"${k}"=>$${i+1}`).join(',')}) as result`, Object.values(args)).then(r => r.rows[0].result)
}

await asUser(users.bob, () => sqlRpc('message_send', { p_kind: 'channel', p_stream: channel, p_body: 'Testing reaction and emoji navigation in chat.', p_client: crypto.randomUUID() }))

const browser = await chromium.launch({ channel: process.env.REALM_BROWSER_CHANNEL ?? 'chrome', headless: true, args: ['--disable-features=LocalNetworkAccessChecks'] })

async function fixture() {
  const user = { id: users.alice, email: 'alice@example.invalid', email_confirmed_at: new Date().toISOString(), aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {} }
  const b64 = v => Buffer.from(JSON.stringify(v)).toString('base64url')
  const token = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600, role: 'authenticated' })}.fixture`
  const session = { access_token: token, refresh_token: 'fixture', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: 'bearer', user }
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  await context.addInitScript(({ key, session }) => localStorage.setItem(key, JSON.stringify(session)), { key: storageKey, session })
  await context.routeWebSocket('**/realtime/v1/**', ws => ws.close())
  await context.route('**/*', async route => {
    const req = route.request(), url = new URL(req.url())
    if (url.origin === origin) return route.continue()
    if (url.origin !== new URL(backend).origin) return route.abort()
    const reply = (v, s = 200) => route.fulfill({ status: s, contentType: 'application/json', body: JSON.stringify(v), headers: { 'Access-Control-Allow-Origin': origin } })
    if (req.method() === 'OPTIONS') return reply({})
    if (url.pathname.startsWith('/auth/v1/')) return reply(url.pathname.endsWith('/user') ? user : session)
    try {
      if (url.pathname.includes('/rpc/')) {
        const name = url.pathname.split('/').pop(), args = req.postDataJSON() ?? {}
        return reply(await asUser(user.id, () => sqlRpc(name, args)))
      }
      const table = url.pathname.split('/').pop()
      const values = [], filters = []
      for (const [col, val] of url.searchParams) {
        if (val.startsWith('eq.')) { values.push(val.slice(3)); filters.push(`"${col}"=$${values.length}`) }
      }
      const rows = await asUser(user.id, () => db.query(`select * from public."${table}"${filters.length ? ' where ' + filters.join(' and ') : ''}`, values).then(r => r.rows))
      return reply(req.headers().accept?.includes('vnd.pgrst.object') ? rows[0] : rows)
    } catch (e) {
      return reply({ code: e.code ?? 'fixture', message: e.message }, 400)
    }
  })
  const page = await context.newPage()
  page.setDefaultTimeout(15000)
  page.on('pageerror', e => pageErrors.push(e.message))
  return page
}

const checks = []
try {
  const page = await fixture()
  await page.goto(origin)
  await page.locator('[data-message]').first().waitFor()

  // 1. Check Message More actions popover keyboard navigation into quick reactions
  const firstMsg = page.locator('[data-message]').first()
  const actionsTrigger = firstMsg.getByRole('button', { name: /Actions for message by/ })
  await actionsTrigger.focus()
  await page.keyboard.press('Enter')
  const menu = page.getByRole('menu', { name: 'Message actions', exact: true })
  await menu.waitFor()

  // Initially focuses "Add Reaction"
  assert.equal(await page.getByRole('menuitem', { name: 'Add Reaction', exact: true }).evaluate(el => el === document.activeElement), true, 'Add Reaction initially focused')

  // ArrowUp moves into quick reactions row
  await page.keyboard.press('ArrowUp')
  const quickEmoji = page.locator('.menu-emoji-btn').first()
  assert.equal(await quickEmoji.evaluate(el => el === document.activeElement), true, 'ArrowUp enters quick reactions emoji row')

  // ArrowRight moves to next emoji
  await page.keyboard.press('ArrowRight')
  const secondEmoji = page.locator('.menu-emoji-btn').nth(1)
  assert.equal(await secondEmoji.evaluate(el => el === document.activeElement), true, 'ArrowRight moves between quick reaction emojis')

  // ArrowDown returns to Add Reaction
  await page.keyboard.press('ArrowDown')
  assert.equal(await page.getByRole('menuitem', { name: 'Add Reaction', exact: true }).evaluate(el => el === document.activeElement), true, 'ArrowDown returns to Add Reaction')

  // Press Enter to open Add Reaction dialog
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog', { name: 'Add Reaction' })
  await dialog.waitFor()
  checks.push('message actions keyboard navigation into quick reaction emojis')

  // 2. Emoji search input and 2D grid arrow navigation
  const searchInput = page.locator('.emoji-search-box input')
  assert.equal(await searchInput.evaluate(el => el === document.activeElement), true, 'Search input takes initial focus')

  // ArrowDown enters quick reactions or emoji catalog
  await page.keyboard.press('ArrowDown')
  const firstSlotOrGrid = page.locator('.quick-reaction-slot-btn, .emoji-grid-btn').first()
  assert.equal(await firstSlotOrGrid.evaluate(el => el === document.activeElement), true, 'ArrowDown moves into emoji navigation')

  // Search for specific emoji and select via Enter
  await searchInput.focus()
  await searchInput.fill('fire')
  await page.keyboard.press('Enter')
  await dialog.waitFor({ state: 'detached' })

  // Verify reaction pill is visible
  const reactionPill = firstMsg.locator('.message-reaction-pill').filter({ hasText: '🔥' })
  await reactionPill.waitFor()
  assert.equal(await reactionPill.locator('.reaction-count').innerText(), '1', 'Reaction pill rendered with count 1')
  checks.push('emoji search Enter selects and reacts')

  // 3. Composer Emoji Button
  const composerEmojiBtn = page.getByRole('button', { name: 'Add emoji', exact: true })
  await composerEmojiBtn.click()
  const composerDialog = page.getByRole('dialog', { name: 'Insert Emoji' })
  await composerDialog.waitFor()

  const composerSearch = page.locator('.emoji-search-box input')
  await composerSearch.fill('rocket')
  await page.keyboard.press('Enter')
  await composerDialog.waitFor({ state: 'detached' })

  const composerInput = page.locator('#stream-body')
  assert.ok((await composerInput.inputValue()).includes('🚀'), 'Composer body contains inserted emoji')
  checks.push('composer emoji picker inserts emoji into draft')

  assert.deepEqual(pageErrors, [])
  console.log('PASS', JSON.stringify({ checks }))
} catch (err) {
  console.error(err)
  process.exitCode = 1
} finally {
  await browser.close()
  await db.close()
}

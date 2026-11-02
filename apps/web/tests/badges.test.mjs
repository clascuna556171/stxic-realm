import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {
  BADGE_CATALOG,
  BADGE_CATEGORY_NAMES,
  BADGE_RARITY_COLORS,
  getUserBadgeState,
  toggleBadgePin,
  trackHallmarkMilestone,
  syncBadgesToServer,
} from '../src/badges.ts'

// Mock localStorage for node environment
const storage = new Map()
globalThis.localStorage = {
  getItem: key => storage.get(key) ?? null,
  setItem: (key, val) => storage.set(key, String(val)),
  removeItem: key => storage.delete(key),
  clear: () => storage.clear(),
}

test('badge catalog contains all 32 authentic badges with valid icons', () => {
  const badgeKeys = Object.keys(BADGE_CATALOG)
  assert.equal(badgeKeys.length, 32, 'Must have exactly 32 hallmarks')

  for (const [id, badge] of Object.entries(BADGE_CATALOG)) {
    assert.equal(badge.id, id)
    assert.ok(badge.name, `Badge ${id} missing name`)
    assert.ok(badge.subtitle, `Badge ${id} missing subtitle`)
    assert.ok(badge.description, `Badge ${id} missing description`)
    assert.ok(badge.category in BADGE_CATEGORY_NAMES, `Invalid category for ${id}`)
    assert.ok(badge.rarity in BADGE_RARITY_COLORS, `Invalid rarity for ${id}`)

    const iconUrl = new URL(`../public${badge.icon}`, import.meta.url)
    assert.ok(fs.existsSync(iconUrl), `Icon file missing for ${id}: ${badge.icon}`)
  }
})

test('founder accounts receive all 32 badges out of the box', () => {
  storage.clear()
  const founderState = getUserBadgeState('owner-user-1', [], true)
  assert.equal(Object.keys(founderState.unlocked).length, 32, 'Founder receives all 32 badges')
  assert.ok(founderState.unlocked['realm-creator'], 'Founder must have realm-creator')
  assert.ok(founderState.unlocked['early-pioneer'], 'Founder must have early-pioneer')
  assert.ok(founderState.featured.includes('realm-creator'), 'realm-creator must be featured')
})

test('team member accounts receive team badges but NEVER Realm Creator', () => {
  storage.clear()
  const teamState = getUserBadgeState('team-member-1', ['admin', 'developer'], false)
  assert.equal(teamState.unlocked['realm-creator'], undefined, 'Team members must NOT receive realm-creator')
  assert.ok(teamState.unlocked['early-pioneer'], 'Team members receive early-pioneer')
  assert.ok(teamState.unlocked['code-contributor'], 'Team members receive code-contributor')
  assert.ok(teamState.unlocked['design-contributor'], 'Team members receive design-contributor')
  assert.ok(teamState.unlocked['guardian'], 'Team members receive guardian')
  assert.ok(teamState.unlocked['contributor'], 'Team members receive contributor')
})

test('pinning badges supports up to 5 featured badges with toggle behavior', () => {
  storage.clear()
  const userId = 'pin-test-user'
  // Create user with founder badges
  getUserBadgeState(userId, [], true)

  const unpinned = toggleBadgePin(userId, 'realm-creator', true)
  assert.ok(!unpinned.featured.includes('realm-creator'), 'Should unpin badge')

  const repinned = toggleBadgePin(userId, 'realm-creator', true)
  assert.ok(repinned.featured.includes('realm-creator'), 'Should repin badge')

  // Non-founder must never be allowed to pin realm-creator
  const nonFounderUnpinned = toggleBadgePin('non-founder-user', 'realm-creator', false)
  assert.ok(!nonFounderUnpinned.featured.includes('realm-creator'), 'Non-founder can never pin realm-creator')
})

test('purges dirty localStorage unearned founder badges for non-founders', () => {
  storage.clear()
  const dirtyUserId = 'dirty-client-user'
  storage.set('stxic-realm:badges:v1:' + dirtyUserId, JSON.stringify({
    unlocked: {
      'realm-creator': { unlockedAt: '2026-01-01T00:00:00Z', grantedBy: 'Founder Sovereign Access' },
      'bug-hunter': { unlockedAt: '2026-01-01T00:00:00Z', grantedBy: 'Founder Sovereign Access' },
      'community-member': { unlockedAt: '2026-01-01T00:00:00Z' }
    },
    featured: ['realm-creator', 'bug-hunter']
  }))

  const cleaned = getUserBadgeState(dirtyUserId, [], false)
  assert.equal(cleaned.unlocked['realm-creator'], undefined, 'realm-creator must be purged')
  assert.equal(cleaned.unlocked['bug-hunter'], undefined, 'unearned bug-hunter must be purged')
  assert.ok(cleaned.unlocked['community-member'], 'earned community-member must be preserved')
  assert.ok(!cleaned.featured.includes('realm-creator'), 'realm-creator must be unfeatured')
})

test('milestone tracking unlocks badges upon reaching required conditions', () => {
  storage.clear()
  const userId = 'milestone-test-user'
  getUserBadgeState(userId, [], false)

  // Track room visit
  trackHallmarkMilestone(userId, 'room_visit', 'room-a')
  trackHallmarkMilestone(userId, 'room_visit', 'room-b')
  trackHallmarkMilestone(userId, 'room_visit', 'room-c')

  const stateAfterVisits = getUserBadgeState(userId, [], false)
  assert.ok(stateAfterVisits.unlocked['realm-explorer'], 'Must unlock realm-explorer after 3 room visits')
})

test('email and display-role hints cannot establish founder authority', () => {
  storage.clear()
  for(const email of ['founder@stxic.realm','clascuna556171@gmail.com','attacker-clascuna@sample.com']) {
    const state=getUserBadgeState('untrusted-uuid',[],false,false,null,email)
    assert.equal(state.unlocked['realm-creator'],undefined)
  }
})

test('server badge snapshots replace forged storage and preserve explicit empty pins', () => {
  const id='server-resident'
  localStorage.setItem('stxic-realm:badges:v1:'+id, JSON.stringify({unlocked:{guardian:{unlockedAt:'old'}},featured:['guardian']}))
  assert.deepEqual(getUserBadgeState(id,['admin'],true,true,{unlocked:{},featured:[]}),{unlocked:{},featured:[]})
  const server={unlocked:{'event-champion':{unlockedAt:'2026-11-02'}},featured:[]}
  assert.deepEqual(getUserBadgeState(id,[],false,false,server),server)
})


test('badge sync sends pins only, uses server result and propagates RPC errors', async () => {
 const state={unlocked:{guardian:{unlockedAt:'forged'}},featured:['guardian']}
 const server={unlocked:{guardian:{unlockedAt:'trusted'}},featured:['guardian']}
 assert.equal(await syncBadgesToServer({rpc:async(name,args)=>{assert.equal(name,'save_user_badges');assert.deepEqual(args,{p_badge_state:{featured:['guardian']}});return {data:server,error:null}}},state),server)
 const error={message:'Only unlocked badges can be pinned.'}
 await assert.rejects(syncBadgesToServer({rpc:async()=>({data:null,error})},state),e=>e===error)
})

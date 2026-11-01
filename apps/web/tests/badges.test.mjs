import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  BADGE_CATALOG,
  BADGE_CATEGORY_NAMES,
  BADGE_RARITY_COLORS,
  getUserBadgeState,
  toggleBadgePin,
  trackHallmarkMilestone,
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

  const publicDir = path.resolve('D:/Tech/Projects/stxic-realm/apps/web/public')

  for (const [id, badge] of Object.entries(BADGE_CATALOG)) {
    assert.equal(badge.id, id)
    assert.ok(badge.name, `Badge ${id} missing name`)
    assert.ok(badge.subtitle, `Badge ${id} missing subtitle`)
    assert.ok(badge.description, `Badge ${id} missing description`)
    assert.ok(badge.category in BADGE_CATEGORY_NAMES, `Invalid category for ${id}`)
    assert.ok(badge.rarity in BADGE_RARITY_COLORS, `Invalid rarity for ${id}`)

    const iconPath = path.join(publicDir, badge.icon)
    assert.ok(fs.existsSync(iconPath), `Icon file missing for ${id}: ${iconPath}`)
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

  const unpinned = toggleBadgePin(userId, 'realm-creator')
  assert.ok(!unpinned.featured.includes('realm-creator'), 'Should unpin badge')

  const repinned = toggleBadgePin(userId, 'realm-creator')
  assert.ok(repinned.featured.includes('realm-creator'), 'Should repin badge')
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

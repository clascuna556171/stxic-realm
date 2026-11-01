import test from 'node:test'
import assert from 'node:assert/strict'
import {
  generateRoomEmblem,
  STAMP_BADGES,
  STAMP_INKS,
} from '../src/world/passport.ts'

test('stamp badges catalog has eight distinct original emblems', () => {
  const badgeKeys = Object.keys(STAMP_BADGES)
  assert.equal(badgeKeys.length, 8)
  for (const [key, badge] of Object.entries(STAMP_BADGES)) {
    assert.ok(badge.name)
    assert.ok(badge.description)
  }
})

test('stamp inks catalog has five distinct themes with contrast backgrounds', () => {
  const inkKeys = Object.keys(STAMP_INKS)
  assert.equal(inkKeys.length, 5)
  for (const [key, ink] of Object.entries(STAMP_INKS)) {
    assert.ok(ink.hex.startsWith('#'))
    assert.ok(ink.bg.startsWith('#'))
  }
})

test('generateRoomEmblem deterministically hashes room identifiers', () => {
  const e1 = generateRoomEmblem('room-12345', 'tech')
  const e2 = generateRoomEmblem('room-12345', 'tech')
  assert.deepEqual(e1, e2, 'same room id produces identical emblem')

  const e3 = generateRoomEmblem('room-different-999', 'nature')
  assert.ok(e3.badge in STAMP_BADGES)
  assert.ok(e3.ink in STAMP_INKS)
})

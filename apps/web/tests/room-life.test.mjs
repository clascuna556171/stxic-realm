import test from 'node:test'
import assert from 'node:assert/strict'
import { defaults } from '../src/appearance.ts'
import { OBJECTS } from '../src/world/room.ts'
import { roomAmbientPixels, roomDustMotes, lightPulse, characterBlinkPixels } from '../src/world/room-life.ts'

test('room ambient life produces bounded hex pixels and evolves across ticks for every mood', () => {
 for (const mood of ['cozy', 'medieval', 'tech']) {
  const frame0 = roomAmbientPixels(mood, OBJECTS, 0)
  const frame1 = roomAmbientPixels(mood, OBJECTS, 1)
  const frame2 = roomAmbientPixels(mood, OBJECTS, 2)
  assert.ok(frame0.length > 40, `${mood} has living ambient details`)
  assert.notDeepEqual(frame0, frame1, `${mood} animates from tick 0 to tick 1`)
  assert.notDeepEqual(frame1, frame2, `${mood} animates from tick 1 to tick 2`)
  for (const p of [...frame0, ...frame1, ...frame2]) {
   assert.ok(Number.isInteger(p.x) && Number.isInteger(p.y) && p.w > 0 && p.h > 0)
   assert.ok(p.x >= 0 && p.y >= 0 && p.x + p.w <= 512 && p.y + p.h <= 384, JSON.stringify(p))
   assert.match(p.color, /^#[0-9a-f]{6}$/i)
  }
 }
})

test('disabling light sources suppresses their active flame and screen animations', () => {
 const allOn = roomAmbientPixels('cozy', OBJECTS, 1, {})
 const allOff = roomAmbientPixels('cozy', OBJECTS, 1, {
  lantern: false,
  'floor-lamp': false,
  desk: false,
  console: false,
  bookshelf: false,
 })
 assert.ok(allOn.length > allOff.length)
 const motesOn = roomDustMotes('cozy', OBJECTS, 2, {})
 const motesOff = roomDustMotes('cozy', OBJECTS, 2, {
  lantern: false,
  'floor-lamp': false,
  bookshelf: false,
 })
 assert.ok(motesOn.length > motesOff.length)
})

test('light pulse and character blink stay bounded', () => {
 const p0 = lightPulse(0, 0)
 const p1 = lightPulse(0, 0.7)
 assert.notDeepEqual(p0, p1)
 assert.ok(p1.scale > 0.9 && p1.scale < 1.1)
 assert.ok(p1.alphaMultiplier > 0.8 && p1.alphaMultiplier < 1.2)
 assert.equal(characterBlinkPixels(defaults, 'up', 0).length, 0)
 assert.equal(characterBlinkPixels(defaults, 'down', 1).length, 0)
 assert.ok(characterBlinkPixels(defaults, 'down', 11).length > 0)
 assert.ok(characterBlinkPixels(defaults, 'left', 22).length > 0)
})

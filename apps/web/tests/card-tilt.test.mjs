import test from 'node:test'
import assert from 'node:assert/strict'
import {tiltFromPointer, RESTING_TILT} from '../src/card-tilt.ts'

const card = {left: 100, top: 50, width: 400, height: 400}

test('pointer at the card center rests flat', () => {
 assert.deepEqual(tiltFromPointer(card, 300, 250), {nx: 0, ny: 0, gx: 50, gy: 50})
})

test('corners reach full tilt and glare follows the pointer', () => {
 assert.deepEqual(tiltFromPointer(card, 100, 50), {nx: -1, ny: -1, gx: 0, gy: 0})
 assert.deepEqual(tiltFromPointer(card, 500, 450), {nx: 1, ny: 1, gx: 100, gy: 100})
})

test('pointers outside the card are clamped', () => {
 assert.deepEqual(tiltFromPointer(card, -900, 9000), {nx: -1, ny: 1, gx: 0, gy: 100})
})

test('tall profile cards tilt less vertically', () => {
 const tall = {left: 0, top: 0, width: 400, height: 1040}
 const tilt = tiltFromPointer(tall, 400, 1040)
 assert.equal(tilt.nx, 1)
 assert.equal(tilt.ny, .5)
})

test('unmeasured or invalid input returns the resting state', () => {
 assert.equal(tiltFromPointer({left: 0, top: 0, width: 0, height: 0}, 5, 5), RESTING_TILT)
 assert.equal(tiltFromPointer(card, Number.NaN, 5), RESTING_TILT)
})

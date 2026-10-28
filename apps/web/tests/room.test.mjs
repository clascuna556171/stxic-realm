import test from 'node:test'
import assert from 'node:assert/strict'
import { ROOM, OBJECTS, canOccupy, move } from '../src/world/room.ts'
test('spawn is walkable and movement stays within room bounds', () => {
  assert.equal(canOccupy(ROOM.spawn), true)
  assert.deepEqual(move({x:1,y:5}, 'left'), {x:1,y:5})
  assert.deepEqual(move({x:14,y:5}, 'right'), {x:14,y:5})
  assert.deepEqual(move({x:8,y:1}, 'up'), {x:8,y:1})
  assert.deepEqual(move({x:8,y:10}, 'down'), {x:8,y:10})
})
test('furniture footprints block movement and open tiles remain walkable', () => {
  for (const item of OBJECTS) assert.equal(canOccupy({x:item.x,y:item.y}), false, item.name)
  assert.deepEqual(move({x:5,y:2}, 'left'), {x:5,y:2})
  assert.deepEqual(move({x:8,y:9}, 'up'), {x:8,y:8})
  assert.equal(canOccupy({x:1.5,y:1}), false)
})

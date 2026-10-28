import test from 'node:test'
import assert from 'node:assert/strict'
import { starterLayout, validateLayout, placeObject, parseLayout } from '../src/world/layout.ts'
import { OBJECTS } from '../src/world/room.ts'
test('furniture placement rejects overlap, walls, spawn, and non-integer positions', () => {
  const layout=starterLayout(), plant=OBJECTS.find(o=>o.id==='plant')
  for(const [x,y] of [[2,2],[0,4],[8,9],[1.5,3]]) {
    const result=placeObject(layout,plant,x,y); assert.ok(result.error, `${x},${y}`); assert.equal(result.layout,layout)
  }
  assert.equal(placeObject(layout,plant,8,5).error,null)
})
test('stored layouts must use known assets, unique identities and a supported version', () => {
  const layout=starterLayout(); assert.deepEqual(parseLayout(JSON.stringify(layout)),layout)
  assert.equal(parseLayout('{'),null)
  assert.equal(validateLayout({...layout,schemaVersion:2}) !== null,true)
  assert.equal(validateLayout({...layout,objects:[layout.objects[0],layout.objects[0]]}) !== null,true)
  assert.equal(validateLayout({...layout,objects:[{...layout.objects[0],width:1}]}) !== null,true)
})

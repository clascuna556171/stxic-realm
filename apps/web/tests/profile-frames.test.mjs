import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile, readdir} from 'node:fs/promises'
import {frameCatalog, frameShapes, frameSelection, frameShape, validateFrameCatalog} from '../src/profile-frames.ts'

test('six available collections have eighteen independent original SVGs', async () => {
 assert.equal(frameCatalog.length, 6)
 assert.equal(validateFrameCatalog(), true)
 const files = await readdir(new URL('../public/profile-frames/', import.meta.url))
 assert.equal(files.filter(file => file.endsWith('.svg')).length, 18)
 const artwork = new Set()
 for (const collection of frameCatalog) {
  assert.equal(collection.available, true)
  for (const shape of frameShapes) {
   const source = await readFile(new URL(`../public${collection.assets[shape]}`, import.meta.url), 'utf8')
   assert.match(source, /viewBox="0 0 256 256"/)
   assert.doesNotMatch(source, /<image|<script|onload=|href="https?:/)
   artwork.add(source)
  }
 }
 assert.equal(artwork.size, 18)
})
test('selection safely normalizes legacy shapes and retired or malformed frames', () => {
 assert.deepEqual(frameSelection(), {frameId:'none', frameShape:'circle', showEffects:false})
 assert.deepEqual(frameSelection({frame_id:'nature-spirit', avatar_shape:'rounded', frame_effects:true}), {frameId:'nature-spirit', frameShape:'rounded-square', showEffects:true})
 assert.deepEqual(frameSelection({frame_id:'retired', avatar_shape:'invalid', frame_effects:'true'}), {frameId:'none', frameShape:'circle', showEffects:false})
 assert.equal(frameShape('square'), 'square')
 assert.equal(frameShape('rounded-square'), 'rounded-square')
})
test('catalog rejects duplicate IDs, missing shapes, bad colors and shared artwork', () => {
 const clone = () => structuredClone(frameCatalog)
 const duplicate = clone(); duplicate[1].id = duplicate[0].id
 const missing = clone(); delete missing[0].assets.square
 const shared = clone(); shared[1].assets.square = shared[0].assets.square
 const color = clone(); color[0].palette[0] = 'url(evil)'
 for (const catalog of [duplicate, missing, shared, color]) assert.throws(() => validateFrameCatalog(catalog))
})

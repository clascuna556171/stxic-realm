import test from 'node:test'
import assert from 'node:assert/strict'
import { defaults, accessories, hairStyles, outfits, skins, hairs } from '../src/appearance.ts'
import { CHARACTER_HEIGHT, CHARACTER_WIDTH, characterPixels } from '../src/character.ts'

test('all character combinations have valid, bounded pixel art', () => {
 for (const hairStyle of hairStyles) for (const accessory of accessories) for (const outfit of Object.keys(outfits)) for (const skin of skins) for (const hair of hairs) {
  const pixels=characterPixels({ ...defaults, hairStyle, accessory, outfit, skin, hair })
  assert.ok(pixels.length > 30)
  for (const {x,y,w,h,color} of pixels) {
   assert.ok(x >= 0 && y >= 0 && x+w <= CHARACTER_WIDTH && y+h <= CHARACTER_HEIGHT)
   assert.ok(w > 0 && h > 0 && /^#[0-9a-f]{6}$/i.test(color))
  }
 }
})

test('hair, outfit and accessory selections change the character art', () => {
 const base=JSON.stringify(characterPixels(defaults))
 for (const option of [{hairStyle:'long'},{hairStyle:'curly'},{hairStyle:'swept'},{outfit:'medieval'},{outfit:'tech'},{accessory:'glasses'},{accessory:'headphones'},{accessory:'crown'}]) {
  assert.notEqual(JSON.stringify(characterPixels({...defaults,...option})),base)
 }
})

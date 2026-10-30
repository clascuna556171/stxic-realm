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

test('four directional views and walking frames preserve bounded customized art',()=>{
 for(const hairStyle of hairStyles)for(const accessory of accessories)for(const outfit of Object.keys(outfits)){
  const appearance={...defaults,hairStyle,accessory,outfit},views=[]
  for(const direction of ['down','up','left','right']){
   const art=characterPixels(appearance,direction);views.push(JSON.stringify(art))
   for(const frame of [0,1,2])for(const b of characterPixels(appearance,direction,frame)){assert.ok(b.x>=0&&b.y>=0&&b.w>0&&b.h>0&&b.x+b.w<=48&&b.y+b.h<=64);assert.match(b.color,/^#[0-9a-f]{6}$/i)}
   assert.notEqual(JSON.stringify(characterPixels(appearance,direction,1)),JSON.stringify(characterPixels(appearance,direction,2)))
   for(const change of [{hair:'#123456'},{skin:'#987654'},{accessory:accessory==='none'?'glasses':'none'},{outfit:outfit==='tech'?'medieval':'tech'}])assert.notEqual(JSON.stringify(characterPixels({...appearance,...change},direction)),JSON.stringify(art))
  }
  assert.equal(new Set(views).size,4)
 }
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { defaults, accessories, hairStyles, outfits, skins, hairs, eyeColors } from '../src/appearance.ts'
import { CHARACTER_HEIGHT, CHARACTER_WIDTH, characterPixels, seatedCharacterPixels, restingCharacterPixels, idleCharacterPixels } from '../src/character.ts'

// Check the final visible pixels, including occlusion by hair and headgear.
function raster(art) {
 const pixels=Array(CHARACTER_WIDTH*CHARACTER_HEIGHT).fill(null)
 for(const p of art)for(let y=p.y;y<p.y+p.h;y++)for(let x=p.x;x<p.x+p.w;x++)pixels[y*CHARACTER_WIDTH+x]=p.color
 return pixels
}

test('selected hair, skin and eyes remain visible through every wardrobe/headgear combination',()=>{
 for(const hairStyle of hairStyles)for(const accessory of accessories)for(const outfit of Object.keys(outfits))for(const direction of ['down','up','left','right']){
  const a={...defaults,hairStyle,accessory,outfit,eyes:'blue'},visible=raster(characterPixels(a,direction))
  assert.ok(visible.includes(a.skin),`${hairStyle}/${accessory}/${outfit}/${direction}: selected skin is visible`)
  assert.ok(visible.includes(a.hair),`${hairStyle}/${accessory}/${outfit}/${direction}: selected hair is visible`)
  assert.equal(visible.includes(eyeColors.blue),direction!=='up','iris belongs to the face, never the back of the head')
  for(const alternative of hairStyles.filter(s=>s!==hairStyle))assert.notDeepEqual(raster(characterPixels({...a,hairStyle:alternative},direction)),visible,'hairstyles cannot be silently occluded or substituted')
 }
})

test('composited skull and equipment stay fixed during walking and breathing',()=>{
 for(const hairStyle of hairStyles)for(const accessory of accessories)for(const outfit of Object.keys(outfits))for(const direction of ['down','up','left','right']){
  const a={...defaults,hairStyle,accessory,outfit},head=art=>raster(art).slice(0,35*CHARACTER_WIDTH)
  assert.deepEqual(head(characterPixels(a,direction)),head(characterPixels(a,direction,1)))
  assert.deepEqual(head(characterPixels(a,direction,1)),head(characterPixels(a,direction,2)))
  assert.deepEqual(head(characterPixels(a,direction)),head(idleCharacterPixels(a,direction,3)))
 }
})

test('blink and resting close the visible irises without losing headgear',()=>{
 for(const accessory of accessories)for(const direction of ['down','left','right']){
  const a={...defaults,accessory,eyes:'blue'},normal=raster(characterPixels(a,direction)),blink=raster(idleCharacterPixels(a,direction,0)),rest=raster(restingCharacterPixels(a,direction))
  assert.ok(normal.includes(eyeColors.blue));assert.ok(!blink.includes(eyeColors.blue));assert.ok(!rest.includes(eyeColors.blue))
  assert.deepEqual(blink.slice(0,24*48),normal.slice(0,24*48),'closing eyes preserves crown/headset/hair')
 }
})

test('all character combinations have valid, bounded pixel art', () => {
 for (const hairStyle of hairStyles) for (const accessory of accessories) for (const outfit of Object.keys(outfits)) for (const skin of skins) for (const hair of hairs) for(const eyes of Object.keys(eyeColors)) {
  const a={ ...defaults, hairStyle, accessory, outfit, skin, hair, eyes }
  const pixels=['down','up','left','right'].flatMap(d=>[characterPixels(a,d),characterPixels(a,d,1),characterPixels(a,d,2),seatedCharacterPixels(a,d),restingCharacterPixels(a,d),idleCharacterPixels(a,d,0),idleCharacterPixels(a,d,3)]).flat()
  assert.ok(pixels.length > 30)
  for (const {x,y,w,h,color} of pixels) {
   assert.ok(x >= 0 && y >= 0 && x+w <= CHARACTER_WIDTH && y+h <= CHARACTER_HEIGHT)
   assert.ok([x,y,w,h].every(Number.isInteger))
   assert.ok(w > 0 && h > 0 && /^#[0-9a-f]{6}$/i.test(color))
  }
 }
})

test('walks keep the head and equipment fixed and retain a grounded support sole',()=>{
 for(const hairStyle of hairStyles)for(const accessory of accessories)for(const outfit of Object.keys(outfits))for(const direction of ['down','up','left','right']){
  const a={...defaults,hairStyle,accessory,outfit},saved=JSON.stringify(a)
  const head=art=>art.filter(p=>p.y<29)
  assert.deepEqual(head(characterPixels(a,direction,1)),head(characterPixels(a,direction,2)))
  for(const frame of [0,1,2])assert.ok(characterPixels(a,direction,frame).some(p=>p.y+p.h===63),'support sole stays on the original baseline')
  assert.notDeepEqual(restingCharacterPixels(a,direction),characterPixels(a,direction),'bed uses authored rest art')
  assert.equal(JSON.stringify(a),saved,'art does not mutate saved selections')
 }
})

test('idle breath keeps feet and head still; closed eyes preserve headgear',()=>{
 for(const accessory of accessories)for(const direction of ['down','up','left','right']){
  const a={...defaults,accessory},neutral=characterPixels(a,direction),breath=idleCharacterPixels(a,direction,3)
  const fixed=art=>art.filter(p=>p.y<29||p.y>=54)
  assert.deepEqual(fixed(neutral),fixed(breath))
  assert.deepEqual(idleCharacterPixels(a,direction,16),idleCharacterPixels(a,direction,0))
  if(direction!=='up')assert.notDeepEqual(idleCharacterPixels(a,direction,0),neutral)
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

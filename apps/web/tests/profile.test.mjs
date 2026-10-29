import test from 'node:test'
import assert from 'node:assert/strict'
import {inspectProfileImage,readImageBody} from '../../../supabase/functions/_shared/profile-images.ts'
import {moveSection,readableInk,profileContrast} from '../src/profile-model.ts'
test('image inspection detects format from bytes and rejects scripts, truncation, huge images and excessive payloads',async()=>{
 const gif=Uint8Array.from(Buffer.from('R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==','base64'))
 assert.deepEqual(inspectProfileImage(gif),{mime:'image/gif',width:1,height:1})
 const frame=gif.slice(gif.indexOf(0x2c),-1),animated=new Uint8Array([...gif.slice(0,-1),...frame,0x3b]);assert.equal(inspectProfileImage(animated).mime,'image/gif')
 const excessive=new Uint8Array([...gif.slice(0,gif.indexOf(0x2c)),...Array.from({length:101},()=>[...frame]).flat(),0x3b]);assert.throws(()=>inspectProfileImage(excessive))
 for(const data of [new TextEncoder().encode('<svg onload="alert(1)"></svg>'),gif.slice(0,-1),new Uint8Array(8388609)])assert.throws(()=>inspectProfileImage(data))
 const bomb=gif.slice();bomb[6]=255;bomb[7]=255;assert.throws(()=>inspectProfileImage(bomb))
 assert.deepEqual(await readImageBody(new Request('https://example.invalid',{method:'POST',body:gif})),gif)
 await assert.rejects(readImageBody(new Request('https://example.invalid',{method:'POST',body:new Uint8Array(8388609)})),e=>e.code==='PT413')
})
test('profile section order is bounded and custom colors get readable action text',()=>{
 const style={sections:['about','details','connections','photos','member']}
 assert.equal(moveSection(style,'about',-1),style)
 assert.deepEqual(moveSection(style,'photos',-1).sections,['about','details','photos','connections','member'])
 assert.equal(readableInk('#ffffff'),'#000000');assert.equal(readableInk('#000000'),'#ffffff');assert.ok(profileContrast('#202127','#ececf1')>10)
 for(const accent of ['#777777','#888888','#8291a2','#7eaa9a','#b1b8db','#16171c'])assert.ok(profileContrast(accent,readableInk(accent))>=4.5,accent)
})

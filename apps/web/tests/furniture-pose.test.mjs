import test from 'node:test'
import assert from 'node:assert/strict'
import {furniturePose} from '../src/world/furniture-pose.ts'
import {OBJECTS,canOccupy} from '../src/world/room.ts'
import {seatedCharacterPixels,characterPixels} from '../src/character.ts'
import {defaults} from '../src/appearance.ts'
import {furnitureActionForeground} from '../src/world/art.ts'

test('chair, cushion and pillow anchors use actual furniture position without changing the accepted floor tile',()=>{
 for(const [id,type,offset,direction] of [['desk','sit',{x:48,y:45},'up'],['sofa','sit',{x:23,y:46},'down'],['bed','rest',{x:44,y:51},'down']]){
  const object=OBJECTS.find(o=>o.id===id),position={x:object.x+object.width,y:object.y},before={...position}
  const pose=furniturePose(position,{type,target:id,label:id},OBJECTS)
  assert.equal(pose.x,object.x*32+offset.x);assert.equal(pose.y,object.y*32+offset.y);assert.equal(pose.direction,direction)
  assert.deepEqual(position,before);assert.ok(canOccupy(position))
  const moved={...object,id:'hall-instance',kind:id,x:5,y:9},next=furniturePose({x:5+moved.width,y:9},{type,target:moved.id,label:id},[moved])
  assert.equal(next.x,5*32+offset.x);assert.equal(next.y,9*32+offset.y)
 }
})
test('remote, removed or incompatible pose targets do not render inside furniture',()=>{
 assert.equal(furniturePose({x:8,y:9},{type:'sit',target:'desk',label:''},OBJECTS),null)
 assert.equal(furniturePose({x:5,y:3},{type:'rest',target:'desk',label:''},OBJECTS),null)
 assert.equal(furniturePose({x:5,y:3},{type:'sit',target:'missing',label:''},OBJECTS),null)
 assert.equal(furniturePose({x:5,y:3},null,OBJECTS),null)
})
test('seated artwork bends the legs and reuses clothing, hair and accessory colors',()=>{
 for(const direction of ['up','down'])for(const outfit of ['everyday','medieval','tech']){
  const appearance={...defaults,outfit,accessory:'headphones'},standing=characterPixels(appearance,direction),seated=seatedCharacterPixels(appearance,direction)
  assert.notDeepEqual(seated,standing)
  assert.deepEqual(seated.filter(p=>p.y<47),standing.filter(p=>p.y<47).map(p=>({...p,h:Math.min(p.h,49-p.y)})))
  for(const p of seated)assert.ok(p.x>=0&&p.y>=0&&p.w>0&&p.h>0&&p.x+p.w<=48&&p.y+p.h<=64)
 }
})
test('occlusion keeps the chair back in front and bedding over the lower body',()=>{
 const chair=furnitureActionForeground('desk','cozy',defaults.skin)
 assert.ok(chair.some(p=>p.y===26&&p.w===30));assert.ok(chair.some(p=>p.y===21&&p.color===defaults.skin))
 assert.ok(furnitureActionForeground('bed','cozy',defaults.skin).every(p=>p.y>=31))
 assert.ok(furnitureActionForeground('sofa','cozy',defaults.skin).every(p=>p.y>=43))
})

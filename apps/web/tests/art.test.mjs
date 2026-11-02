import test from 'node:test'
import assert from 'node:assert/strict'
import { composedRoomPixels, furniturePixels, roomTextilePixels } from '../src/world/art.ts'
import { OBJECTS, ROOM, canOccupy } from '../src/world/room.ts'
import { parseLayout } from '../src/world/layout.ts'
import { defaults, parseAppearance } from '../src/appearance.ts'
import { roomLighting } from '../src/world/lighting.ts'

test('floor textiles follow saved furniture, disappear with it and clip to the interior',()=>{
 const sofa=OBJECTS.find(o=>o.id==='sofa')
 for(const mood of ['cozy','medieval','tech']) {
  const initial=roomTextilePixels(mood,[sofa])
  assert.ok(initial.length)
  const moved=roomTextilePixels(mood,[{...sofa,x:sofa.x+1,y:sofa.y-1}])
  assert.deepEqual(moved,initial.map(p=>({...p,x:p.x+32,y:p.y-32})))
  assert.deepEqual(roomTextilePixels(mood,[]),[])
  for(const id of ['sofa','bed'])for(const [x,y] of [[1,1],[12,8]]) {
   for(const p of roomTextilePixels(mood,[{...OBJECTS.find(o=>o.id===id),x,y}])) {
    assert.ok(p.x>=32&&p.y>=56&&p.x+p.w<=480&&p.y+p.h<=348)
   }
  }
 }
})

test('room lighting follows moved furniture and removes its light when the source is removed', () => {
 const lantern = OBJECTS.find(o => o.id === 'lantern')
 const base = roomLighting('medieval', [])
 const initial = roomLighting('medieval', [lantern])
 const moved = roomLighting('medieval', [{ ...lantern, x: lantern.x + 2, y: lantern.y + 1 }])
 assert.equal(initial.length, base.length + 1)
 assert.equal(moved.at(-1).x - initial.at(-1).x, 64)
 assert.equal(moved.at(-1).y - initial.at(-1).y, 32)
 assert.deepEqual(roomLighting('medieval', []).slice(0, base.length), base)
 assert.notEqual(roomLighting('tech', [])[0].color, base[0].color)
})

test('new defaults use obsidian while explicit saved accent choices survive',()=>{
 assert.equal(defaults.accent,'obsidian')
 assert.equal(parseAppearance(null).accent,'obsidian')
 assert.equal(parseAppearance(JSON.stringify({...defaults,accent:'sage'})).accent,'sage')
})
test('all room moods and catalog pieces produce valid original artwork',()=>{
 for(const o of OBJECTS) assert.ok(furniturePixels(o.id).length>0,o.id)
 for(const mood of ['cozy','medieval','tech']) {
  const pixels=composedRoomPixels(mood,OBJECTS)
  assert.ok(pixels.length>500)
  for(const p of pixels){
   assert.ok(Number.isInteger(p.x)&&Number.isInteger(p.y)&&p.w>0&&p.h>0)
   assert.ok(p.x>=0&&p.y>=0&&p.x+p.w<=512&&p.y+p.h<=384,JSON.stringify(p))
   assert.match(p.color,/^#[0-9a-f]{6}$/i)
  }
 }
 assert.notDeepEqual(composedRoomPixels('cozy',OBJECTS),composedRoomPixels('tech',OBJECTS))
})
test('expanded starter room keeps every unoccupied tile reachable and old layouts valid',()=>{
 const old={schemaVersion:1,objects:OBJECTS.slice(0,7)}
 assert.deepEqual(parseLayout(JSON.stringify(old)),old)
 const queue=[ROOM.spawn],visited=new Set([`${ROOM.spawn.x},${ROOM.spawn.y}`])
 for(let i=0;i<queue.length;i++)for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){
  const p={x:queue[i].x+dx,y:queue[i].y+dy},key=`${p.x},${p.y}`
  if(canOccupy(p)&&!visited.has(key)){visited.add(key);queue.push(p)}
 }
 for(let y=1;y<ROOM.height-1;y++)for(let x=1;x<ROOM.width-1;x++)if(canOccupy({x,y}))assert.ok(visited.has(`${x},${y}`),`Unreachable tile ${x},${y}`)
})

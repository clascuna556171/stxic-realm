import test from 'node:test'
import assert from 'node:assert/strict'
import { composedRoomPixels, furniturePixels } from '../src/world/art.ts'
import { OBJECTS, ROOM, canOccupy } from '../src/world/room.ts'
import { parseLayout } from '../src/world/layout.ts'
import { defaults, parseAppearance } from '../src/appearance.ts'

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

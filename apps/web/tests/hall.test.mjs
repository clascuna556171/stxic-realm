import test from 'node:test'
import assert from 'node:assert/strict'
import { editHall, firstHallPosition, hallCatalog, hallPlacementError, hallStorageKey, parseHall, placeHallPiece, starterHall, travelHall } from '../src/world/hall-layout.ts'
import { hallArchitecture, hallComponentPixels, hallDoorPixels } from '../src/world/hall-art.ts'

test('all hall themes round trip and draw bounded architecture with independent door styles', () => {
 for (const theme of ['cozy', 'medieval', 'tech']) {
  const layout=starterHall(theme)
  assert.equal(hallPlacementError(layout), null)
  assert.deepEqual(parseHall(JSON.stringify(layout)), layout)
  const pixels=hallArchitecture(layout)
  assert.ok(pixels.length>1500)
  for(const p of pixels) {
   assert.ok(Number.isInteger(p.x)&&Number.isInteger(p.y)&&p.w>0&&p.h>0)
   assert.ok(p.x>=0&&p.y>=0&&p.x+p.w<=768&&p.y+p.h<=512,JSON.stringify(p))
   assert.match(p.color,/^#[0-9a-f]{6}$/i)
  }
  for(const item of hallCatalog)assert.ok(hallComponentPixels(item.kind,theme).length>10)
 }
 assert.notDeepEqual(hallArchitecture(starterHall('cozy')),hallArchitecture(starterHall('tech')))
 assert.notDeepEqual(hallDoorPixels('oak','cozy'),hallDoorPixels('portal','cozy'))
})
test('hall placement protects doors, aisle, bounds and existing components', () => {
 const layout=starterHall(),original=JSON.stringify(layout),piece=layout.pieces[0]
 for(const [x,y]of [[-1,7],[22,7],[10,9],[5,7],[20,7],[2,9],[2,6],[2,14],[NaN,9],[1.5,10]]) {
  const result=placeHallPiece(layout,{...piece,x,y})
  assert.ok(result.error,`${x},${y}`)
  assert.equal(result.layout,layout)
 }
 const next=placeHallPiece(layout,{...piece,x:7,y:7})
 assert.equal(next.error,null)
 assert.equal(JSON.stringify(layout),original)
 assert.deepEqual(next.layout.pieces[0],{...piece,x:7,y:7})
 const duplicate={...layout,pieces:[...layout.pieces,{...piece}]}
 assert.ok(hallPlacementError(duplicate))
 for(const item of hallCatalog) {
  const available=firstHallPosition(layout,item.kind)
  assert.ok(available,item.kind)
  assert.equal(placeHallPiece(layout,available).error,null)
 }
})
test('untrusted hall saves reject malformed versions, themes, doors, components and unsafe coordinates', () => {
 const layout=starterHall()
 for(const value of [null,{}, {...layout,version:2},{...layout,theme:'invented'},{...layout,doors:['oak']},{...layout,doors:['oak','script','stone']},{...layout,greenery:'yes'},{...layout,pieces:[null]},{...layout,pieces:[{id:'bad<script>',kind:'plant',x:2,y:7}]},{...layout,pieces:[{id:'x',kind:'unknown',x:2,y:7}]},{...layout,pieces:Array.from({length:33},(_,i)=>({id:String(i),kind:'plant',x:2,y:7}))}]) assert.equal(parseHall(JSON.stringify(value)),null)
 assert.equal(parseHall('broken-json'),null)
 assert.notEqual(hallStorageKey('alice'),hallStorageKey('bob'))
 assert.notEqual(hallStorageKey(),hallStorageKey('alice'))
})
test('hall history restores themes, components and architecture and preserves redo for invalid edits', () => {
 const layout=starterHall(),history={past:[],present:layout,future:[]}
 const next=editHall(history,{...layout,theme:'tech',rug:false,pieces:[]})
 const undone=travelHall(next,'undo')
 assert.deepEqual(undone.present,layout)
 assert.equal(travelHall(undone,'redo').present.theme,'tech')
 assert.equal(editHall(undone,{...layout,doors:['invalid']}),undone)
 assert.equal(editHall(undone,layout),undone)
 assert.equal(editHall(undone,{...layout,greenery:false}).future.length,0)
 let many=history
 for(let i=0;i<60;i++)many=editHall(many,{...many.present,rug:!many.present.rug})
 assert.equal(many.past.length,50)
})

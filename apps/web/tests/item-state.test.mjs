import test from 'node:test'
import assert from 'node:assert/strict'
import {itemActionLabel,plantMood,remainingSeconds,sortMemos} from '../src/world/item-state.ts'
import {OBJECTS} from '../src/world/room.ts'
import {hallCatalog} from '../src/world/hall-layout.ts'
import {roomLighting} from '../src/world/lighting.ts'
test('every unchanged home and hall catalog item has a dedicated action',()=>{
 assert.equal(OBJECTS.length,10);assert.equal(hallCatalog.length,10)
 for(const kind of [...OBJECTS.map(o=>o.id),...hallCatalog.map(o=>o.kind)])assert.notEqual(itemActionLabel(kind),'Interact')
})
test('light toggles remove only the selected source without changing catalog geometry',()=>{
 const initial=JSON.stringify(OBJECTS),all=roomLighting('cozy',OBJECTS),off=roomLighting('cozy',OBJECTS,{'floor-lamp':false})
 assert.equal(off.length,all.length-1);assert.equal(JSON.stringify(OBJECTS),initial)
 assert.equal(roomLighting('cozy',OBJECTS,{'floor-lamp':true}).length,all.length)
})
test('plant care and focus deadlines use elapsed wall time',()=>{
 assert.equal(plantMood(undefined,100),'Ready for water');assert.equal(plantMood(1,100),'Thriving');assert.equal(plantMood(1,86400001),'Time for a drink')
 assert.equal(remainingSeconds(null,100),0);assert.equal(remainingSeconds(1100,100),1);assert.equal(remainingSeconds(1101,100),2);assert.equal(remainingSeconds(100,2000),0)
})
test('pinned notes sort first and do not mutate their storage order',()=>{
 const notes=[{id:'a',pinned:false,updated_at:'2026-10-31T12:00:00Z'},{id:'b',pinned:true,updated_at:'2026-10-30T12:00:00Z'},{id:'c',pinned:false,updated_at:'2026-10-31T13:00:00Z'}]
 assert.deepEqual(sortMemos(notes).map(n=>n.id),['b','c','a']);assert.equal(notes[0].id,'a')
})

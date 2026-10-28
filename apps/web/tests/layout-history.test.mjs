import test from 'node:test'
import assert from 'node:assert/strict'
import {starterLayout,placeObject} from '../src/world/layout.ts'
import {createLayoutHistory,layoutHistoryReducer as reduce,HISTORY_LIMIT} from '../src/world/layout-history.ts'
const start=starterLayout(),plant=start.objects.find(o=>o.id==='plant')
const removed={...start,objects:start.objects.filter(o=>o.id!=='plant')}
test('undo/redo restores exact removals and moves without mutating snapshots',()=>{
 const moved=placeObject(start,plant,8,5).layout
 let history=reduce(reduce(createLayoutHistory(start),{type:'commit',layout:removed}),{type:'commit',layout:moved})
 history=reduce(history,{type:'undo'});assert.deepEqual(history.present,removed)
 history=reduce(history,{type:'undo'});assert.deepEqual(history.present,start)
 assert.equal(reduce(history,{type:'undo'}),history)
 history=reduce(reduce(history,{type:'redo'}),{type:'redo'});assert.deepEqual(history.present,moved)
 assert.equal(reduce(history,{type:'redo'}),history);assert.equal(plant.x,12)
})
test('invalid/no-op edits preserve redo while a new valid branch discards it',()=>{
 let history=reduce(reduce(createLayoutHistory(start),{type:'commit',layout:removed}),{type:'undo'})
 assert.equal(reduce(history,{type:'commit',layout:JSON.parse(JSON.stringify(start))}),history)
 assert.equal(reduce(history,{type:'commit',layout:{...start,schemaVersion:99}}),history)
 history=reduce(history,{type:'commit',layout:placeObject(start,plant,8,5).layout});assert.equal(history.future.length,0)
})
test('reload resets history, save preserves it, and history is bounded',()=>{
 let history=createLayoutHistory(start)
 for(let n=0;n<HISTORY_LIMIT+10;n++)history=reduce(history,{type:'commit',layout:n%2?start:removed})
 assert.equal(history.past.length,HISTORY_LIMIT)
 const saved=reduce(history,{type:'saved',layout:history.present});assert.equal(saved.past.length,HISTORY_LIMIT)
 const undo=reduce(saved,{type:'undo'});assert.notDeepEqual(undo.present,saved.present)
 const reset=reduce(undo,{type:'reset',layout:removed});assert.deepEqual(reset,createLayoutHistory(removed))
})

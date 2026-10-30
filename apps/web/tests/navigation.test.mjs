import test from 'node:test'
import assert from 'node:assert/strict'
import {findRoute,beside,createWalker,facingFrom} from '../src/world/navigation.ts'
import {canOccupy,ROOM,OBJECTS} from '../src/world/room.ts'
import {starterHall} from '../src/world/hall-layout.ts'
import {canWalkHall,hallDoorPoint,HALL_SPAWN,hallObjects} from '../src/world/hall-movement.ts'

test('routes go around footprints, use cardinal valid steps and arrive beside objects',()=>{
 for(const object of OBJECTS){const route=findRoute(ROOM.spawn,{object,id:object.id,label:object.name},canOccupy);assert.ok(route);let prev=ROOM.spawn;for(const point of route){assert.ok(canOccupy(point));assert.equal(Math.abs(point.x-prev.x)+Math.abs(point.y-prev.y),1);prev=point}assert.ok(beside(prev,object))}
 assert.equal(findRoute(ROOM.spawn,{point:{x:0,y:0}},canOccupy),null)
 assert.equal(findRoute(ROOM.spawn,{point:{x:2,y:2}},canOccupy),null)
 const wall=[{id:'wall',x:7,y:1,width:1,height:10}]
 assert.equal(findRoute(ROOM.spawn,{point:{x:2,y:5}},p=>canOccupy(p,wall)),null)
 assert.deepEqual(findRoute(ROOM.spawn,{point:ROOM.spawn},canOccupy),[])
})
test('every hall entrance and starter component can be approached without crossing furniture',()=>{
 const layout=starterHall(),valid=p=>canWalkHall(p,layout)
 for(let slot=0;slot<3;slot++)assert.ok(findRoute(HALL_SPAWN,{point:hallDoorPoint(slot)},valid))
 for(const object of hallObjects(layout))assert.ok(findRoute(HALL_SPAWN,{object,id:object.id,label:object.name},valid))
 assert.equal(valid({x:12,y:6}),false)
 assert.equal(facingFrom({x:2,y:3},{x:1,y:3}),'left');assert.equal(facingFrom({x:2,y:3},{x:2,y:2}),'up');assert.equal(facingFrom(ROOM.spawn,ROOM.spawn,'right'),'right')
})
const until=async predicate=>{for(let i=0;i<200&&!predicate();i++)await new Promise(r=>setTimeout(r,2));assert.ok(predicate(),'walker settled')}
test('replacement serializes an in-flight authoritative step and suppresses stale arrival',async()=>{
 let point={x:8,y:9},release,active=0,maxActive=0;const sent=[],states=[]
 const walker=createWalker({position:()=>point,walkable:canOccupy,interval:1,changed:s=>states.push(s),step:async next=>{active++;maxActive=Math.max(active,maxActive);sent.push(next);if(sent.length===1)await new Promise(r=>release=r);point=next;active--}})
 walker.go({point:{x:8,y:4},id:'old',label:'old destination'});await until(()=>!!release)
 walker.go({point:{x:9,y:9},id:'new',label:'new destination'});release()
 await until(()=>states.at(-1)?.arrived==='new');assert.deepEqual(point,{x:9,y:9});assert.equal(maxActive,1);assert.ok(!states.some(s=>s.arrived==='old'));walker.dispose()
})
test('cancel, rejected steps, blocked routes and disposal do not continue or claim arrival',async()=>{
 let point={x:8,y:9},release;const states=[],sent=[]
 const walker=createWalker({position:()=>point,walkable:canOccupy,interval:1,changed:s=>states.push(s),step:async next=>{sent.push(next);await new Promise(r=>release=r);point=next}})
 walker.go({point:{x:8,y:2},id:'old'});await until(()=>!!release);walker.cancel();release();await new Promise(r=>setTimeout(r,15));assert.equal(sent.length,1);assert.equal(states.at(-1).arrived,null)
 walker.go({point:{x:0,y:0}});await until(()=>!states.at(-1).moving);assert.match(states.at(-1).message,/cannot be reached/);walker.dispose()
 const denied=[];const rejecting=createWalker({position:()=>point,walkable:canOccupy,interval:1,changed:s=>denied.push(s),step:async()=>{throw new Error('Home access denied')}});rejecting.go({point:{x:8,y:2}});await until(()=>/denied/.test(denied.at(-1).message));assert.equal(denied.at(-1).arrived,null);rejecting.dispose()
})

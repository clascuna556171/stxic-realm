import test from 'node:test'
import assert from 'node:assert/strict'
import fireflies from '../src/world/vfx/fireflies.ts'
import embers from '../src/world/vfx/embers.ts'

test('free ambience renders bounded buffers and drains after stopping',()=>{
 for(const make of [fireflies,embers]){
  const options={area:{x:0,y:0,w:256,h:192},density:.3,grass:false,heat:false,seed:7}
  const a=make(options),b=make(options)
  const frame=()=>({w:128,h:96,ox:0,oy:0,color:new Uint32Array(128*96),light:new Uint32Array(128*96)})
  const left=frame(),right=frame()
  for(let i=0;i<240;i++){a.update(1/60);b.update(1/60)}
  a.draw(left,'front');b.draw(right,'front')
  assert.ok(left.color.some(p=>p!==0));assert.deepEqual(left,right)
  a.stop();for(let i=0;i<600;i++)a.update(1/60)
  assert.equal(a.done(),true)
 }
})

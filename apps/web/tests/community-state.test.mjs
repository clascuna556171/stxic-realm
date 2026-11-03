import test from 'node:test'
import assert from 'node:assert/strict'
import {focusSeconds,focusClock,intentLabel} from '../src/world/community-state.ts'
test('shared countdown uses server time with monotonic elapsed, clamps expiry and rounds seconds',()=>{
 const start='2026-11-04T00:00:00Z',end='2026-11-04T00:25:00Z'
 assert.equal(focusSeconds(end,start,0),1500)
 assert.equal(focusSeconds(end,start,60100),1440)
 assert.equal(focusSeconds(end,start,1600000),0)
 assert.equal(focusSeconds(end,start,-1000),1500)
 assert.equal(focusClock(1440),'24:00')
 assert.equal(focusClock(9),'0:09')
})
test('declared intent distinguishes no declaration from availability',()=>{
 assert.equal(intentLabel(null),'No intent shared')
 assert.equal(intentLabel('chat'),'Open to chat')
 assert.equal(intentLabel('focus'),'Focusing')
 assert.equal(intentLabel('group'),'Looking for a group')
})

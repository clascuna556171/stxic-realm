import test from 'node:test'
import assert from 'node:assert/strict'
import {SpeechLifecycle,speechText,wrapSpeech,bubbleFrame,typingPublisher,typingActive,latestPublisher,focusTransition,focusSeconds,initialFocus} from '../src/world/activity-state.ts'
import {synthesize,Soundscape} from '../src/world/soundscape.ts'

test('speech normalizes whitespace, limits Unicode codepoints and appends an ellipsis',()=>{
 assert.equal(speechText('  hello\n   world  '),'hello world')
 assert.equal(speechText('x'.repeat(120)),'x'.repeat(120))
 assert.equal(speechText('😀'.repeat(121)),'😀'.repeat(119)+'…')
 assert.equal(speechText(''), '')
})
test('speech expires after 4.5 seconds, replacement resets lifetime, repeated snapshots never replay it',()=>{
 const life=new SpeechLifecycle(),say=(id,body,time)=>({id,body,author_id:'alice',created_at:new Date(time).toISOString()})
 assert.equal(life.receive(say('one','first',1000),1000),true)
 assert.equal(life.bubbles.size,1);life.tick(5499);assert.equal(life.bubbles.size,1)
 life.receive(say('two','second',4000),4000);assert.equal(life.bubbles.size,1);assert.equal(life.bubbles.get('alice').text,'second')
 life.tick(8499);assert.equal(life.bubbles.size,1);life.tick(8500);assert.equal(life.bubbles.size,0)
 assert.equal(life.receive(say('two','second',4000),8501),false)
 assert.equal(life.receive(say('old','history',0),9000),false)
 assert.equal(life.receive({...say('bad','bad',1),created_at:'invalid'},9000),false)
 life.clear();assert.equal(life.bubbles.size,0)
})
test('speech animation floats five pixels and fades; reduced motion remains static until expiry',()=>{
 const bubble={started:0,expires:4500,id:'one',text:'hello'}
 assert.equal(bubbleFrame(bubble,0).opacity,0)
 assert.equal(bubbleFrame(bubble,1000).rise,5)
 assert.ok(bubbleFrame(bubble,4400).opacity<1)
 assert.deepEqual(bubbleFrame(bubble,4400,true),{visible:true,opacity:1,rise:0})
 assert.equal(bubbleFrame(bubble,4500,true).visible,false)
})
test('typing throttles bursts, expires five seconds after the last edit and stops on clear/send/dispose',()=>{
 let now=0,id=0;const timers=new Map(),events=[]
 const clock={now:()=>now,set:(fn,ms)=>{timers.set(++id,{fn,at:now+ms});return id},clear:id=>timers.delete(id)}
 const input=typingPublisher(active=>events.push({active,at:now}),clock)
 input.input('h');now=100;input.input('he');now=1400;input.input('hel');assert.equal(events.length,1)
 now=1600;input.input('hello');assert.equal(events.length,2);assert.equal(timers.size,1)
 now=6599;assert.ok([...timers.values()][0].at>now);now=6600;[...timers.values()][0].fn();assert.equal(events.at(-1).active,false)
 input.input('again');input.input('  ');assert.equal(events.at(-1).active,false);assert.equal(timers.size,0)
 input.input('send');input.stop();input.stop();assert.equal(events.at(-1).active,false);assert.equal(timers.size,0)
 assert.equal(typingActive(new Date(6000).toISOString(),6000),false)
})
test('focus starts for 25 minutes, pauses on leaving, resumes remaining time and completes by wall clock',()=>{
 let state=focusTransition(initialFocus,'start',1000,'desk')
 assert.equal(state.status,'running');assert.equal(state.deadline,1501000)
 state=focusTransition(state,'leave',61000);assert.equal(state.status,'paused');assert.equal(state.remaining,1440);assert.equal(state.target,null)
 state=focusTransition(state,'start',120000,'console');assert.equal(focusSeconds(state,180000),1380)
 state=focusTransition(state,'pause',180000);assert.equal(state.remaining,1380)
 state=focusTransition(state,'start',200000,'desk');state=focusTransition(state,'tick',1580000)
 assert.equal(state.status,'complete');assert.equal(state.deadline,null)
 assert.deepEqual(focusTransition(state,'reset',1600000),initialFocus)
 assert.deepEqual(focusTransition(initialFocus,'start',0),initialFocus)
})
test('each synthesized track has bounded samples and silent loop endpoints',()=>{
 for(const sound of ['rain','embers','crickets','lofi']){
  const data=synthesize(sound,8000)
  assert.equal(data.length,64000);assert.equal(Math.abs(data[0]),0);assert.equal(Math.abs(data.at(-1)),0)
  assert.ok(data.some(value=>Math.abs(value)>.01));assert.ok(data.every(value=>Number.isFinite(value)&&Math.abs(value)<1))
 }
})
test('sound engine creates tracks on explicit update, mixes/mutes and stops/disconnects every node on disposal',async()=>{
 const calls=[],nodes=[]
 class Node {gain={value:0,setTargetAtTime:value=>calls.push(['gain',value])};connect(){}disconnect(){this.disconnected=true}stop(){this.stopped=true}start(){calls.push(['start'])}}
 globalThis.AudioContext=class{currentTime=0;sampleRate=8000;destination={};createGain(){const n=new Node();nodes.push(n);return n}createBufferSource(){const n=new Node();nodes.push(n);return n}createBuffer(){return {copyToChannel(){}}}async resume(){calls.push(['resume'])}async close(){calls.push(['close'])}}
 try{
  const engine=new Soundscape();assert.equal(calls.length,0);await engine.resume()
  const mix=Object.fromEntries(['rain','embers','crickets','lofi'].map(id=>[id,{enabled:true,volume:.3}]))
  engine.update(mix,false);assert.equal(calls.filter(call=>call[0]==='start').length,4)
  engine.update(mix,true);assert.ok(calls.some(call=>call[0]==='gain'&&call[1]===0))
  engine.dispose();engine.dispose();assert.equal(calls.filter(call=>call[0]==='close').length,1)
  assert.ok(nodes.every(node=>node.disconnected));assert.equal(nodes.filter(node=>node.stopped).length,4)
 }finally{delete globalThis.AudioContext}
})

test('speech word wrapping measures wide glyphs and breaks long tokens within the available width',()=>{
 const measure=text=>Array.from(text).reduce((sum,char)=>sum+(char==='W'?11:char==='界'||char==='😀'?12:6),0)
 for(const text of ['W'.repeat(120),'界'.repeat(120),'😀'.repeat(120),'hello wide world '+ 'W'.repeat(25)]){
  const lines=wrapSpeech(text,144,measure)
  assert.ok(lines.every(line=>measure(line)<=144));assert.equal(lines.join('').replace(/ /g,''),text.replace(/ /g,''))
 }
})
test('slow responses coalesce obsolete typing/focus heartbeats and preserve the final clear',async()=>{
 for(const [running,clear] of [[true,false],[{target:'desk',deadline:1500000},null]]){
  const sent=[];let release
  const gate=new Promise(resolve=>{release=resolve})
  const publish=latestPublisher(async value=>{sent.push(value);if(sent.length===1)await gate})
  void publish(running);await Promise.resolve();void publish(running);void publish(running);const done=publish(clear)
  assert.deepEqual(sent,[running]);release();await done;assert.deepEqual(sent,[running,clear])
 }
})

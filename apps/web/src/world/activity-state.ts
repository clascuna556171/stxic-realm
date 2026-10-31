export const SPEECH_MS = 4500
export const TYPING_MS = 5000
export const TYPING_THROTTLE_MS = 1500
export type Speech = {id:string;author_id:string;body:string;created_at:string}
export type Activity = {user_id:string;typing_until:string|null;focus_target:string|null;focus_until:string|null}
export type WorldSnapshot = {messages:Speech[];activity:Activity[]}
export type WorldScope = {kind:'home'|'channel';id:string}
export type Bubble = {id:string;text:string;started:number;expires:number}
export function speechText(value:string){const chars=Array.from(value.replace(/\s+/gu,' ').trim());return chars.length>120?chars.slice(0,119).join('')+'…':chars.join('')}
export function wrapSpeech(text:string,width:number,measure:(text:string)=>number){
 const lines:string[]=[];let line=''
 for(const word of text.split(/\s+/u)){
  const candidate=line?`${line} ${word}`:word
  if(measure(candidate)<=width){line=candidate;continue}
  if(line){lines.push(line);line=''}
  for(const char of Array.from(word)){if(line&&measure(line+char)>width){lines.push(line);line=''}line+=char}
 }
 if(line)lines.push(line)
 return lines
}
export function bubbleFrame(bubble:Bubble,now:number,reduced=false){
 const age=now-bubble.started,remaining=bubble.expires-now
 return {visible:remaining>0,opacity:reduced?1:Math.max(0,Math.min(1,age/120,remaining/220)),rise:reduced?0:Math.min(5,Math.max(0,age/100))}
}
export class SpeechLifecycle {
 readonly bubbles=new Map<string,Bubble>()
 private seen=new Set<string>()
 receive(message:Speech,now:number,animate=true){
  if(this.seen.has(message.id))return false
  this.seen.add(message.id);if(this.seen.size>500)this.seen.delete(this.seen.values().next().value!)
  const age=now-Date.parse(message.created_at)
  if(!Number.isFinite(age)||age>=SPEECH_MS||age< -5000)return false
  this.bubbles.set(message.author_id,{id:message.id,text:speechText(message.body),started:animate?now:now-120,expires:now+SPEECH_MS});return true
 }
 tick(now:number){for(const [id,b] of this.bubbles)if(b.expires<=now)this.bubbles.delete(id)}
 clear(){this.bubbles.clear();this.seen.clear()}
}
export function typingActive(until:string|null,now:number){return until!==null&&Date.parse(until)>now}
/** Skip obsolete, unsent heartbeats after a slow response; always retain the latest clear. */
export function latestPublisher<T>(send:(value:T)=>Promise<unknown>,queue:{current:Promise<void>}={current:Promise.resolve()}){
 let generation=0
 return (value:T)=>{const ticket=++generation;queue.current=queue.current.then(async()=>{if(ticket===generation)await send(value)}).then(()=>{},()=>{});return queue.current}
}
type Clock={now:()=>number;set:(callback:()=>void,ms:number)=>ReturnType<typeof setTimeout>;clear:(id:ReturnType<typeof setTimeout>)=>void}
export function typingPublisher(publish:(active:boolean)=>void,clock:Clock={now:Date.now,set:(callback,ms)=>setTimeout(callback,ms),clear:id=>clearTimeout(id)}){
 let timer:ReturnType<typeof setTimeout>|undefined,last=-Infinity,active=false
 const stop=()=>{if(timer!==undefined)clock.clear(timer);timer=undefined;if(active)publish(false);active=false;last=-Infinity}
 return {input(value:string){if(!value.trim()){stop();return}const now=clock.now();if(!active||now-last>=TYPING_THROTTLE_MS){publish(true);last=now}active=true;if(timer!==undefined)clock.clear(timer);timer=clock.set(stop,TYPING_MS)},stop}
}
export type FocusState={status:'idle'|'running'|'paused'|'complete';remaining:number;deadline:number|null;target:string|null}
export const initialFocus:FocusState={status:'idle',remaining:1500,deadline:null,target:null}
export function focusSeconds(state:FocusState,now:number){return state.deadline===null?state.remaining:Math.max(0,Math.ceil((state.deadline-now)/1000))}
export function focusTransition(state:FocusState,event:'start'|'pause'|'reset'|'tick'|'leave',now:number,target?:string):FocusState{
 const remaining=focusSeconds(state,now)
 if(event==='reset')return {...initialFocus}
 if(state.status==='running'&&remaining===0)return {...state,status:'complete',remaining:0,deadline:null,target:null}
 if(event==='start'&&remaining>0&&target)return {status:'running',remaining,deadline:now+remaining*1000,target}
 if((event==='pause'||event==='leave')&&state.status==='running')return {status:'paused',remaining,deadline:null,target:null}
 return state
}

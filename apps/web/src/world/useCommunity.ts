import {useCallback,useEffect,useRef,useState} from 'react'
import {errorText} from '../account-repository'
import {client} from '../data'
import type {Point} from './room'
import type {CommunityState,SocialIntent} from './community-state'

type Visit = {x:number;y:number;visible:boolean;intent:SocialIntent|null}
// A hung transport must not keep a stale protected snapshot or block the request queue.
async function communityRpc<T>(name:string,args:Record<string,unknown>):Promise<T>{
 const abort=new AbortController(),timeout=setTimeout(()=>abort.abort(),12000)
 try{const {data,error}=await client!.rpc(name,args).abortSignal(abort.signal);if(error)throw error;return data as T}finally{clearTimeout(timeout)}
}
export function useCommunity(space:string,enabled:boolean){
 const [data,setData]=useState<CommunityState|null>(null),[error,setError]=useState(''),[visit,setVisit]=useState<Visit|null>(null),[busy,setBusy]=useState(false)
 const live=useRef(false),generation=useRef(0),queue=useRef<Promise<unknown>>(Promise.resolve()),token=useRef<string|null>(null),current=useRef<Visit|null>(null),readAt=useRef(0),lastInput=useRef(performance.now())
 const operation=useRef(0),working=useRef(false)
 const accept=useCallback((next:CommunityState,observedAt=performance.now())=>{readAt.current=observedAt;setData(next);setError('')},[])
 const enqueue=useCallback(<T,>(task:()=>Promise<T>)=>{const next=queue.current.then(task);queue.current=next.catch(()=>{});return next},[])
 const disconnect=useCallback(()=>{
  const old=token.current;token.current=null;current.current=null;setVisit(null);generation.current++
  if(old)void enqueue(()=>communityRpc('hall_presence',{p_space:space,p_token:old,p_action:'leave'})).catch(()=>{})
 },[space,enqueue])
 const refresh=useCallback(()=>enqueue(async()=>{
  const epoch=generation.current
  const started=performance.now()
  try{const next=await communityRpc<CommunityState>('community_state',{p_space:space,p_token:token.current});if(live.current&&epoch===generation.current&&!document.hidden)accept(next,started);return next}
  catch(e){if(live.current&&epoch===generation.current){setData(null);setError(errorText(e));disconnect()}throw e}
 }),[space,enqueue,accept,disconnect])
 useEffect(()=>{
  live.current=enabled;if(!enabled){operation.current++;working.current=false;setBusy(false);setData(null);disconnect();return}
  let polling=false
  const poll=async()=>{if(!live.current||document.hidden||polling)return;polling=true
   try{
    if(token.current){if(performance.now()-lastInput.current>300000){disconnect();setError('Your hall participation paused after five minutes idle. Rejoin when ready.')}else{
     const active=token.current,epoch=generation.current
     await enqueue(async()=>{if(token.current!==active)return;await communityRpc('hall_presence',{p_space:space,p_token:active,p_action:'heartbeat'});if(epoch!==generation.current)return})
    }}
    await refresh()
   }catch(e){if(live.current){setData(null);disconnect();setError(errorText(e))}}finally{polling=false}
  }
  const input=()=>{lastInput.current=performance.now()}
  const suspend=()=>{disconnect();setData(null);setError('Hall connection paused. Refresh to reconnect privately, or rejoin to participate.')}
  const visibility=()=>{if(document.hidden)suspend();else void poll()}
  const expiry=setInterval(()=>setData(prev=>{
   if(!prev)return prev;const now=Date.parse(prev.server_now)+performance.now()-readAt.current
   const occupants=prev.occupants.filter(p=>Date.parse(p.expires_at)>now),participants=prev.session?.participants.filter(p=>Date.parse(p.expires_at)>now)
   return occupants.length===prev.occupants.length&&participants?.length===prev.session?.participants.length?prev:{...prev,occupants,session:prev.session?{...prev.session,participants:participants??[]}:null}
  }),1000)
  void poll();const timer=setInterval(()=>void poll(),5000)
  window.addEventListener('online',poll);window.addEventListener('offline',suspend);window.addEventListener('pagehide',suspend);document.addEventListener('visibilitychange',visibility);window.addEventListener('pointerdown',input);window.addEventListener('keydown',input)
  return()=>{live.current=false;clearInterval(timer);clearInterval(expiry);window.removeEventListener('online',poll);window.removeEventListener('offline',suspend);window.removeEventListener('pagehide',suspend);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('pointerdown',input);window.removeEventListener('keydown',input);disconnect()}
 },[space,enabled,refresh,disconnect,enqueue])
 async function presence(visible:boolean,intent:SocialIntent|null){
  const active=token.current??crypto.randomUUID(),enter=!token.current,epoch=generation.current
  const next=await enqueue(()=>communityRpc<Visit>('hall_presence',{p_space:space,p_token:active,p_action:enter?'enter':'preferences',p_visible:visible,p_intent:intent}))
  if(!live.current||epoch!==generation.current){void enqueue(()=>communityRpc('hall_presence',{p_space:space,p_token:active,p_action:'leave'})).catch(()=>{});throw new Error('Hall participation paused. Try again.')}
  token.current=active;current.current=next;setVisit(next);lastInput.current=performance.now();return active
 }
 async function run(task:()=>Promise<unknown>){if(working.current)throw new Error('Wait for the current action to finish.');const ticket=++operation.current,epoch=generation.current;working.current=true;setBusy(true);setError('');try{await task();if(live.current&&epoch===generation.current)await refresh()}catch(e){if(live.current&&epoch===generation.current&&(e as {code?:string})?.code==='42501'){setData(null);setError(errorText(e));disconnect()}throw e}finally{if(ticket===operation.current){working.current=false;setBusy(false)}}}
 async function change(action:string,id:string,args:Record<string,unknown>={},revision:number|null=null){
  await run(async()=>{
   if(action==='focus_join'&&!token.current)await presence(false,null)
   const epoch=generation.current
   const next=await enqueue(()=>communityRpc<CommunityState>('community_change',{p_space:space,p_action:action,p_id:id,p_data:args,p_revision:revision,p_token:token.current}))
   if(live.current&&epoch===generation.current)accept(next)
  })
 }
 async function preferences(visible:boolean,intent:SocialIntent|null){await run(()=>presence(visible,intent))}
 async function move(point:Point){
  const active=token.current;if(!active)return
  const next=await enqueue(()=>communityRpc<Visit>('hall_presence',{p_space:space,p_token:active,p_action:'move',p_x:point.x,p_y:point.y}))
  if(!live.current||active!==token.current)throw new Error('Hall participation paused. Rejoin before walking.')
  current.current=next;setVisit(next)
 }
 return {data,error,visit,busy,readAt,refresh,change,preferences,move,disconnect}
}
export type CommunityController=ReturnType<typeof useCommunity>

import {useCallback,useEffect,useRef,useState} from 'react'
import {client} from '../data'
import {rpc,errorText} from '../account-repository'
import {typingPublisher,latestPublisher,type WorldScope,type WorldSnapshot,type FocusState} from './activity-state'

type LocalTyping={scope:WorldScope;user:string;active:boolean}
export function useTyping(scope:WorldScope|null,user?:string){
 const publisher=useRef<ReturnType<typeof typingPublisher>|null>(null)
 useEffect(()=>{
  if(!scope||!client)return
  const publish=latestPublisher((active:boolean)=>rpc(client!,'world_activity_update',{p_kind:scope.kind,p_scope:scope.id,p_typing:active}))
  const instance=typingPublisher(active=>{if(user)window.dispatchEvent(new CustomEvent<LocalTyping>('realm:typing',{detail:{scope,user,active}}));void publish(active)})
  publisher.current=instance
  const stop=()=>instance.stop();window.addEventListener('blur',stop);document.addEventListener('visibilitychange',stop)
  return()=>{instance.stop();publisher.current=null;window.removeEventListener('blur',stop);document.removeEventListener('visibilitychange',stop)}
 },[scope?.kind,scope?.id,user])
 return {input:(text:string)=>publisher.current?.input(text),stop:()=>publisher.current?.stop()}
}
export function useWorldActivity(scope:WorldScope|null,focus?:FocusState){
 const [snapshot,setSnapshot]=useState<WorldSnapshot>({messages:[],activity:[]}),[error,setError]=useState('')
 const sequence=useRef(0),request=useRef(0),localTyping=useRef(new Map<string,string|null>()),focusQueue=useRef(Promise.resolve())
 useEffect(()=>{
  const update=(event:Event)=>{const value=(event as CustomEvent<LocalTyping>).detail;if(!scope||value.scope.kind!==scope.kind||value.scope.id!==scope.id)return;const until=value.active?new Date(Date.now()+5000).toISOString():null;localTyping.current.set(value.user,until);setSnapshot(current=>{const activity=current.activity.filter(item=>item.user_id!==value.user),previous=current.activity.find(item=>item.user_id===value.user);return {...current,activity:[...activity,{user_id:value.user,focus_target:previous?.focus_target??null,focus_until:previous?.focus_until??null,typing_until:until}]}})}
  window.addEventListener('realm:typing',update);return()=>window.removeEventListener('realm:typing',update)
 },[scope?.kind,scope?.id])
 const refresh=useCallback(async()=>{
  if(!scope||!client)return
  const version=sequence.current,ticket=++request.current
  try{const next=await rpc<WorldSnapshot>(client,'world_activity_snapshot',{p_kind:scope.kind,p_scope:scope.id});if(version===sequence.current&&ticket===request.current){for(const [user,until] of localTyping.current){const value=next.activity.find(item=>item.user_id===user);if(value)value.typing_until=until;else if(until)next.activity.push({user_id:user,typing_until:until,focus_target:null,focus_until:null})}setSnapshot(next);setError('')}}
  catch(e){if(version===sequence.current&&ticket===request.current){setSnapshot({messages:[],activity:[]});setError(errorText(e))}}
 },[scope?.kind,scope?.id])
 useEffect(()=>{
  sequence.current++;localTyping.current.clear();setSnapshot({messages:[],activity:[]});setError('');let busy=false,disposed=false
  const poll=async()=>{if(busy||disposed||document.hidden)return;busy=true;try{await refresh()}finally{busy=false}}
  void poll();const timer=setInterval(()=>void poll(),1000);window.addEventListener('online',poll);document.addEventListener('visibilitychange',poll)
  return()=>{disposed=true;sequence.current++;clearInterval(timer);window.removeEventListener('online',poll);document.removeEventListener('visibilitychange',poll)}
 },[refresh])
 useEffect(()=>{
  if(!scope||!client||!focus)return
  const publish=latestPublisher((clear:boolean)=>rpc(client!,'world_activity_update',{p_kind:scope.kind,p_scope:scope.id,p_focus:true,p_focus_target:!clear&&focus.status==='running'?focus.target:null,p_focus_until:!clear&&focus.deadline?new Date(focus.deadline).toISOString():null}),focusQueue)
  void publish(false);const timer=focus.status==='running'?setInterval(()=>void publish(false),4000):undefined
  return()=>{clearInterval(timer);void publish(true)}
 },[scope?.kind,scope?.id,focus?.status,focus?.deadline,focus?.target])
 return {snapshot,error,refresh}
}

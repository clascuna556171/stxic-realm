import {useRef,useState,type FormEvent} from 'react'
import {MessageThread} from '../MessageThread'
import {client} from '../data'
import {rpc,errorText} from '../account-repository'
import {useTyping} from './useWorldActivity'
import type {WorldSnapshot} from './activity-state'
import './world-activity.css'

export function RoomConversation({owner,user,snapshot,refresh,people}:{owner:string;user:string;snapshot:WorldSnapshot;refresh:()=>Promise<void>;people:{id:string;name:string}[]}){
 const [body,setBody]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),retry=useRef<string|null>(null),version=useRef(0)
 const typing=useTyping({kind:'home',id:owner},user)
 async function send(event:FormEvent){
  event.preventDefault();if(busy||!body.trim())return
  typing.stop();setBusy(true);setError('');const sentVersion=version.current;retry.current??=crypto.randomUUID()
  try{await rpc(client!,'room_say',{p_owner:owner,p_body:body.trim(),p_client:retry.current});if(sentVersion===version.current){setBody('');retry.current=null}await refresh()}
  catch(e){setError(errorText(e)+' Retry to confirm delivery.')}finally{setBusy(false)}
 }
 return <section className="world-conversation" aria-label="Room conversation"><h2>Room conversation</h2><p>Up to 50 recent messages, available for 24 hours to current visitors.</p><ol aria-live="polite" aria-relevant="additions text">{snapshot.messages.map(message=><li key={message.id}><strong>{message.author_id===user?'You':people.find(person=>person.id===message.author_id)?.name??'Visitor'}</strong><span>{message.body}</span></li>)}</ol><form onSubmit={send}><label>Say something in this room<input maxLength={120} value={body} onChange={e=>{setBody(e.target.value);version.current++;retry.current=null;typing.input(e.target.value)}}/></label><button disabled={busy||!body.trim()}>{busy?'Sending…':'Say'}</button></form>{error&&<p role="alert">{error}</p>}</section>
}
export function HallConversation({channels,channel,onChannel}:{channels:{id:string;name:string}[];channel:string;onChannel:(id:string)=>void}){
 return <section className="world-conversation hall-conversation"><h2>Connected hall chat</h2>{channels.length?<><label>Channel<select value={channel} onChange={e=>onChannel(e.target.value)}>{channels.map(item=><option key={item.id} value={item.id}>#{item.name}</option>)}</select></label>{channel&&<MessageThread key={channel} kind="channel" id={channel} channelName={channels.find(item=>item.id===channel)?.name} title="Message this channel"/>}</>:<p>Choose an available server channel to connect chat to this hall.</p>}</section>
}

import {useEffect,useRef,useState,type KeyboardEvent} from 'react'
import type Phaser from 'phaser'
import {AccountGate,useAccount} from '../Account'
import {errorText,rpc,type RoomState,type Visitor} from '../account-repository'
import {readAppearance} from '../appearance'
import {client} from '../data'
import {PixelCharacter} from '../AppearanceStudio'
import {WorkspaceNav} from '../WorkspaceNav'
import {move,type Direction,type Point} from './room'
import {parseLayout} from './layout'
import './room.css'

export default function SharedHome({owner}:{owner:string}){return <AccountGate><Home key={owner} owner={owner}/></AccountGate>}
function Home({owner}:{owner:string}){
 const account=useAccount(),myId=account.session!.user.id
 const [snapshot,setSnapshot]=useState<RoomState|null>(null),[error,setError]=useState(''),[ended,setEnded]=useState(false),[moving,setMoving]=useState(false),[renderError,setRenderError]=useState(false),[selected,setSelected]=useState(''),[attempt,setAttempt]=useState(0)
 const mount=useRef<HTMLDivElement>(null),game=useRef<Phaser.Game|null>(null),token=useRef(crypto.randomUUID()),people=useRef<Visitor[]>([]),position=useRef<Point>({x:8,y:9}),sequence=useRef(-1),pending=useRef(false),lastMove=useRef(0),state=useRef<RoomState|null>(null)
 const own=owner===myId
 function accept(next:RoomState){if(!parseLayout(JSON.stringify(next.home.layout)))throw new Error('This home uses an unsupported layout. Ask the owner to save it again.');const me=next.visitors.find(v=>v.id===myId);if(!me)throw new Error('Visit ended. Re-enter the home.');if(me.sequence>=sequence.current){sequence.current=me.sequence;position.current={x:me.x,y:me.y};game.current?.events.emit('room:move',position.current)}state.current=next;people.current=next.visitors.filter(v=>v.id!==myId);game.current?.events.emit('room:people',people.current);setSnapshot(next);setError('')}
 useEffect(()=>{
  let alive=true,loading=false;const visitToken=crypto.randomUUID();token.current=visitToken;sequence.current=-1;setSnapshot(null);setEnded(false);setError('');state.current=null
  const fail=(e:unknown)=>{if(!alive)return;setError(errorText(e));if((e as {code?:string})?.code==='42501')setEnded(true)}
  const poll=async()=>{if(!alive||!state.current||loading||document.hidden)return;loading=true;try{const next=await rpc<RoomState>(client!,'room_state',{p_owner:owner,p_token:visitToken});if(alive)accept(next)}catch(e){fail(e)}finally{loading=false}}
  // Deferring one microtask prevents StrictMode's discarded first effect from starting a visit.
  void Promise.resolve().then(async()=>{if(!alive)return;try{const next=await rpc<RoomState>(client!,'enter_home',{p_owner:owner,p_token:visitToken});if(alive)accept(next);else void rpc(client!,'leave_home',{p_token:visitToken}).catch(()=>{})}catch(e){if(alive){setEnded(true);fail(e)}}})
  const timer=setInterval(()=>void poll(),1500),resume=()=>void poll();window.addEventListener('online',resume);document.addEventListener('visibilitychange',resume)
  return()=>{alive=false;clearInterval(timer);window.removeEventListener('online',resume);document.removeEventListener('visibilitychange',resume);void rpc(client!,'leave_home',{p_token:visitToken}).catch(()=>{})}
 },[owner,attempt])
 useEffect(()=>{
  if(!snapshot||ended||!mount.current)return
  let disposed=false;setRenderError(false)
  void import('./renderer').then(({createRoom})=>{if(!disposed&&mount.current)game.current=createRoom(mount.current,setSelected,()=>position.current,()=>state.current!.home.layout.objects,{appearance:{...readAppearance(),mood:state.current!.home.mood},people:()=>people.current})}).catch(()=>{if(!disposed)setRenderError(true)})
  return()=>{disposed=true;game.current?.destroy(true);game.current=null}
 },[snapshot?.home.owner_id,ended,attempt])
 async function step(direction:Direction){
  if(pending.current||!state.current||ended||Date.now()-lastMove.current<180)return
  const next=move(position.current,direction,state.current.home.layout.objects);if(next===position.current)return
  pending.current=true;lastMove.current=Date.now();setMoving(true)
  try{accept(await rpc<RoomState>(client!,'move_home',{p_owner:owner,p_token:token.current,p_x:next.x,p_y:next.y}))}catch(e){setError(errorText(e));if((e as {code?:string})?.code==='42501')setEnded(true)}finally{pending.current=false;setMoving(false)}
 }
 function key(e:KeyboardEvent<HTMLDivElement>){if(e.target!==e.currentTarget)return;const direction:Record<string,Direction>={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',w:'up',a:'left',s:'down',d:'right'};if(direction[e.key]){e.preventDefault();void step(direction[e.key])}}
 const item=snapshot?.home.layout.objects.find(o=>o.id===selected)
 return <main className="workspace-page room-app"><WorkspaceNav current="room"/><header className="workspace-header"><div><span>Shared home</span><span className="header-divider">/</span><strong>{snapshot?.owner.display_name??'Home'}</strong></div><a href="/?friends">Back to friends</a></header><div className="room-content"><div className="room-heading"><div><h1>{own?'Your home in Realm.':`${snapshot?.owner.display_name??'Your friend'}’s home.`}</h1><p>{snapshot?`${snapshot.home.privacy==='private'?'Private':'Friends only'} · Saved to the owner’s account`:'Checking access and opening the home…'}</p></div>{own&&<a className="room-studio-link" href="/?room-studio">Edit home & privacy</a>}</div>{error&&<p className="error" role="alert">{error}</p>}{ended?<div className="social-empty"><h2>This visit has ended.</h2><p>The home may have changed, access may have been revoked, or your visit expired.</p><button className="primary" onClick={()=>setAttempt(a=>a+1)}>Re-enter home</button></div>:snapshot?<div className="room-layout"><section className="room-main"><div className="room-scene-head"><div><h2>{own?'My home':`@${snapshot.owner.username}`}</h2><span>Revision {snapshot.home.revision} · {snapshot.visitors.length}/5 people</span></div><span>Server-validated movement</span></div><div className="room-canvas-frame"><div ref={mount} className="room-canvas" tabIndex={0} onKeyDown={key} aria-label="Shared home. Use arrow keys or WASD to move; people and objects are listed below."/>{renderError&&<p role="status">The scene could not load. You can still use the movement controls and lists.</p>}</div><div className="room-bottom"><div><strong>Make yourself at home.</strong><p>Focus the room and use arrow keys or WASD.</p><p role="status">Column {position.current.x+1} · Row {position.current.y+1}{moving?' · Moving…':''}</p></div><div className="direction-pad" role="group" aria-label="Movement controls">{(['up','left','down','right'] as const).map((d,i)=><button key={d} className={`move-${d}`} aria-label={`Move ${d}`} disabled={moving} onClick={()=>void step(d)}>{['↑','←','↓','→'][i]}</button>)}</div></div></section><aside className="room-inspector"><div className="inspector-heading"><h2>People in this home</h2><p>Positions refresh about every 1.5 seconds.</p></div><ul className="visitor-list">{snapshot.visitors.map(v=><li key={v.id}><span className="identity-portrait"><PixelCharacter value={{...readAppearance(),...v.character}} portrait/></span><span><strong>{v.id===myId?'You':v.name}</strong><small>Column {v.x+1}, row {v.y+1}</small></span></li>)}</ul><h2 className="objects-title">Objects</h2><div className="room-object-list" aria-label="Objects in this home">{snapshot.home.layout.objects.map(o=><button key={o.id} aria-pressed={selected===o.id} onClick={()=>setSelected(o.id)}>{o.name}</button>)}</div>{item&&<div className="room-object-detail" aria-live="polite"><h3>{item.name}</h3><p>{item.id==='sofa'?'A place to sit together. Sitting is not available yet.':item.description}</p></div>}<p className="studio-hint">Home edits end active visits so everyone reloads the same layout. After 45 seconds without a heartbeat, a visit expires.</p></aside></div>:<p role="status">Opening the home…</p>}</div></main>
}

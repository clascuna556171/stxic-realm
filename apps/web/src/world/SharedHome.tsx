import {RoomConversation} from './WorldConversation'
import {useWorldActivity} from './useWorldActivity'
import {ItemActionModal,itemActionLabel} from './ItemActionModal'
import {useWorldItems} from './useWorldItems'
import {WorldViewSwitch} from '../WorldViewSwitch'
import { HomeSocial } from './HomeSocial'
import { WorldAmbience } from './WorldAmbience'
import {useEffect,useRef,useState} from 'react'
import type Phaser from 'phaser'
import {AccountGate,useAccount} from '../Account'
import {errorText,rpc,type RoomState,type Visitor} from '../account-repository'
import {readAppearance} from '../appearance'
import {client} from '../data'
import {PixelCharacter} from '../AppearanceStudio'
import {WorkspaceNav} from '../WorkspaceNav'
import {canOccupy,type Point,type RoomAction} from './room'
import {useWalk} from './useWalk'
import {WalkControls} from './WalkControls'
import {beside} from './navigation'
import {parseLayout} from './layout'
import {petDisplayName,type EquippedPetSummary,type WildlifeEncounter} from '../pets/pet-model'
import {evaluateWildlifeEncounter,getUserPets,interactWithPet} from '../pets/pet-repository'
import {PetSprite} from '../pets/PetSprite'
import {PetCollection} from '../pets/PetCollection'
import {WildlifeEncounterModal} from './WildlifeEncounterModal'
import {readRoomPets} from './pet-room-state'
import './room.css'
import '../pets/pets.css'

export default function SharedHome({owner}:{owner:string}){return <AccountGate><Home key={owner} owner={owner}/></AccountGate>}
function Home({owner}:{owner:string}){
 const items=useWorldItems()
 const lightsRef=useRef(items.lights);lightsRef.current=items.lights
 const [view,setView]=useState<'scene'|'details'>(()=>location.hash==='#home-social'?'details':'scene')
 const account=useAccount(),myId=account.session!.user.id
 const [snapshot,setSnapshot]=useState<RoomState|null>(null),[error,setError]=useState(''),[ended,setEnded]=useState(false),[renderError,setRenderError]=useState(false),[selected,setSelected]=useState(''),[attempt,setAttempt]=useState(0)
 const [action,setAction]=useState<RoomAction|null>(null)
 const [petReaction,setPetReaction]=useState('')
 const [bondingEncounter,setBondingEncounter]=useState<WildlifeEncounter|null>(null)
 const [showPetManager,setShowPetManager]=useState(false)
 const actionRef=useRef(action);actionRef.current=action
 const activity=useWorldActivity(snapshot&&!ended?{kind:'home',id:owner}:null,items.focus)
 const activityRef=useRef(activity.snapshot);activityRef.current=activity.snapshot
 const focusRef=useRef(items.focus);focusRef.current=items.focus
 useEffect(()=>items.syncAction(action),[action])
 const mount=useRef<HTMLDivElement>(null),game=useRef<Phaser.Game|null>(null),token=useRef(crypto.randomUUID()),people=useRef<Visitor[]>([]),position=useRef<Point>({x:8,y:9}),sequence=useRef(-1),visitActive=useRef(false),state=useRef<RoomState|null>(null)
 const housePetsRef=useRef<EquippedPetSummary[]>([]),wildlifeRef=useRef<WildlifeEncounter|null>(null)
 const requests=useRef<Promise<unknown>>(Promise.resolve())
 const own=owner===myId
 const walk=useWalk({position:()=>position.current,walkable:p=>!!state.current&&canOccupy(p,state.current.home.layout.objects),step:validatedStep,enabled:!!snapshot&&!ended})
 const interaction=useRef({select:selectObject,floor:walkFloor,pet:handlePetClick,wild:handleWildlifeClick});interaction.current={select:selectObject,floor:walkFloor,pet:handlePetClick,wild:handleWildlifeClick}
 function walkFloor(p:Point){items.close();setAction(null);walk.go({point:p})}
 function selectObject(id:string){items.close();setSelected(id);setAction(null);const object=state.current?.home.layout.objects.find(o=>o.id===id);if(object)walk.go({object,id,label:object.name})}
 function handlePetClick(pet:EquippedPetSummary){
  setPetReaction(`${petDisplayName(pet)} greets you warmly!`)
  if(client){void interactWithPet(client,pet.id).then(res=>{setPetReaction(`${petDisplayName(pet)} is delighted! (Affection ${res.affection_level})`)}).catch(()=>{})}
 }
 function handleWildlifeClick(enc:WildlifeEncounter){
  if(own)setBondingEncounter(enc)
 }
 const arrived=snapshot?.home.layout.objects.find(o=>o.id===walk.arrived&&beside(position.current,o))
 function sit(id:string){const object=state.current?.home.layout.objects.find(o=>o.id===id);if(!object||walk.moving||ended||!beside(position.current,object))return;setAction({type:'sit',target:id,label:id==='sofa'?'Sitting on sofa':id==='console'?'Sitting at console':'Sitting at PC table'})}
 useEffect(()=>{items.close();setAction(null)},[ended,snapshot?.home.revision])
 useEffect(()=>{const frame=requestAnimationFrame(()=>{if(game.current){game.current.scale.getParentBounds();game.current.scale.refresh()}});return()=>cancelAnimationFrame(frame)},[view])

 useEffect(()=>{game.current?.events.emit('room:action',action)},[action])
 useEffect(()=>{if(action?.type!=='rest')return;const wake=(e:KeyboardEvent)=>{if(/^(Arrow(?:Up|Down|Left|Right)|[wasd])$/i.test(e.key)&&!(e.target instanceof HTMLElement&&e.target.closest('input,textarea,select,[contenteditable=true],dialog[open]')))setAction(null)};window.addEventListener('keydown',wake);return()=>window.removeEventListener('keydown',wake)},[action])
 useEffect(()=>{game.current?.events.emit('room:lights',items.lights)},[items.lights])

 function accept(next:RoomState){
  const layout=parseLayout(JSON.stringify(next.home.layout))
  if(!layout)throw new Error('This home uses an unsupported layout. Ask the owner to save it again.')
  const me=next.visitors.find(v=>v.id===myId)
  if(!me)throw new Error('Visit ended. Re-enter the home.')
  if(me.sequence<sequence.current)return
  const {housePets,wildlife}=readRoomPets(next)
  housePetsRef.current=housePets;wildlifeRef.current=own?wildlife:null
  next={...next,home:{...next.home,layout},house_pets:housePets,wildlife_encounter:wildlifeRef.current}
  sequence.current=me.sequence;position.current={x:me.x,y:me.y}
  game.current?.events.emit('room:move',position.current)
  if(state.current?.home.revision!==next.home.revision)game.current?.events.emit('room:layout',layout.objects)
  state.current=next;people.current=next.visitors.filter(v=>v.id!==myId)
  game.current?.events.emit('room:people',people.current)
  game.current?.events.emit('room:pets',housePets)
  game.current?.events.emit('room:wildlife',wildlifeRef.current)
  setSnapshot(next);setError('')
 }
 // Serialize polling with movement: an older read cannot rewind another visitor,
 // and a visitor's sequence may legitimately reset when they re-enter.
 function receive(name:string,args:Record<string,unknown>,visitToken:string){
  const task=requests.current.then(async()=>{if(!visitActive.current||token.current!==visitToken)throw new Error('This visit has ended.');const next=await rpc<RoomState>(client!,name,args);if(visitActive.current&&token.current===visitToken)accept(next);return next})
  requests.current=task.catch(()=>{});return task
 }
 useEffect(()=>{
  let alive=true,loading=false;const visitToken=crypto.randomUUID();token.current=visitToken;visitActive.current=true;sequence.current=-1;setSnapshot(null);setEnded(false);setError('');state.current=null;housePetsRef.current=[];wildlifeRef.current=null;people.current=[];setBondingEncounter(null);setShowPetManager(false)
  const fail=(e:unknown)=>{if(!alive)return;setError(errorText(e));if((e as {code?:string})?.code==='42501')setEnded(true)}
  const poll=async()=>{if(!alive||!state.current||loading||document.hidden)return;loading=true;try{await receive('room_state',{p_owner:owner,p_token:visitToken},visitToken)}catch(e){fail(e)}finally{loading=false}}
  // Deferring one microtask prevents StrictMode's discarded first effect from starting a visit.
  void Promise.resolve().then(async()=>{
   if(!alive)return
   try{
    await receive('enter_home',{p_owner:owner,p_token:visitToken},visitToken)
    if(!alive){void rpc(client!,'leave_home',{p_token:visitToken}).catch(()=>{});return}
    if(own&&client){
     // Bootstrap owner grants/habitats, then read a fresh authoritative room snapshot.
     try{
      await getUserPets(client,owner)
      if(!alive)return
      await evaluateWildlifeEncounter(client,owner)
      if(alive)await receive('room_state',{p_owner:owner,p_token:visitToken},visitToken)
     }catch(e){if(alive)setError(errorText(e))}
    }
   }catch(e){if(alive){setEnded(true);fail(e)}}
  })
  const timer=setInterval(()=>void poll(),1500),resume=()=>void poll();window.addEventListener('online',resume);document.addEventListener('visibilitychange',resume)
  return()=>{alive=false;visitActive.current=false;state.current=null;clearInterval(timer);window.removeEventListener('online',resume);document.removeEventListener('visibilitychange',resume);void rpc(client!,'leave_home',{p_token:visitToken}).catch(()=>{})}
 },[owner,attempt])
 useEffect(()=>{
  if(!snapshot||ended||!mount.current)return
  let disposed=false;setRenderError(false)
  void import('./renderer').then(({createRoom})=>{if(!disposed&&mount.current){game.current=createRoom(mount.current,id=>interaction.current.select(id),()=>position.current,()=>state.current!.home.layout.objects,{activity:()=>activityRef.current,focus:()=>focusRef.current,localId:myId,action:()=>actionRef.current,lights:()=>lightsRef.current,appearance:{...readAppearance(),mood:state.current!.home.mood},people:()=>people.current,pets:()=>housePetsRef.current,wildlife:()=>wildlifeRef.current,onPetInteract:p=>interaction.current.pet(p),onWildlifeClick:w=>interaction.current.wild(w),onWalk:p=>interaction.current.floor(p)});game.current.events.once('ready',()=>{if(!disposed&&game.current){game.current.events.emit('room:pets',housePetsRef.current);game.current.events.emit('room:wildlife',wildlifeRef.current)}})}}).catch(()=>{if(!disposed)setRenderError(true)})
  return()=>{disposed=true;game.current?.destroy(true);game.current=null}
 },[snapshot?.home.owner_id,ended,attempt])
 async function validatedStep(next:Point){
  if(!state.current||ended||!visitActive.current)throw new Error('This visit has ended. Re-enter the home.')
  setAction(null);const visitToken=token.current
  try{await receive('move_home',{p_owner:owner,p_token:visitToken,p_x:next.x,p_y:next.y},visitToken);if(!visitActive.current||token.current!==visitToken)throw new Error('This visit has ended.')}
  catch(e){if(visitActive.current&&token.current===visitToken){setError(errorText(e));if((e as {code?:string})?.code==='42501')setEnded(true)}throw new Error(errorText(e))}
 }
 const item=snapshot?.home.layout.objects.find(o=>o.id===selected)
 const housePets=snapshot?.house_pets??[]
 const wildVisitor=own?snapshot?.wildlife_encounter??null:null
 return <main className="workspace-page room-app viewport-world" data-view={view}><WorkspaceNav current="room"/><header className="workspace-header"><div><span>Shared home</span><span className="header-divider">/</span><strong>{snapshot?.owner.display_name??'Home'}</strong></div><a href="/?friends">Back to friends</a></header><div className="room-content"><div className="room-heading"><div><h1>{own?'Your home in Realm.':`${snapshot?.owner.display_name??'Your friend'}’s home.`}</h1><p>{snapshot?`${snapshot.home.privacy==='private'?'Private':'Friends only'} · Saved to the owner’s account`:'Checking access and opening the home…'}</p></div>{own&&<div style={{display:'flex',gap:'0.5rem',flexWrap:'wrap'}}><button type="button" onClick={()=>setShowPetManager(v=>!v)}>{showPetManager?'Hide Companions':'Companions & Wildlife'}</button><a className="room-studio-link" href="/?room-studio">Edit home & privacy</a></div>}</div>{own&&showPetManager&&snapshot&&<div style={{marginBottom:'1rem',padding:'1rem',background:'var(--realm-surface)',borderRadius:'8px',border:'1px solid var(--realm-line)'}}><PetCollection userId={owner} isOwn={own} roomObjects={snapshot.home.layout.objects} onHousePetsChange={nextPets=>{housePetsRef.current=nextPets;if(state.current){state.current={...state.current,house_pets:nextPets};setSnapshot(s=>s?{...s,house_pets:nextPets}:s);game.current?.events.emit('room:pets',nextPets)}}}/></div>}<WorldViewSwitch value={view} onChange={setView} scene="Room" details="People, objects & guestbook"/>{error&&<p className="error" role="alert">{error}</p>}{petReaction&&<p className="profile-notice" role="status">{petReaction}</p>}{wildVisitor&&<div className="wildlife-journal-summary" role="status" style={{marginBottom:'0.75rem',borderColor:'var(--realm-accent)'}}><span>✦ A wild <strong>{wildVisitor.name}</strong> has been attracted by your room’s habitat!</span><button type="button" className="primary" onClick={()=>setBondingEncounter(wildVisitor)}>Bond with {wildVisitor.name}</button></div>}{ended?<div className="social-empty"><h2>This visit has ended.</h2><p>The home may have changed, access may have been revoked, or your visit expired.</p><button className="primary" onClick={()=>setAttempt(a=>a+1)}>Re-enter home</button></div>:snapshot?<div className="room-layout"><section className="room-main"><div className="room-scene-head"><div><h2>{own?'My home':`@${snapshot.owner.username}`}</h2><span>{snapshot.home.privacy==='private'?'Private home':'Friends welcome'} · {snapshot.visitors.length}/5 people{housePets.length?` · ${housePets.length} companion${housePets.length>1?'s':''}`:''}</span></div></div><div className="room-canvas-frame"><WorldAmbience/>{action?.type==='rest'&&<div className="rest-vignette" aria-hidden="true"><span>zZz</span></div>}<div ref={mount} className="room-canvas" tabIndex={0} onKeyDown={e=>{if(e.target===e.currentTarget&&/^(Arrow|[wasd]$)/.test(e.key))setAction(null);walk.key(e)}} aria-label="Shared home. Click or tap floor or objects to walk. Use arrow keys or WASD; Escape stops. Position fields and objects are in details."/>{renderError&&<p role="status">The scene could not load. You can still use the movement controls and lists.</p>}</div><WalkControls position={position.current} moving={walk.moving} message={action?action.label:walk.message} onStep={d=>{setAction(null);walk.step(d)}} onStop={()=>walk.cancel()} disabled={ended}>{arrived&&!action&&<>{['desk','sofa'].includes(arrived.id)?<button className="room-action-btn primary" onClick={()=>sit(arrived.id)}>{arrived.id==='desk'?'Sit at PC':'Sit on sofa'}</button>:<button onClick={()=>items.open(arrived)}>{itemActionLabel(arrived.id)}</button>}</>}{action&&<><button onClick={()=>setAction(null)}>Stand up</button>{action.target==='desk'&&<button onClick={()=>{if(arrived)items.open(arrived)}}>Workstation</button>}</>}</WalkControls></section><aside className="room-inspector"><div className="inspector-heading"><h2>People in this home</h2><p>Positions refresh about every 1.5 seconds.</p></div><ul className="visitor-list">{snapshot.visitors.map(v=><li key={v.id}><span className="identity-portrait"><PixelCharacter value={{...readAppearance(),...v.character}} portrait/></span><span><strong>{v.id===myId?'You':v.name}</strong><small>Column {v.x+1}, row {v.y+1}</small></span></li>)}</ul>{housePets.length>0&&<><h2 className="objects-title">Companions</h2><ul className="visitor-list" aria-label="Companions in this home">{housePets.map(p=><li key={p.id}><span className="identity-portrait" style={{display:'inline-flex',alignItems:'center',justifyContent:'center'}}><PetSprite speciesId={p.species_id} state="idle" scale={1}/></span><span><strong>{petDisplayName(p)}</strong><small>{p.name}{p.title?` · ${p.title}`:''} · {p.personality}</small></span><button type="button" onClick={()=>handlePetClick(p)}>Pet</button></li>)}</ul></>}<WalkControls position={position.current} moving={walk.moving} message={action?action.label:walk.message} onStep={d=>{setAction(null);walk.step(d)}} onStop={()=>walk.cancel()} showSteps={false} onWalk={walkFloor} disabled={ended}/><h2 className="objects-title">Objects</h2><div className="room-object-list" aria-label="Objects in this home">{snapshot.home.layout.objects.map(o=><button key={o.id} aria-pressed={selected===o.id} onClick={()=>selectObject(o.id)}>{o.name}</button>)}</div>{item&&<div className="room-object-detail" aria-live="polite"><h3>{item.name}</h3><button disabled={walk.moving||walk.arrived!==item.id||!beside(position.current,item)} onClick={()=>items.open(item)}>{itemActionLabel(item.id)}</button><p>{item.id==='sofa'?'A comfortable plush sofa with a kitten. Choose Sit on sofa to relax.':item.id==='desk'?'Project desk with mechanical keyboard, display and gaming chair. Choose Sit at PC table to focus here.':item.id==='coffee-table'?'Open the guestbook below to leave a note.':item.id==='console'?'Return to chat using the link below.':item.description}</p>{item.id==='desk'&&<div className="room-object-actions">{action?.target==='desk'?<button type="button" className="room-action-btn" onClick={()=>setAction(null)}>Stand up from PC table</button>:<button type="button" className="room-action-btn primary" disabled={walk.moving||walk.arrived!=='desk'} onClick={()=>sit('desk')}>Sit at PC</button>}</div>}{item.id==='sofa'&&<div className="room-object-actions">{action?.target==='sofa'?<button type="button" className="room-action-btn" onClick={()=>setAction(null)}>Stand up from sofa</button>:<button type="button" className="room-action-btn primary" disabled={walk.moving||walk.arrived!=='sofa'} onClick={()=>sit('sofa')}>Sit on sofa</button>}</div>}</div>}<p className="studio-hint">Home edits end active visits so everyone reloads the same layout. After 45 seconds without a heartbeat, a visit expires.</p><RoomConversation owner={owner} user={myId} snapshot={activity.snapshot} refresh={activity.refresh} people={snapshot.visitors}/>{activity.error&&<p role="status">Room activity unavailable: {activity.error}</p>}<HomeSocial owner={owner} selected={selected}/></aside></div>:<p role="status">Opening the home…</p>}</div>{snapshot&&!ended&&<ItemActionModal items={items} scope={`${myId}:home:${owner}`} owner={owner} own={own} onSit={()=>{if(arrived)sit(arrived.id)}} onRest={()=>{if(arrived?.id==='bed'&&!walk.moving)setAction({type:'rest',target:'bed',label:'Resting'})}}/>}{bondingEncounter&&<WildlifeEncounterModal encounter={bondingEncounter} onClose={()=>setBondingEncounter(null)} onBonded={nextPets=>{setBondingEncounter(null);setPetReaction(`Adopted ${bondingEncounter.name} into your permanent collection!`);housePetsRef.current=nextPets.equipment.house_pets;wildlifeRef.current=null;if(state.current){state.current={...state.current,house_pets:nextPets.equipment.house_pets,wildlife_encounter:null};setSnapshot(s=>s?{...s,house_pets:nextPets.equipment.house_pets,wildlife_encounter:null}:s);game.current?.events.emit('room:pets',nextPets.equipment.house_pets);game.current?.events.emit('room:wildlife',null)}}}/>}</main>
}

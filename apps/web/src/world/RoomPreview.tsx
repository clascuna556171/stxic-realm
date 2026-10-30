import {WorldViewSwitch} from '../WorldViewSwitch'
import { WorldAmbience } from './WorldAmbience'
import { WorkspaceNav } from '../WorkspaceNav'
import { Icon } from '../Icon'
import { PixelCharacter } from '../AppearanceStudio'
import { readAppearance } from '../appearance'
import { FurnitureThumbnail } from './FurnitureThumbnail'
import { useEffect, useRef, useState } from 'react'
import type Phaser from 'phaser'
import { canOccupy, getRandomWalkableStep, OBJECTS, ROOM, type Point, type RoomAction } from './room'
import { useWalk } from './useWalk'
import { WalkControls } from './WalkControls'
import { beside } from './navigation'
import { STORAGE_KEY, parseLayout } from './layout'
import './room.css'

export default function RoomPreview(){
 const [view,setView]=useState<'scene'|'details'>('scene')
 const mount=useRef<HTMLDivElement>(null);const game=useRef<Phaser.Game|null>(null)
 const [layout]=useState(()=>{try{return parseLayout(localStorage.getItem(STORAGE_KEY)??'')?.objects??OBJECTS}catch{return OBJECTS}})
 const [appearance]=useState(readAppearance);const [position,setPosition]=useState<Point>({...ROOM.spawn});const [selected,setSelected]=useState(layout[0]?.id??'');const [renderError,setRenderError]=useState(false);const [ready,setReady]=useState(false)
 const [action,setAction]=useState<RoomAction|null>(null)
 const [autoMove,setAutoMove]=useState(false)
 const lastManualRef=useRef(Date.now())
 const positionRef=useRef(position);const selectedObject=layout.find(o=>o.id===selected)
 const walk=useWalk({position:()=>positionRef.current,walkable:p=>canOccupy(p,layout),step:p=>{setAction(null);setAutoMove(false);positionRef.current=p;setPosition(p)}})
 const interaction=useRef({select:selectObject,floor:walkFloor});interaction.current={select:selectObject,floor:walkFloor}
 function selectObject(id:string){setAutoMove(false);setAction(null);setSelected(id);const object=layout.find(o=>o.id===id);if(object)walk.go({object,id,label:object.name})}
 function walkFloor(p:Point){setAutoMove(false);setAction(null);walk.go({point:p})}
 const arrived=layout.find(o=>o.id===walk.arrived&&beside(position,o))
 useEffect(()=>{const frame=requestAnimationFrame(()=>{if(game.current){game.current.scale.getParentBounds();game.current.scale.refresh()}});return()=>cancelAnimationFrame(frame)},[view])

 useEffect(()=>{positionRef.current=position;game.current?.events.emit('room:move',position)},[position])
 useEffect(()=>{game.current?.events.emit('room:action',action)},[action])

 useEffect(()=>{let disposed=false;void import('./renderer').then(({createRoom})=>{if(!disposed&&mount.current){game.current=createRoom(mount.current,id=>interaction.current.select(id),()=>positionRef.current,()=>layout,{onWalk:p=>interaction.current.floor(p)});game.current.events.once('ready',()=>{if(!disposed)setReady(true)})}}).catch(()=>{if(!disposed)setRenderError(true)});return()=>{disposed=true;game.current?.destroy(true);game.current=null}},[])

 useEffect(()=>{
  if(!autoMove||action!==null||walk.moving)return
  const timer=setInterval(()=>{
   if(Date.now()-lastManualRef.current<3500)return
   setPosition(current=>{
    const next=getRandomWalkableStep(current,layout)
    positionRef.current=next;return next
   })
  },3500)
  return()=>clearInterval(timer)
 },[autoMove,action,layout,walk.moving])

 function sit(targetId:'desk'|'sofa'){
  const object=layout.find(o=>o.id===targetId)
  if(!object||walk.moving||!beside(positionRef.current,object))return
  setAutoMove(false);lastManualRef.current=Date.now()
  setAction({type:'sit',target:targetId,label:targetId==='desk'?'Sitting at PC table':'Sitting on sofa'})
 }
 function standUp(){setAction(null)}
 function actionButton(id:string){return (id==='desk'||id==='sofa')?<button className="room-action-btn primary" onClick={()=>sit(id)}>{id==='desk'?'Sit at PC':'Sit on sofa'}</button>:<button onClick={()=>setView('details')}>View {arrived?.name}</button>}

 return <main className="room-app workspace-page viewport-world" data-view={view}><WorkspaceNav current="room"/><header className="workspace-header"><div><span>Personal space</span><span className="header-divider">/</span><strong>My home</strong></div><span className="local-label">Single-player · Local preview</span></header><div className="room-content"><div className="room-heading"><div><h1>Your corner of Realm.</h1><p>A place to pause between conversations.</p></div><a className="room-studio-link" href="/?room-studio"><Icon name="studio"/>Edit room</a></div><WorldViewSwitch value={view} onChange={setView} scene="Room" details="Objects & details"/><div className="room-layout"><section className="room-main" aria-labelledby="scene-title"><div className="room-scene-head"><div><h2 id="scene-title">The {appearance.mood==='cozy'?'warm studio':appearance.mood==='medieval'?'old-world study':'night workspace'}</h2><span>Personal home · {layout.length} objects</span></div><div className="room-scene-head-actions">{action?<div className="room-action-indicator" role="status"><span className="room-action-pill"><span className="action-pill-dot"/>{action.label}</span><button type="button" className="room-action-btn-mini" onClick={standUp}>Stand up</button></div>:<button type="button" className={`room-wander-toggle ${autoMove?'is-active':''}`} onClick={()=>setAutoMove(m=>!m)} aria-pressed={autoMove} title={autoMove?'Auto-moving active. Click to pause.':'Auto-moving paused. Click to resume.'}><span className="wander-pulse"/><span>{autoMove?'Auto-moving':'Stationary'}</span></button>}<a href="/?appearance">Change room mood <Icon name="arrow"/></a></div></div><div className="room-canvas-frame"><WorldAmbience/><div className="room-canvas" ref={mount} tabIndex={0} onKeyDown={walk.key} aria-label="Room preview. Click or tap the floor to walk, or an object to approach it. Arrow keys or WASD move; Escape stops. Objects and position fields are available in details."/>{!ready&&!renderError&&<span className="room-loading" role="status">Opening your room…</span>}{renderError&&<p className="room-render-error" role="status">The room could not be displayed. You can still explore the object list.</p>}</div><div className="scene-arrival">{arrived&&!action&&<><strong>{arrived.name}</strong>{actionButton(arrived.id)}</>}{action&&<button onClick={standUp}>Stand up</button>}</div><WalkControls position={position} moving={walk.moving} message={walk.message} onStep={d=>{setAutoMove(false);setAction(null);walk.step(d)}} onStop={()=>walk.cancel()} /></section><aside className="room-inspector"><div className="room-identity"><div className="identity-portrait"><PixelCharacter value={appearance} portrait/></div><div><strong>Your home</strong><span>{action?action.label:'Just you, for now.'}</span></div><a href="/?appearance" aria-label="Customize your character"><Icon name="avatar"/></a></div><div className="inspector-heading"><h2>Inside your space</h2><p>Select an object to walk beside it.</p></div><div className="room-object-list" aria-label="Objects in this room">{layout.map(object=><button key={object.id} onClick={()=>selectObject(object.id)} aria-pressed={selected===object.id}><span className="furniture-thumbnail"><FurnitureThumbnail id={object.id} mood={appearance.mood}/></span><span>{object.name}</span><Icon name="arrow"/></button>)}</div><WalkControls position={position} moving={walk.moving} message={walk.message} onStep={d=>{setAction(null);setAutoMove(false);walk.step(d)}} onStop={()=>walk.cancel()} showSteps={false} onWalk={walkFloor}/><div className="room-object-detail" aria-live="polite"><h3>{selectedObject?.name??'A fresh start'}</h3><p>{selectedObject?.id==='desk'?'Walk beside the desk, then choose Sit at PC.':selectedObject?.id==='sofa'?'Walk beside the sofa, then choose Sit on sofa.':selectedObject?.description??'Add your first item in Home Studio.'}</p>{selectedObject?.id==='desk'&&<div className="room-object-actions">{action?.target==='desk'?<button type="button" className="room-action-btn" onClick={standUp}>Stand up from PC table</button>:<button type="button" className="room-action-btn primary" disabled={walk.moving||walk.arrived!=='desk'} onClick={()=>sit('desk')}><Icon name="arrow"/>Sit at PC</button>}</div>}{selectedObject?.id==='sofa'&&<div className="room-object-actions">{action?.target==='sofa'?<button type="button" className="room-action-btn" onClick={standUp}>Stand up from sofa</button>:<button type="button" className="room-action-btn primary" disabled={walk.moving||walk.arrived!=='sofa'} onClick={()=>sit('sofa')}><Icon name="arrow"/>Sit on sofa</button>}</div>}</div><div className="room-notice"><strong>A space in the making</strong><p>This preview stays on this device. Sign in to save an account home and visit accepted friends.</p></div></aside></div></div></main>
}

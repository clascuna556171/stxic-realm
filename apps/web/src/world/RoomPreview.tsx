import { WorldAmbience } from './WorldAmbience'
import { WorkspaceNav } from '../WorkspaceNav'
import { Icon } from '../Icon'
import { PixelCharacter } from '../AppearanceStudio'
import { readAppearance } from '../appearance'
import { FurnitureThumbnail } from './FurnitureThumbnail'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type Phaser from 'phaser'
import { canOccupy, getObjectActionSeat, getRandomWalkableStep, move, OBJECTS, ROOM, type Direction, type Point, type RoomAction } from './room'
import { STORAGE_KEY, parseLayout } from './layout'
import './room.css'

const directions:{direction:Direction;symbol:string;label:string}[]=[{direction:'up',symbol:'↑',label:'Move up'},{direction:'left',symbol:'←',label:'Move left'},{direction:'down',symbol:'↓',label:'Move down'},{direction:'right',symbol:'→',label:'Move right'}]

export default function RoomPreview(){
 const mount=useRef<HTMLDivElement>(null);const game=useRef<Phaser.Game|null>(null)
 const [layout]=useState(()=>{try{return parseLayout(localStorage.getItem(STORAGE_KEY)??'')?.objects??OBJECTS}catch{return OBJECTS}})
 const [appearance]=useState(readAppearance);const [position,setPosition]=useState<Point>({...ROOM.spawn});const [selected,setSelected]=useState(layout[0]?.id??'');const [renderError,setRenderError]=useState(false);const [ready,setReady]=useState(false)
 const [action,setAction]=useState<RoomAction|null>(null)
 const [autoMove,setAutoMove]=useState(true)
 const lastManualRef=useRef(Date.now())
 const positionRef=useRef(position);const selectedObject=layout.find(o=>o.id===selected)

 useEffect(()=>{positionRef.current=position;game.current?.events.emit('room:move',position)},[position])
 useEffect(()=>{game.current?.events.emit('room:action',action)},[action])

 useEffect(()=>{let disposed=false;void import('./renderer').then(({createRoom})=>{if(!disposed&&mount.current){game.current=createRoom(mount.current,setSelected,()=>positionRef.current,()=>layout);game.current.events.once('ready',()=>{if(!disposed)setReady(true)})}}).catch(()=>{if(!disposed)setRenderError(true)});return()=>{disposed=true;game.current?.destroy(true);game.current=null}},[])

 useEffect(()=>{
  if(!autoMove||action!==null)return
  const timer=setInterval(()=>{
   if(Date.now()-lastManualRef.current<3500)return
   setPosition(current=>{
    const next=getRandomWalkableStep(current,layout)
    return next
   })
  },3500)
  return()=>clearInterval(timer)
 },[autoMove,action,layout])

 function sit(targetId:'desk'|'sofa'){
  const seat=getObjectActionSeat(targetId,layout)
  if(!seat)return
  lastManualRef.current=Date.now()
  setPosition(seat)
  setAction({type:'sit',target:targetId,label:targetId==='desk'?'Sitting at PC table':'Sitting on sofa'})
  setSelected(targetId)
 }

 function standUp(){
  if(!action)return
  const exitY=Math.min(ROOM.height-2,position.y+1)
  const exitPoint={x:position.x,y:exitY}
  const safePoint=canOccupy(exitPoint,layout)?exitPoint:ROOM.spawn
  setAction(null)
  setPosition(safePoint)
  lastManualRef.current=Date.now()
 }

 function step(direction:Direction){
  lastManualRef.current=Date.now()
  if(action)setAction(null)
  setPosition(current=>move(current,direction,layout))
 }

 function handleKey(event:KeyboardEvent<HTMLDivElement>){
  if(event.target!==event.currentTarget)return
  const keys:Record<string,Direction>={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',w:'up',s:'down',a:'left',d:'right'}
  const direction=keys[event.key]
  if(direction){event.preventDefault();step(direction)}
 }

 return <main className="room-app workspace-page"><WorkspaceNav current="room"/><header className="workspace-header"><div><span>Personal space</span><span className="header-divider">/</span><strong>My home</strong></div><span className="local-label">Single-player · Local preview</span></header><div className="room-content"><div className="room-heading"><div><h1>Your corner of Realm.</h1><p>A place to pause between conversations.</p></div><a className="room-studio-link" href="/?room-studio"><Icon name="studio"/>Edit room</a></div><div className="room-layout"><section className="room-main" aria-labelledby="scene-title"><div className="room-scene-head"><div><h2 id="scene-title">The {appearance.mood==='cozy'?'warm studio':appearance.mood==='medieval'?'old-world study':'night workspace'}</h2><span>Personal home · {layout.length} objects</span></div><div className="room-scene-head-actions">{action?<div className="room-action-indicator" role="status"><span className="room-action-pill"><span className="action-pill-dot"/>{action.label}</span><button type="button" className="room-action-btn-mini" onClick={standUp}>Stand up</button></div>:<button type="button" className={`room-wander-toggle ${autoMove?'is-active':''}`} onClick={()=>setAutoMove(m=>!m)} aria-pressed={autoMove} title={autoMove?'Auto-moving active. Click to pause.':'Auto-moving paused. Click to resume.'}><span className="wander-pulse"/><span>{autoMove?'Auto-moving':'Stationary'}</span></button>}<a href="/?appearance">Change room mood <Icon name="arrow"/></a></div></div><div className="room-canvas-frame"><WorldAmbience/><div className="room-canvas" ref={mount} tabIndex={0} onKeyDown={handleKey} aria-label="Room preview. Use arrow keys or WASD to move. Objects can be explored in the list." aria-describedby="room-help"/>{!ready&&!renderError&&<span className="room-loading" role="status">Opening your room…</span>}{renderError&&<p className="room-render-error" role="status">The room could not be displayed. You can still explore the object list.</p>}</div><div className="room-bottom"><div><strong id="room-help">Make yourself at home.</strong><p>Focus the room. Use arrow keys or WASD to explore.</p><p role="status">Column {position.x+1} · Row {position.y+1}</p></div><div className="direction-pad" role="group" aria-label="Movement controls">{directions.map(({direction,symbol,label})=><button key={direction} className={`move-${direction}`} aria-label={label} onClick={()=>step(direction)}>{symbol}</button>)}</div></div></section><aside className="room-inspector"><div className="room-identity"><div className="identity-portrait"><PixelCharacter value={appearance} portrait/></div><div><strong>Your home</strong><span>{action?action.label:'Just you, for now.'}</span></div><a href="/?appearance" aria-label="Customize your character"><Icon name="avatar"/></a></div><div className="inspector-heading"><h2>Inside your space</h2><p>Select something to take a closer look.</p></div><div className="room-object-list" aria-label="Objects in this room">{layout.map(object=><button key={object.id} onClick={()=>setSelected(object.id)} aria-pressed={selected===object.id}><span className="furniture-thumbnail"><FurnitureThumbnail id={object.id} mood={appearance.mood}/></span><span>{object.name}</span><Icon name="arrow"/></button>)}</div><div className="room-object-detail" aria-live="polite"><h3>{selectedObject?.name??'A fresh start'}</h3><p>{selectedObject?.description??'Add your first item in Home Studio.'}</p>{selectedObject?.id==='desk'&&<div className="room-object-actions">{action?.target==='desk'?<button type="button" className="room-action-btn" onClick={standUp}>Stand up from PC table</button>:<button type="button" className="room-action-btn primary" onClick={()=>sit('desk')}><Icon name="arrow"/>Sit at PC table</button>}</div>}{selectedObject?.id==='sofa'&&<div className="room-object-actions">{action?.target==='sofa'?<button type="button" className="room-action-btn" onClick={standUp}>Stand up from sofa</button>:<button type="button" className="room-action-btn primary" onClick={()=>sit('sofa')}><Icon name="arrow"/>Sit on sofa</button>}</div>}</div><div className="room-notice"><strong>A space in the making</strong><p>This preview stays on this device. Sign in to save an account home and visit accepted friends.</p></div></aside></div></div></main>
}

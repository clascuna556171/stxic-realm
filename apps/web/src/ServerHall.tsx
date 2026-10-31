import {HallConversation} from './world/WorldConversation'
import {useWorldActivity} from './world/useWorldActivity'
import {ItemActionModal,itemActionLabel} from './world/ItemActionModal'
import {useWorldItems} from './world/useWorldItems'
import {ItemLightLayer} from './world/ItemLightLayer'
import {beside} from './world/navigation'
import {WorldViewSwitch} from './WorldViewSwitch'
import { useEffect, useRef, useState } from 'react'
import { Icon } from './Icon'
import { HallTraveler } from './world/HallTraveler'
import { useWalk } from './world/useWalk'
import { WalkControls } from './world/WalkControls'
import { HALL_SPAWN, canWalkHall, hallDoorPoint, hallObjects } from './world/hall-movement'
import { facingFrom } from './world/navigation'
import type { Point, Direction, RoomAction } from './world/room'
import { useAccount } from './Account'
import { WorldAmbience } from './world/WorldAmbience'
import { HallCanvas } from './world/HallCanvas'
import { useHall } from './world/useHall'
import { worldPalettes } from './world/palette'
import type { Channel } from './data'
import type { Space } from './space-repository'
import './server-hall.css'

type HallProps = {
 spaces: Space[]
 selected: string
 onSelect: (id: string) => void
 channels: Channel[]
 loading: boolean
 detailsLoading?: boolean
 error?: string
 onRetry?: () => void
 preview?: boolean
 onManage?: () => void
}

// The visual identity follows the server ID, never its position in a filtered list.
export function hallTheme(id: string) {
 let hash = 0
 for (const letter of id) hash = (Math.imul(hash, 31) + letter.charCodeAt(0)) | 0
 return ['grove', 'ember', 'moon'][Math.abs(hash) % 3]
}

export function ServerCrest({ theme }: { theme: string }) {
 return <svg className={`server-crest ${theme}`} viewBox="0 0 40 48" shapeRendering="crispEdges" aria-hidden="true">
  <path d="M3 2h34v31l-5 7-12 6-12-6-5-7Z" fill="#171b1d" />
  <path d="M5 4h30v28l-5 6-10 6-10-6-5-6Z" fill="currentColor" />
  <path d="M8 7h24v24l-4 5-8 5-8-5-4-5Z" fill="#1d2425" />
  {theme === 'grove' ? <path d="M18 11h4v5h4v4h4v4h-8v10h-4V24h-8v-4h4v-4h4Zm-4 15h4v4h-4Zm8 0h4v4h-4Z" fill="currentColor" />
   : theme === 'ember' ? <path d="M18 10h4v9h5v4h-5v11h-4V23h-5v-4h5Zm-7 19h4v4h-4Zm14 0h4v4h-4Z" fill="currentColor" />
    : <path d="M17 10h9v4h-8v4h-4v9h4v4h8v4H16v-4h-5V17h6Zm10 8h4v4h-4Z" fill="currentColor" />}
 </svg>
}

export function ServerHall({ spaces, selected, onSelect, channels: allChannels, loading, detailsLoading = false, error, onRetry, preview = false, onManage }: HallProps) {
 const items=useWorldItems()
 const [view,setView]=useState<'scene'|'details'>('scene')
 const [query, setQuery] = useState('')
 const [page, setPage] = useState(0)
 const [ambient, setAmbient] = useState(true)
 const [position,setPosition]=useState<Point>(HALL_SPAWN),positionRef=useRef<Point>(HALL_SPAWN),[facing,setFacing]=useState<Direction>('down'),[action,setAction]=useState<RoomAction|null>(null)
 const { session } = useAccount()
 const { layout, error: layoutError } = useHall(session?.user.id)
 const selectedSpace = spaces.find(s => s.id === selected)
 const channels = allChannels.filter(c => c.space_id === selected)
 const filtered = spaces.filter(s => s.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
 const pages = Math.max(1, Math.ceil(spaces.length / 3))
 const visible = spaces.slice(page * 3, page * 3 + 3)
 const activeChannels = channels.filter(c => !c.archived_at)
 const [chosenChannel,setChosenChannel]=useState('')
 const connectedChannel=activeChannels.some(c=>c.id===chosenChannel)?chosenChannel:activeChannels[0]?.id??''
 const activity=useWorldActivity(!preview&&session&&connectedChannel?{kind:'channel',id:connectedChannel}:null,items.focus)
 const destination = selectedSpace && !selectedSpace.closed_at
  ? `/?space=${encodeURIComponent(selectedSpace.id)}${activeChannels[0] ? `&channel=${encodeURIComponent(activeChannels[0].id)}` : ''}` : null

 useEffect(()=>items.syncAction(action),[action])
 const walk=useWalk({position:()=>positionRef.current,walkable:p=>canWalkHall(p,layout),step:p=>{setAction(null);setFacing(facingFrom(positionRef.current,p,facing));positionRef.current=p;setPosition(p)}})
 const objects=hallObjects(layout),arrivedObject=objects.find(o=>o.id===walk.arrived&&beside(position,o))
 const arrivedSpace=walk.arrived===`server:${selected}`?selectedSpace:null
 function floor(p:Point){items.close();setAction(null);walk.go({point:p})}
 function approachObject(id:string){items.close();setAction(null);const object=objects.find(o=>o.id===id);if(object)walk.go({object,id,label:object.name})}
 function entrance(space:Space,index:number){setAction(null);onSelect(space.id);walk.go({point:hallDoorPoint(index),id:`server:${space.id}`,label:space.name})}
 useEffect(()=>{walk.cancel('Click the floor to walk, or choose an entrance.');if(!canWalkHall(positionRef.current,layout)){positionRef.current={...HALL_SPAWN};setPosition(positionRef.current)}},[layout])
 useEffect(()=>{walk.cancel(page?'Hall wing changed. Choose an entrance.':'Click the floor to walk, or choose an entrance.')},[page])

 useEffect(() => {
  const index = spaces.findIndex(s => s.id === selected)
  if (index >= 0) setPage(Math.floor(index / 3))
 }, [selected])
 useEffect(() => { if (page >= pages) setPage(pages - 1) }, [page, pages])

 return <section className="server-hall" data-view={view} aria-labelledby="hall-heading">
  <h1 id="hall-heading" className="sr-only">Server Halls</h1>
  <div className="hall-toolbar">
   <div className="hall-scene-tools"><span className="hall-theme-name"><Icon name="hall" />{worldPalettes[layout.theme].name}</span><a href="/?hall-studio"><Icon name="studio"/>Customize hall</a><button type="button" className="hall-ambience" aria-label={`Ambient effects ${ambient ? 'On' : 'Off'}`} aria-pressed={ambient} onClick={() => setAmbient(!ambient)}><Icon name="sun" />Effects <span>{ambient ? 'On' : 'Off'}</span></button></div>
   <div className="hall-intro-actions"><a href={preview?'/':'#hall-management'} onClick={event=>{if(onManage){event.preventDefault();onManage()}}}><Icon name="person" />Join a server</a><a className="hall-primary" href={preview?'/':'#hall-management'} onClick={event=>{if(onManage){event.preventDefault();onManage()}}}><Icon name="plus" />Create a server</a></div>
  </div>
  <WorldViewSwitch value={view} onChange={setView} scene="Hall" details="Servers & channels"/>
  {preview && <p className="hall-preview-note"><Icon name="compass" /><span>Hall preview · These three servers are illustrative. <a href="/">Sign in to find your own.</a></span></p>}
  {layoutError && <p className="hall-layout-warning" role="status">{layoutError}</p>}
  <div className="hall-layout">
   <div className="hall-world">
    <div className="hall-scene-stage"><div className={`hall-scene ${ambient ? 'has-ambience' : ''}`} tabIndex={0} onKeyDown={walk.key} aria-label="A pixel-art gathering hall. Select a server entrance or use the directory.">
     <ItemLightLayer layout={layout} lights={items.lights}/><HallCanvas layout={layout} onWalk={floor} onObject={approachObject}/>
     {layout.pieces.some(p=>p.kind==='hearth'&&items.lights[p.id]!==false)&&<div className="hall-firelight" aria-hidden="true" />}
     {ambient && <div className="hall-embers" aria-hidden="true"><WorldAmbience width={768} height={512} hearths={layout.pieces.filter(p=>p.kind==='hearth'&&items.lights[p.id]!==false).map(p=>({x:p.x*32,y:p.y*32}))}/></div>}
     <div className="hall-entrances" aria-label="Server entrances" aria-busy={loading}>
      {visible.map((space, i) => <button key={space.id} type="button" className={`hall-entrance entrance-${i} ${hallTheme(space.id)}`} aria-pressed={selected === space.id} aria-label={`Select ${space.name}${space.closed_at ? ', closed' : space.archived_at ? ', archived' : ''}`} onClick={() => entrance(space,i)}>
       <span className="entrance-outline" aria-hidden="true" />
       <span className="entrance-name"><ServerCrest theme={hallTheme(space.id)} /><span><strong>{space.name}</strong><small>{space.closed_at ? 'Closed' : space.archived_at ? 'Archived' : selected === space.id ? 'Selected' : 'Select entrance'}</small></span></span>
      </button>)}
     </div>
     {!loading && !error && !spaces.length && <div className="hall-scene-message"><Icon name="hall" /><strong>Your story starts here.</strong><span>Create a server or bring an invitation.</span></div>}
     {loading && <div className="hall-scene-message" role="status"><Icon name="hall" /><strong>Lighting the lanterns…</strong><span>Finding your servers.</span></div>}
     <HallTraveler key={connectedChannel} activity={activity.snapshot} user={session?.user.id} focus={items.focus} position={position} direction={facing} moving={walk.moving} action={action} objects={objects}/>
     {pages > 1 && <div className="hall-scene-pagination" aria-label="Hall wings"><button aria-label="Previous hall wing" disabled={page === 0} onClick={() => setPage(p => p - 1)}><Icon name="back" /></button><span>Wing {page + 1} / {pages}</span><button aria-label="Next hall wing" disabled={page + 1 === pages} onClick={() => setPage(p => p + 1)}><Icon name="arrow" /></button></div>}
    </div></div>
    <WalkControls position={position} moving={walk.moving} message={action?action.label:walk.message} onStep={walk.step} onStop={()=>walk.cancel()} onWalk={floor}>{arrivedSpace&&(preview?<a href="/">Sign in to enter</a>:destination&&!detailsLoading?<a href={destination}>Enter server</a>:<span>{detailsLoading?'Loading channels...':'Server closed'}</span>)}{arrivedObject&&<>{['desk','sofa'].includes(arrivedObject.kind)?(!action&&<button onClick={()=>setAction({type:'sit',target:arrivedObject.id,label:arrivedObject.kind==='desk'?'Sitting at PC':'Sitting on sofa'})}>{arrivedObject.kind==='desk'?'Sit at PC':'Sit on sofa'}</button>):<button onClick={()=>items.open(arrivedObject)}>{itemActionLabel(arrivedObject.kind)}</button>}</>}{action&&<button onClick={()=>setAction(null)}>Stand up</button>}</WalkControls>
   </div>
   <aside className="hall-directory" aria-label="Server directory">
    <div className="hall-directory-heading"><h2>Your servers</h2><span>{loading ? '…' : spaces.length}</span></div>
    <label className="hall-search"><Icon name="search" /><span className="sr-only">Find a server</span><input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Find a server…" /></label>
    <div className="hall-server-list" aria-label="Your servers" aria-busy={loading}>
     {loading ? <p className="hall-state" role="status">Finding your servers…</p> : error ? <div className="hall-state"><p role="alert">{error}</p><button onClick={onRetry}>Try again</button></div> : filtered.length ? filtered.map(space => <button type="button" key={space.id} aria-pressed={space.id === selected} onClick={() => onSelect(space.id)}><ServerCrest theme={hallTheme(space.id)} /><span><strong>{space.name}</strong><small>{space.closed_at ? 'Permanently closed' : space.archived_at ? 'Archived · history available' : 'Member server'}</small></span><Icon name="arrow" /></button>) : <p className="hall-state">{query ? 'No servers match. Try another name.' : 'No servers yet. Join with an invitation or create your first.'}</p>}
    </div>
    {selectedSpace && <div className="hall-selected" aria-live="polite" aria-busy={detailsLoading}>
     {!preview&&!selectedSpace.closed_at&&<a href={`/?server-hall=${encodeURIComponent(selectedSpace.id)}`}>Open shared server hall</a>}<div className="hall-selected-title"><ServerCrest theme={hallTheme(selectedSpace.id)} /><div><span>Selected server</span><h3>{selectedSpace.name}</h3></div></div>
     <p>{selectedSpace.closed_at ? 'This server is permanently closed.' : detailsLoading ? 'Finding the channels inside…' : selectedSpace.archived_at ? 'This server is archived. You can read its conversation history.' : activeChannels.length ? `${activeChannels.length} ${activeChannels.length === 1 ? 'channel' : 'channels'} to settle into.` : 'This server has no active channels yet.'}</p>
     {channels.length > 0 && <div className="hall-channel-preview" aria-label="Channels in selected server">{channels.slice(0, 3).map(c => preview ? <span key={c.id}># {c.name}</span> : <a key={c.id} href={`/?space=${encodeURIComponent(selectedSpace.id)}&channel=${encodeURIComponent(c.id)}`}># {c.name}{c.archived_at ? ' · archived' : ''}</a>)}{channels.length > 3 && <span>+{channels.length - 3} more</span>}</div>}
     {preview ? <a className="hall-enter" href="/">Sign in to enter<Icon name="arrow" /></a> : destination && !detailsLoading ? <a className="hall-enter" href={destination}>Enter server<Icon name="arrow" /></a> : <span className="hall-enter is-disabled">{detailsLoading ? 'Opening the way…' : 'Server closed'}</span>}
    </div>}
    <details className="hall-movement-details"><summary>Hall objects</summary><div className="hall-object-list">{objects.map(o=><button key={o.id} onClick={()=>approachObject(o.id)}>{o.name}</button>)}</div>{arrivedObject&&<><p>{arrivedObject.description}</p><button onClick={()=>items.open(arrivedObject)}>{itemActionLabel(arrivedObject.kind)}</button></>}</details>
    {!preview&&session&&<HallConversation channels={activeChannels} channel={connectedChannel} onChannel={setChosenChannel}/>}
   </aside>
  </div>
 <ItemActionModal items={items} scope={`${session?.user.id??'guest'}:hall`} hall onRest={()=>{}} onSit={()=>{if(arrivedObject)setAction({type:'sit',target:arrivedObject.id,label:arrivedObject.kind==='desk'?'Sitting at PC':'Sitting on sofa'})}} chat={destination??'/'} resources={selectedSpace&&<><h4>{selectedSpace.name}</h4>{channels.map(c=><p key={c.id}><a className="item-link-action" href={`/?space=${selectedSpace.id}&channel=${c.id}`}>#{c.name}</a></p>)}</>}/></section>
}

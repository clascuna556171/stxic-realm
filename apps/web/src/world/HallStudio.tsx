import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { errorText } from '../account-repository'
import { useAccount } from '../Account'
import { WorkspaceNav } from '../WorkspaceNav'
import { Icon } from '../Icon'
import { HallCanvas } from './HallCanvas'
import { HallSceneBoundary } from './HallSceneBoundary'
import { hallComponentPixels } from './hall-art'
import { doorStyles, editHall, firstHallPosition, hallCatalog, hallStorageKey, hallThemes, parseHall, placeHallPiece, starterHall, travelHall, type HallHistory, type HallKind, type HallLayout } from './hall-layout'
import { worldPalettes } from './palette'
import { readHall } from './useHall'
import './hall-studio.css'

function ComponentThumbnail({kind,theme}:{kind:HallKind;theme:HallLayout['theme']}) {
 const piece=hallCatalog.find(c=>c.kind===kind)!
 return <svg viewBox={`-5 -25 ${piece.width*32+10} ${piece.height*32+32}`} shapeRendering="crispEdges" aria-hidden="true">{hallComponentPixels(kind,theme).map((p,i)=><rect key={i} x={p.x} y={p.y} width={p.w} height={p.h} fill={p.color}/>)}</svg>
}

export type RemoteHallEditor = {
 layout: HallLayout; revision: number; name: string; exit: string; writable: boolean; error: string
 save: (layout: HallLayout, revision: number) => Promise<{ layout: HallLayout; revision: number }>
 reload: () => Promise<{ layout: HallLayout; revision: number }>
}
export default function HallStudio() { return <HallEditor/> }
export function HallEditor({remote}:{remote?:RemoteHallEditor}) {
 const {session}=useAccount(),user=session?.user.id
 const [initial]=useState(()=>remote?{layout:remote.layout,raw:JSON.stringify(remote.layout),error:''}:readHall(user))
 const [history,setHistory]=useState<HallHistory>({past:[],present:initial.layout,future:[]})
 const [baseline,setBaseline]=useState(JSON.stringify(initial.layout))
 const savedRaw=useRef(initial.raw),savedRevision=useRef(remote?.revision??0)
 const [busy,setBusy]=useState(false)
 const [selected,setSelected]=useState(initial.layout.pieces[0]?.id??'')
 const [panel,setPanel]=useState<'components'|'theme'>('components')
 const [notice,setNotice]=useState(initial.error)
 const [conflict,setConflict]=useState(false)
 const [column,setColumn]=useState(''),[row,setRow]=useState('')
 const layout=history.present,dirty=JSON.stringify(layout)!==baseline
 const piece=layout.pieces.find(p=>p.id===selected),item=hallCatalog.find(c=>c.kind===piece?.kind)
 const exit=remote?.exit??(session?'/?spaces':'/?hall-preview')
 useEffect(()=>{if(remote&&!busy&&remote.revision!==savedRevision.current){setConflict(true);setNotice('The shared hall changed on the server. Reload before saving your changes.')}},[remote?.revision,busy])
 useEffect(()=>{setColumn(piece?String(piece.x+1):'');setRow(piece?String(piece.y+1):'')},[piece])
 useEffect(()=>{
  if(!dirty)return
  const guard=(e:BeforeUnloadEvent)=>{e.preventDefault();e.returnValue=''}
  window.addEventListener('beforeunload',guard)
  return()=>window.removeEventListener('beforeunload',guard)
 },[dirty])
 useEffect(()=>{
  if(remote)return
  const changed=(e:StorageEvent)=>{if(e.key===hallStorageKey(user)||e.key===null){setConflict(true);setNotice('This hall changed in another tab. Reload the saved hall before saving your changes.')}}
  window.addEventListener('storage',changed)
  return()=>window.removeEventListener('storage',changed)
 },[user])
 function commit(next:HallLayout){if(busy)return;setHistory(h=>editHall(h,next))}
 function travel(direction:'undo'|'redo') {
  if(busy)return
  setHistory(h=>travelHall(h,direction))
  setNotice(direction==='undo'?'Edit undone.':'Edit restored.')
 }
 function tabKey(e:KeyboardEvent<HTMLDivElement>) {
  if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return
  e.preventDefault()
  const next=e.key==='Home'?'components':e.key==='End'?'theme':panel==='components'?'theme':'components'
  setPanel(next)
  e.currentTarget.querySelector<HTMLButtonElement>(`#${next==='theme'?'theme':'components'}-tab`)?.focus()
 }
 function add(kind:HallKind) {
  const available=firstHallPosition(layout,kind)
  if(!available){setNotice('There is no free space for this component. Move or remove another piece first.');return}
  const next={...available,id:crypto.randomUUID()}
  const result=placeHallPiece(layout,next)
  if(result.error){setNotice(result.error);return}
  commit(result.layout);setSelected(next.id);setNotice('Component added. Drag it into place or use the position controls.')
 }
 function move(id:string,x:number,y:number) {
  const target=layout.pieces.find(p=>p.id===id)
  if(!target||busy)return
  const result=placeHallPiece(layout,{...target,x,y})
  if(result.error){setNotice(`Invalid placement: ${result.error} Original position kept.`);return}
  commit(result.layout);setNotice('Position updated. The door landings and central aisle stay clear.')
 }
 function position(e:FormEvent){e.preventDefault();if(piece)move(piece.id,Number(column)-1,Number(row)-1)}
 async function save() {
  if(busy||remote&&!remote.writable)return
  setBusy(true)
  try {
   const actual=remote?savedRaw.current:localStorage.getItem(hallStorageKey(user))
   if(conflict||actual!==savedRaw.current){setConflict(true);setNotice('This hall changed. Reload before saving to avoid overwriting it.');return}
   const raw=JSON.stringify(layout)
   if(remote){const next=await remote.save(layout,savedRevision.current);savedRevision.current=next.revision}
   else localStorage.setItem(hallStorageKey(user),raw)
   savedRaw.current=raw;setBaseline(raw)
   setNotice(remote?'Shared hall saved for server members.':'Hall saved on this device. Your server entrances will use this arrangement.')
  } catch(e) {
   if(remote){if(['PT409','40001'].includes((e as {code?:string}).code??''))setConflict(true);setNotice(errorText(e))}
   else setNotice('The hall could not be saved. Browser storage may be full or unavailable. Your edits are still open.')
  } finally {setBusy(false)}
 }
 async function reload() {
  if(busy||dirty&&!confirm('Discard unsaved changes and reload the saved hall?'))return
  setBusy(true)
  try{
   let next
   if(remote){const loaded=await remote.reload();savedRevision.current=loaded.revision;next={layout:loaded.layout,raw:JSON.stringify(loaded.layout),error:''}}
   else next=readHall(user)
   setHistory({past:[],present:next.layout,future:[]});savedRaw.current=next.raw;setBaseline(JSON.stringify(next.layout));setConflict(false);setSelected(next.layout.pieces[0]?.id??'');setNotice(next.error||'Loaded the saved hall.')
  }catch(e){setNotice(errorText(e))}finally{setBusy(false)}
 }
 function shortcut(e:KeyboardEvent<HTMLElement>) {
  if(!(e.ctrlKey||e.metaKey)||e.altKey||!(e.target instanceof HTMLElement)||e.target.closest('input,textarea,select,button,[contenteditable=true]'))return
  if(e.key.toLowerCase()==='z'||e.key.toLowerCase()==='y'){e.preventDefault();travel(e.shiftKey||e.key.toLowerCase()==='y'?'redo':'undo')}
 }
 return <main className="workspace-page hall-studio-page" onKeyDown={shortcut}>
  <WorkspaceNav current="spaces" />
  <header className="workspace-header"><div><span>Server Halls</span><span className="header-divider">/</span><strong>{remote?`${remote.name} · Hall Studio`:'Hall Studio'}</strong></div><a href={exit} onClick={e=>{if(dirty&&!confirm('Discard unsaved hall changes?'))e.preventDefault()}}>Back to the hall<Icon name="arrow"/></a></header>
  <div className="hall-studio-content">
   <div className="hall-studio-intro"><div><h1>{remote?'Decorate your server hall.':'Make an entrance.'}</h1><p>{remote?'Shared with server members. Save to publish this arrangement.':'Your hall. Your atmosphere. Every piece in its place.'}</p></div><div className="hall-save-actions"><span role="status">{dirty?'Unsaved changes':parseHall(savedRaw.current)?'Saved arrangement':'Starter arrangement'}</span><button onClick={()=>travel('undo')} disabled={busy||!history.past.length}>Undo</button><button onClick={()=>travel('redo')} disabled={busy||!history.future.length}>Redo</button><button disabled={busy||!dirty} onClick={()=>{const saved=parseHall(baseline);if(saved){setHistory({past:[],present:saved,future:[]});setNotice('Unsaved changes cancelled. Saved arrangement restored.')}}}>Cancel changes</button><button className="primary" onClick={save} disabled={busy||!!remote&&!remote.writable||conflict||(!dirty&&parseHall(savedRaw.current)!==null)}><Icon name="check"/>Save hall</button></div></div>
   {remote&&!remote.writable&&<p role="alert">{remote.error||'Editing permission changed. Your draft is still open. Reload to check current access.'}</p>}
   <div className="hall-studio-layout">
    <section className="hall-workbench" aria-label="Hall arrangement">
     <div className="hall-workbench-head"><span><Icon name="hall"/>Live hall preview</span><span>{worldPalettes[layout.theme].name}</span></div>
     <div className="hall-editor-canvas"><HallSceneBoundary fallback="The hall preview could not load. You can still arrange components using the list and position fields."><HallCanvas layout={layout} editing selected={selected} onSelect={setSelected} onMove={move} disabled={busy||!!remote&&!remote.writable} onStatus={setNotice}/></HallSceneBoundary></div>
     <div className="hall-edit-help"><Icon name="compass"/><p>Drag a component to move it. Or select one, focus the hall and use arrow keys. The center path stays open.</p></div>
     <div className="hall-placement-panel">
      <div><h2>{item?.name??'Select a component'}</h2><p>{item?.description??'Choose a piece in the hall or the placed-components list.'}</p></div>
      {piece&&<form onSubmit={position}><label>Column<input type="number" min="2" max="23" required value={column} onChange={e=>setColumn(e.target.value)}/></label><label>Row<input type="number" min="8" max="15" required value={row} onChange={e=>setRow(e.target.value)}/></label><button type="submit">Move component</button><button type="button" onClick={()=>{commit({...layout,pieces:layout.pieces.filter(p=>p.id!==piece.id)});setSelected('');setNotice('Component removed. Undo restores it.')}}>Remove component</button></form>}
     </div>
     <p className={`hall-editor-notice ${conflict?'has-conflict':''}`} role="status">{notice||'Changes stay in this preview until you save.'}</p>
    </section>
    <aside className="hall-toolbox" aria-label="Hall design controls">
     <div className="hall-editor-tabs" role="tablist" aria-label="Hall editor" onKeyDown={tabKey}><button role="tab" id="components-tab" aria-controls="components-panel" aria-selected={panel==='components'} tabIndex={panel==='components'?0:-1} onClick={()=>setPanel('components')}>Components</button><button role="tab" id="theme-tab" aria-controls="theme-panel" aria-selected={panel==='theme'} tabIndex={panel==='theme'?0:-1} onClick={()=>setPanel('theme')}>Themes & architecture</button></div>
     {panel==='components'?<div id="components-panel" role="tabpanel" aria-labelledby="components-tab">
      <h2>Add to your hall</h2><p className="hall-toolbox-hint">Choose a piece, then find its place.</p>
      <div className="hall-component-catalog">{hallCatalog.map(c=><button key={c.kind} onClick={()=>add(c.kind)} aria-label={`Add ${c.name}`}><ComponentThumbnail kind={c.kind} theme={layout.theme}/><span>{c.name}<small>{c.width} × {c.height} tiles</small></span><Icon name="plus"/></button>)}</div>
      <h2>Placed components <span>{layout.pieces.length}/32</span></h2><div className="hall-placed-list">{layout.pieces.map((p,i)=><button key={p.id} aria-pressed={p.id===selected} onClick={()=>setSelected(p.id)}>{hallCatalog.find(c=>c.kind===p.kind)?.name}<small>#{i+1} · {p.x+1}, {p.y+1}</small></button>)}{!layout.pieces.length&&<p>The floor is yours. Add your first component above.</p>}</div>
     </div>:<div id="theme-panel" role="tabpanel" aria-labelledby="theme-tab">
      <h2>Choose an atmosphere</h2><div className="hall-theme-choices">{hallThemes.map(theme=><button key={theme} aria-pressed={layout.theme===theme} onClick={()=>commit({...layout,theme})}><span className={`hall-theme-swatch ${theme}`}/><span><strong>{worldPalettes[theme].name}</strong><small>{worldPalettes[theme].description}</small></span>{layout.theme===theme&&<Icon name="check"/>}</button>)}</div>
      <h2>Entrance styles</h2><p className="hall-toolbox-hint">{remote?'Channel portal destinations are configured by the owner in the shared hall.':'Doors stay connected to your server directory.'}</p><div className="hall-door-settings">{layout.doors.map((door,i)=><label key={i}>{['West entrance','Central entrance','East entrance'][i]}<select aria-label={['West entrance','Central entrance','East entrance'][i]} value={door} onChange={e=>{const doors=[...layout.doors] as HallLayout['doors'];doors[i]=e.target.value as typeof door;commit({...layout,doors})}}>{doorStyles.map(style=><option key={style} value={style}>{style==='oak'?'Carved oak doors':style==='stone'?'Open stone arch':'Moonlit portal'}</option>)}</select></label>)}</div>
      <h2>Finishing touches</h2><label className="hall-check"><input type="checkbox" checked={layout.rug} onChange={e=>commit({...layout,rug:e.target.checked})}/>Woven central runner</label><label className="hall-check"><input type="checkbox" checked={layout.greenery} onChange={e=>commit({...layout,greenery:e.target.checked})}/>Climbing ivy & entrance planting</label>
      <button className="hall-restore-layout" onClick={()=>{commit(starterHall(layout.theme));setSelected('');setNotice('Starter arrangement restored. Undo returns to your previous design.')}}>Restore starter arrangement</button>
     </div>}
     <div className="hall-storage-note"><Icon name="shield"/><p>{remote?'This is the server’s shared hall. Only its owner and explicitly granted decorators can save. Your personal cross-server hub stays separate.':<>Your personal hall is saved on this device{session?' for this account':''}. Editing it does not change server memberships or another person’s hall.</>}</p></div><button className="hall-reload" disabled={busy} onClick={()=>void reload()}>Reload saved hall</button>
    </aside>
   </div>
  </div>
 </main>
}

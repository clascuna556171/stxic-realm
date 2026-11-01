import {useCallback,useEffect,useRef,useState,type ReactNode} from 'react'
import {createPortal} from 'react-dom'
import {HomeSocial} from './HomeSocial'
import {rpc,errorText} from '../account-repository'
import {client} from '../data'
import {safeProjectUrl,useSocialSnapshot,type HomeSocialState,type ProjectLink} from './social-repository'
import {emptyContent,itemActionLabel,plantMood,sortMemos,type ItemContent,type Memo} from './item-state'
import type {useWorldItems} from './useWorldItems'
import './item-actions.css'
import {focusSeconds} from './activity-state'
import {SoundscapeControls} from './WorldAmbience'
import {VinylTurntable} from './VinylTurntable'
import {PetCompanion} from './PetCompanion'
import {PassportPanel} from './PassportPanel'
import {PixelWaterDrop} from './pixel-icons'
import {BadgeModal} from '../BadgeModal'
import {BadgeToastContainer} from '../BadgeToast'
import {getUserBadgeState, type UserBadgeState} from '../badges'

type Items=ReturnType<typeof useWorldItems>
type Props={items:Items;scope:string;owner?:string;own?:boolean;hall?:boolean;resources?:ReactNode;chat?:string;onRest:()=>void;onSit:()=>void}
// Native dialog supplies focus containment, inert background and Escape dismissal.
export function ItemActionModal(props:Props){
 const {items}=props
 return items.target?createPortal(<ItemDialog key={`${props.scope}:${items.target.id}`} {...props}/>,document.body):null
}
function ItemDialog({items,scope,owner,own=true,hall=false,resources,chat='/',onRest,onSit}:Props){
 const target=items.target!,kind=target.kind??target.id,dialog=useRef<HTMLDialogElement>(null)
 useEffect(()=>{const previous=items.opener.current,element=dialog.current;element?.showModal();return()=>{element?.close();queueMicrotask(()=>{if(previous?.isConnected)previous.focus()})}},[])
 const [tab,setTab]=useState('personal')
 const [hallmarksOpen,setHallmarksOpen]=useState(false)
 const [badgeState,setBadgeState]=useState<UserBadgeState>(()=>getUserBadgeState(owner??'self',[],own))
 const description=!hall&&kind==='desk'?'A place for project links, notes and a focused moment.':!hall&&kind==='sofa'?'Soft cushions for a quiet pause between conversations.':target.description
 const notebook=['coffee-table','round-table'].includes(kind),work=['desk','console'].includes(kind)
 return <dialog ref={dialog} className="item-dialog" aria-labelledby="item-title" onKeyDown={e=>{if(e.key!=='Tab')return;const controls=[...e.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),textarea:not(:disabled),select:not(:disabled),[tabindex="0"]')].filter(el=>el.getClientRects().length);const first=controls[0],last=controls.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}}} onCancel={e=>{e.preventDefault();items.close()}} onClick={e=>{if(e.target===e.currentTarget){const b=e.currentTarget.getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)items.close()}}}>
  <header><div><h2 id="item-title">{target.name}</h2><p>{description}</p></div><button autoFocus aria-label="Close item actions" onClick={items.close}>Close</button></header>
  {notebook?<><div className="item-tabs" role="group" aria-label="Notebook sections">{[['personal','Personal Notes'],['sticky','Room Sticky Notes'],['guestbook','Guestbook'],['passport','Passport & Stamps'],['hallmarks','Hallmarks']].map(([id,label])=><button key={id} aria-pressed={tab===id} onClick={()=>setTab(id)}>{label}</button>)}</div>
   {tab==='personal'&&<LocalNotes storageKey={`stxic-realm:notes:v1:${scope}`} label="Personal Notes"/>}
   {tab==='sticky'&&(hall?<section><h3>Community notes</h3>{resources??<p>Choose a server to read its community resources.</p>}</section>:<ContentPanel owner={owner} own={own} scope={scope} section="notes"/>)}
   {tab==='guestbook'&&(owner?<HomeSocial owner={owner} selected="coffee-table" section="guestbook"/>:<p>Sign in and open an account home to use its shared guestbook.</p>)}
   {tab==='passport'&&<PassportPanel roomId={scope} roomName={target.name} ownerName={owner??'Explorer'} mood="tech"/>}
   {tab==='hallmarks'&&<div className="item-hallmarks-panel"><p>Prestige crests, honors, and milestones across the Realm.</p><button type="button" className="item-open-hallmarks-btn" onClick={()=>setHallmarksOpen(true)}>Open Trophy Case ({Object.keys(badgeState.unlocked).length}/32)</button></div>}
  </>:work?<>{kind==='desk'&&<><div className="item-actions"><button onClick={()=>{onSit();items.close()}}>Sit at PC</button></div><PetCompanion petKey="desk"/></>}{kind==='console'&&<VinylTurntable/>}{owner?<ProjectCards owner={owner}/>:hall?<section><h3>Server workspace</h3>{resources}</section>:<p>Project links appear here when the home owner shares them in Home social settings.</p>}<FocusTimer items={items} onSit={onSit}/><SoundscapeControls sound={items.sound}/><LocalNotes storageKey={`stxic-realm:snippets:v1:${scope}`} label="Snippet log"/><a className="item-link-action" href={chat}>Return to Chat</a></>
  :kind==='bookshelf'?<>{hall?<><h3>Server resources</h3>{resources??<p>Select a server in the directory to browse its channels and community guides.</p>}</>:<ContentPanel owner={owner} own={own} scope={scope} section="reading"/>}</>
  :['lantern','floor-lamp','hearth'].includes(kind)?<><h3>Ambience</h3><p>Lighting is {items.lights[target.id]===false?'off':'on'} for your view. Your visitors keep their own settings.</p><button aria-pressed={items.lights[target.id]!==false} onClick={()=>items.toggle(target.id)}>{kind==='hearth'?(items.lights[target.id]===false?'Stoke Fire':'Let Fire Rest'):'Toggle Light'}</button>{kind==='hearth'&&<p>Embers follow the fire setting and your reduced-motion preference.</p>}</>
  :kind==='plant'?<><h3>{plantMood(items.watered[target.id])}</h3><p>{items.watered[target.id]?`Last watered ${new Date(items.watered[target.id]).toLocaleString()}`:'This plant has not been watered during this visit.'}</p><button onClick={()=>items.water(target.id)}>Water Plant</button><span key={items.splash} className={items.splash?'item-water-drop':''} aria-hidden="true">{items.splash?<PixelWaterDrop/>:null}</span><p role="status">{items.watered[target.id]?'Watered. Looking greener already.':''}</p></>
  :kind==='bed'?<><p>Pause here for a while. Any movement key or Stand up ends your rest.</p><div className="item-actions"><button onClick={()=>{onRest();items.close()}}>Sleep</button></div><PetCompanion petKey="bed"/></>
  :kind==='sofa'?<><p>Take a seat beside the sofa and settle in.</p><div className="item-actions"><button onClick={()=>{onSit();items.close()}}>Sit on sofa</button></div><PetCompanion petKey="sofa"/></>
  :<><p>A little piece of Realm’s identity. Make this space your own in the studio.</p><a className="item-link-action" href={hall?'/?hall-studio':'/?room-studio'}>Open {hall?'Hall':'Home'} Studio</a></>}
   <BadgeModal isOpen={hallmarksOpen} onClose={()=>setHallmarksOpen(false)} userBadgeState={badgeState} userId={owner??'self'} isOwnProfile={own} onBadgeStateChange={setBadgeState}/>
   <BadgeToastContainer onOpenTrophyCase={()=>setHallmarksOpen(true)}/>
 </dialog>
}
function useLocalValue<T>(key:string,initial:T){
 const [value,setValue]=useState<T>(()=>{try{return JSON.parse(localStorage.getItem(key)??'null')??initial}catch{return initial}}),[error,setError]=useState('')
 function save(next:T){try{localStorage.setItem(key,JSON.stringify(next));setValue(next);setError('');return true}catch{setError('Device storage is unavailable or full. Your change was not saved.');return false}}
 return {value,save,error}
}
function LocalNotes({storageKey,label}:{storageKey:string;label:string}){
 const {value,save,error}=useLocalValue<Memo[]>(storageKey,[])
 return <><p>{label==='Personal Notes'?'Saved on this device for this account. Visitors cannot see these notes.':'Save a short code snippet or terminal command on this device.'}</p><MemoEditor notes={Array.isArray(value)?value:[]} label={label} save={async notes=>{if(!save(notes))throw new Error('Your note was not saved. Device storage is unavailable or full.')}}/>{error&&<p role="alert">{error}</p>}</>
}
function MemoEditor({notes,label,save,readOnly=false,busy=false}:{notes:Memo[];label:string;save:(notes:Memo[])=>Promise<void>;readOnly?:boolean;busy?:boolean}){
 const original=useRef<Memo|null>(null)
 const [body,setBody]=useState(''),[editing,setEditing]=useState<string|null>(null),[error,setError]=useState(''),[pending,setPending]=useState(false)
 async function commit(next:Memo[],reset=false){if(pending||busy)return;setPending(true);setError('');try{await save(next);if(reset){setEditing(null);setBody('')}}catch(e){setError(errorText(e))}finally{setPending(false)}}
 return <section aria-label={label}><h3>{label}</h3>{!readOnly&&<form onSubmit={e=>{e.preventDefault();if(!body.trim())return;if(editing&&JSON.stringify(notes.find(n=>n.id===editing))!==JSON.stringify(original.current)){setError('This note changed while you were editing. Cancel and reopen it to review the latest version.');return}const now=new Date().toISOString();void commit(editing?notes.map(n=>n.id===editing?{...n,body:body.trim(),updated_at:now}:n):[...notes,{id:crypto.randomUUID(),body:body.trim(),pinned:false,created_at:now,updated_at:now}],true)}}><label>{editing?'Edit note':'Write Note'}<textarea aria-label={editing?'Edit note':'Write Note'} required maxLength={1000} value={body} onChange={e=>setBody(e.target.value)}/></label><div className="item-actions"><button disabled={busy||pending||!body.trim()||(!editing&&notes.length>=30)}>{editing?'Save note':'Add note'}</button>{editing&&<button type="button" onClick={()=>{setEditing(null);setBody('')}}>Cancel edit</button>}</div><small>{notes.length}/30 notes · Up to 1,000 characters each</small></form>}
  {!notes.length&&<p>No notes yet.</p>}<ol className="item-memos">{sortMemos(notes).map(n=><li key={n.id}><span>{n.pinned?'Pinned · ':''}<time dateTime={n.updated_at}>{new Date(n.updated_at).toLocaleString()}</time></span><p>{n.body}</p>{!readOnly&&<div className="item-actions"><button disabled={pending||busy} onClick={()=>{original.current=n;setEditing(n.id);setBody(n.body)}}>Edit note</button><button disabled={pending||busy} aria-pressed={n.pinned} onClick={()=>void commit(notes.map(m=>m.id===n.id?{...m,pinned:!m.pinned}:m))}>{n.pinned?'Unpin':'Pin'} note</button><button disabled={pending||busy} onClick={()=>void commit(notes.filter(m=>m.id!==n.id),editing===n.id)}>Delete note</button></div>}</li>)}</ol>{error&&<p role="alert">{error}</p>}
 </section>
}
function ContentPanel({owner,own,scope,section}:{owner?:string;own:boolean;scope:string;section:'notes'|'reading'}){
 return owner?<RemoteContent owner={owner} own={own} section={section}/>:<LocalContent scope={scope} section={section}/>
}
function LocalContent({scope,section}:{scope:string;section:'notes'|'reading'}){
 const {value,save,error}=useLocalValue<ItemContent>(`stxic-realm:item-content:v1:${scope}`,emptyContent)
 return <><p>Preview content stays on this device. In account homes, the owner’s stickies and reading list are visible to permitted visitors.</p>{section==='notes'?<MemoEditor notes={value.notes} label="Room Sticky Notes" save={async notes=>{if(!save({...value,notes}))throw new Error('Your note was not saved. Device storage is unavailable or full.')}}/>:<ReadingList links={value.reading} save={async reading=>{if(!save({...value,reading}))throw new Error('Your bookmark was not saved. Device storage is unavailable or full.')}}/>} {error&&<p role="alert">{error}</p>}</>
}
function RemoteContent({owner,own,section}:{owner:string;own:boolean;section:'notes'|'reading'}){
 const load=useCallback(()=>rpc<ItemContent>(client!,'home_item_content',{p_owner:owner}),[owner]),{data,error,refresh,apply}=useSocialSnapshot(load)
 async function save(change:Partial<ItemContent>){if(!data)throw new Error('Reload content before saving.');const next=await rpc<ItemContent>(client!,'save_home_item_content',{p_revision:data.revision,p_notes:data.notes,p_reading:data.reading,...(change.notes?{p_notes:change.notes}:{}),...(change.reading?{p_reading:change.reading}:{})});apply(next)}
 return <><p>Shared with people who can currently visit this home. {own?'Only you can edit.':'Curated by the home owner.'}</p>{error&&<p role="alert">{error}</p>}<button onClick={()=>void refresh().catch(()=>{})}>Reload shared content</button>{data?(section==='notes'?<MemoEditor notes={data.notes} label="Room Sticky Notes" readOnly={!own} save={notes=>save({notes})}/>:<ReadingList links={data.reading} readOnly={!own} save={reading=>save({reading})}/>):!error&&<p role="status">Opening shared content…</p>}</>
}
function ReadingList({links,save,readOnly=false}:{links:ProjectLink[];save:(links:ProjectLink[])=>Promise<void>;readOnly?:boolean}){
 const [title,setTitle]=useState(''),[url,setUrl]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false)
 async function change(next:ProjectLink[]){setBusy(true);setError('');try{await save(next);setTitle('');setUrl('')}catch(e){setError(errorText(e))}finally{setBusy(false)}}
 return <section><h3>Reading list & bookmarks</h3><LinkCards links={links}/>{!readOnly&&<>{links.map((l,i)=><button key={i} disabled={busy} onClick={()=>void change(links.filter((_,n)=>i!==n))}>Remove {l.title}</button>)}<form onSubmit={e=>{e.preventDefault();if(!safeProjectUrl(url)){setError('Use a public HTTPS address without credentials.');return}void change([...links,{title:title.trim(),url:safeProjectUrl(url)!}])}}><label>Book or resource title<input required maxLength={80} value={title} onChange={e=>setTitle(e.target.value)}/></label><label>Resource HTTPS address<input type="url" required maxLength={2048} value={url} onChange={e=>setUrl(e.target.value)}/></label><button disabled={busy||links.length>=5||!title.trim()}>Add bookmark</button></form></>}{error&&<p role="alert">{error}</p>}</section>
}
function LinkCards({links}:{links:ProjectLink[]}){return links.length?<ul className="item-links">{links.map((l,i)=>{const url=safeProjectUrl(l.url);return url?<li key={i}><a href={url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer"><strong>{l.title}</strong><span>{new URL(url).hostname} · Opens in new tab</span></a></li>:null})}</ul>:<p>No links shared yet.</p>}
function ProjectCards({owner}:{owner:string}){const load=useCallback(()=>rpc<HomeSocialState>(client!,'home_social',{p_owner:owner}),[owner]),{data,error}=useSocialSnapshot(load);return <section><h3>Owner’s projects</h3>{error?<p role="alert">{error}</p>:data?<LinkCards links={data.links}/>:<p role="status">Loading projects…</p>}</section>}
function FocusTimer({items,onSit}:{items:Items;onSit:()=>void}){
 const seconds=focusSeconds(items.focus,items.now),running=items.focus.status==='running'
 return <section><h3>Focus timer</h3><output className="item-timer" aria-label="Focus time remaining">{String(Math.floor(seconds/60)).padStart(2,'0')}:{String(seconds%60).padStart(2,'0')}</output><p role="status">{items.focus.status==='complete'?'Focus session complete. Take a break.':running?'Deep Work · Standing up pauses your session.':items.focus.status==='paused'?'Session paused. Start to settle back in.':'25 minutes to focus. Start when you’re ready.'}</p><div className="item-actions"><button disabled={seconds===0} onClick={()=>{if(running)items.pauseFocus();else{onSit();items.startFocus(items.target!.id)}}}>{running?'Pause timer':'Start timer'}</button><button onClick={items.resetFocus}>Reset timer</button></div></section>
}
export {itemActionLabel}

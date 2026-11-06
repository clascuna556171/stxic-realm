import {CommunityNextStep} from './CommunityNextStep'
import {useEffect,useRef,useState,type ReactNode} from 'react'
import {client,type Channel} from './data'
import {rpc,errorText,publicIdentities,type PublicIdentity} from './account-repository'
import {type Space,type SpaceData} from './space-repository'
import {AccountPortrait} from './AccountPortrait'
import {Icon} from './Icon'

export function ServerDetails({space,channels,selected,onClose,children}:{space:Space;channels:Channel[];selected:string;onClose:()=>void;children:ReactNode}){
 const [data,setData]=useState<SpaceData|null>(null),[people,setPeople]=useState<Record<string,PublicIdentity>>({}),[error,setError]=useState(''),[notice,setNotice]=useState(''),[attempt,setAttempt]=useState(0),[manualCopy,setManualCopy]=useState(false)
 const serial=useRef(0)
 useEffect(()=>{let active=true;const load=async()=>{const ticket=++serial.current;try{const next=await rpc<SpaceData>(client!,'space_admin_data',{p_space:space.id});if(!active||ticket!==serial.current)return;setData(next);setError('');const portraits=await publicIdentities(client!,next.members.map(m=>m.user_id)).catch(()=>({}));if(active&&ticket===serial.current)setPeople(portraits)}catch(e){if(active&&ticket===serial.current){setData(null);setPeople({});setError(errorText(e))}}};void load();const refresh=()=>{if(!document.hidden)void load()};const timer=setInterval(refresh,15000);window.addEventListener('online',refresh);window.addEventListener('focus',refresh);return()=>{active=false;serial.current++;clearInterval(timer);window.removeEventListener('online',refresh);window.removeEventListener('focus',refresh)}},[space.id,attempt])
 const url=new URL('/',location.origin);url.searchParams.set('space',space.id);if(selected)url.searchParams.set('channel',selected)
 async function copy(){try{await navigator.clipboard.writeText(url.href);setManualCopy(false);setNotice('Link copied. Only current members can open it.')}catch{setManualCopy(true);setNotice('Could not copy automatically. Select the link below to copy it.')}}
 return <aside className="server-details community-rail" id="server-details" aria-label="Server details" onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();onClose()}}}>
  <section className="community-summary">
   <div className="community-section-heading"><h2>Your community</h2><button className="community-rail-close" type="button" aria-label="Close server details" onClick={onClose}><Icon name="close"/></button><a className="community-manage" href="/?spaces" aria-label="Manage servers" title="Manage servers"><Icon name="more"/></a></div>
   <div className="community-identity"><span className="community-seal" aria-hidden="true">{space.name.trim().split(/\s+/).slice(0,2).map(word=>word[0]).join('').toLocaleUpperCase()}</span><div><h3>{space.name}</h3><p>{space.archived_at?'Archived space':space.closed_at?'Closed space':'Private member space'}</p></div></div>
   <dl className="community-counts"><div><dt>Members</dt><dd>{data?data.members.length:'—'}</dd></div><div><dt>Rooms</dt><dd>{channels.length}</dd></div></dl>
  </section>
  <CommunityNextStep channel={selected} space={space.id} archived={!!space.archived_at||!!space.closed_at}/>
  {children}
  <section className="community-people"><div className="community-section-heading"><h2>People</h2>{data&&<span>{data.members.length} total</span>}</div>
   {error?<div className="server-details-error"><p role="alert">{error}</p><button type="button" onClick={()=>setAttempt(n=>n+1)}>Retry member details</button></div>:data?<details className="community-member-disclosure"><summary><span className="community-avatar-stack" aria-hidden="true">{data.members.slice(0,4).map(member=><span key={member.user_id}><AccountPortrait person={people[member.user_id]??{display_name:member.name}}/></span>)}</span><span className="community-people-caption"><strong>Members</strong><span>View members <Icon name="arrow"/></span></span></summary><ul className="server-member-list">{data.members.map(member=><li key={member.user_id}><a href={`/?profile=${member.user_id}&space=${space.id}`}><span className="server-member-photo"><AccountPortrait person={people[member.user_id]??{display_name:member.name}}/></span><span><strong>{member.name}</strong><small>{member.role}</small></span><Icon name="arrow"/></a></li>)}</ul></details>:<p className="server-details-loading" role="status">Loading members…</p>}
  </section>

  <div className="community-rail-footer"><button type="button" onClick={()=>void copy()}><Icon name="link"/>Copy room link</button><a href="/?spaces">Manage space <Icon name="arrow"/></a>{manualCopy&&<input className="server-link-field" aria-label="Server destination link" readOnly value={url.href} onFocus={e=>e.currentTarget.select()}/>}<p role="status">{notice}</p></div>
 </aside>
}

import {AccountPortrait} from './AccountPortrait'
import {Brand} from './Brand'
import {Icon} from './Icon'
import {RoomArtwork} from './world/RoomArtwork'
import {PixelCharacter} from './AppearanceStudio'
import {readAppearance} from './appearance'
import {AccountGate,useAccount} from './Account'
import {useEffect,useRef,useState,type FormEvent} from 'react'
import type {Session} from '@supabase/supabase-js'
import {client,type Channel} from './data'
import {rpc,errorText} from './account-repository'
import {listSpaces,listChannels,roleRank,type Space} from './space-repository'
import {MessageThread} from './MessageThread'
import {WorkspaceNav} from './WorkspaceNav'
import {ServerDetails} from './ServerDetails'
import './realm-experience.css'
function SignIn() {
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false)
  async function submit(e: FormEvent) { e.preventDefault(); if (!client) return; setBusy(true); setError(''); const result = await client.auth.signInWithPassword({ email, password }); setBusy(false); if (result.error) setError(result.error.message) }
  return <main className="login"><div className="login-brand"><Brand /></div><div className="login-layout"><section className="login-introduction"><h1>Familiar faces.<br/>A space of your own.</h1><p>Pick up a conversation. Settle into your room. Make yourself at home.</p><div className="login-room-scene"><RoomArtwork/><div className="login-room-caption"><span>A first look inside Realm</span><a href="/?room-preview">Explore the room <Icon name="arrow"/></a></div></div></section><section className="login-panel"><h2>Welcome back.</h2><p>Sign in to your Realm account.</p><form onSubmit={submit}><label>Email<input type="email" autoComplete="email" placeholder="you@example.com" required value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Password<input type="password" autoComplete="current-password" placeholder="Your password" required value={password} onChange={e=>setPassword(e.target.value)}/></label>{error&&<p role="alert" className="error">{error}</p>}<button className="primary" disabled={busy}>{busy?'Signing in…':'Sign in to Realm'}<Icon name="arrow"/></button></form><a className="login-recovery" href="/auth/recover">Forgot your password?</a><p className="note">Need an account? Your Realm administrator can help you get access.</p><a className="login-avatar-link" href="/?appearance"><PixelCharacter value={readAppearance()} portrait/><span>Find your look.<br/>Try the character studio</span><Icon name="arrow"/></a><a className="login-hall-link" href="/?hall-preview"><Icon name="hall"/>Explore the Server Halls <Icon name="arrow"/></a><a className="mobile-room-link" href="/?room-preview">Explore the local room <Icon name="arrow"/></a></section></div><p className="login-footer"><span>People, spaces, and the things in between.</span><span>STXIC Realm · Early preview</span></p></main>
}
function Chat({session}:{session:Session}){
 const account=useAccount(),[spaces,setSpaces]=useState<Space[]>([]),[spaceId,setSpaceId]=useState(''),[channels,setChannels]=useState<Channel[]>([]),[selected,setSelected]=useState(''),[counts,setCounts]=useState<Record<string,number>>({}),[error,setError]=useState(''),[loading,setLoading]=useState(true)
 const alive=useRef(true),generation=useRef(0)
 const space=spaces.find(s=>s.id===spaceId),current=channels.find(c=>c.id===selected&&c.space_id===spaceId)
 const [detailsOpen,setDetailsOpen]=useState(()=>window.matchMedia('(min-width:1200px)').matches)
 const detailsButton=useRef<HTMLButtonElement>(null)
 const [compactDetails,setCompactDetails]=useState(()=>window.matchMedia('(max-width:1100px)').matches)
 useEffect(()=>{const media=window.matchMedia('(max-width:1100px)');const changed=()=>{setCompactDetails(media.matches);if(media.matches)setDetailsOpen(false)};media.addEventListener('change',changed);return()=>media.removeEventListener('change',changed)},[])
 function closeDetails(){setDetailsOpen(false);detailsButton.current?.focus()}
 useEffect(()=>{alive.current=true;const load=async()=>{try{const rows=await listSpaces(client!);if(!alive.current)return;setSpaces(rows);setSpaceId(id=>rows.some(s=>s.id===id)?id:rows.find(s=>s.id===new URLSearchParams(location.search).get('space'))?.id??rows[0]?.id??'');setLoading(false)}catch(e){if(alive.current){setSpaces([]);setChannels([]);setError(errorText(e));setLoading(false)}}};void load();const timer=setInterval(()=>void load(),15000);return()=>{alive.current=false;clearInterval(timer)}},[])
 useEffect(()=>{let active=true;setChannels([]);setSelected('');if(!spaceId)return;const load=async()=>{try{const rows=await listChannels(client!,spaceId);if(active){setChannels(rows);setSelected(id=>rows.some(c=>c.id===id)?id:rows.find(c=>c.id===new URLSearchParams(location.search).get('channel'))?.id??rows[0]?.id??'');setError('')}}catch(e){if(active){setChannels([]);setSelected('');setError(errorText(e))}}};void load();const timer=setInterval(()=>void load(),15000);return()=>{active=false;clearInterval(timer)}},[spaceId])
 async function unread(){const ticket=++generation.current;try{const rows=await Promise.all(channels.map(async c=>[c.id,await rpc<number>(client!,'message_unread',{p_kind:'channel',p_stream:c.id})] as const));if(alive.current&&ticket===generation.current)setCounts(Object.fromEntries(rows))}catch{/* The channel refresh handles revoked membership. */}}
 useEffect(()=>{void unread();const timer=setInterval(()=>void unread(),15000);return()=>{generation.current++;clearInterval(timer)}},[channels])

 const [myRole,setMyRole]=useState<string>('')
 useEffect(()=>{
  let active=true
  if(!spaceId||!client){setMyRole('');return}
  const checkRole=async()=>{
   try{
    const {data}=await client!.from('space_members').select('role').eq('space_id',spaceId).eq('user_id',session.user.id).maybeSingle()
    if(active&&data)setMyRole(data.role)
   }catch{
    if(active)setMyRole('')
   }
  }
  void checkRole()
  return()=>{active=false}
 },[spaceId,session.user.id])
 const canManageChannels=roleRank(myRole)>=3&&!space?.archived_at&&!space?.closed_at

 const [serverMenuOpen,setServerMenuOpen]=useState(false)
 const serverMenuRef=useRef<HTMLDivElement>(null)
 useEffect(()=>{
  if(!serverMenuOpen)return
  const onPointerDown=(e:MouseEvent)=>{if(serverMenuRef.current&&!serverMenuRef.current.contains(e.target as Node))setServerMenuOpen(false)}
  const onKeyDown=(e:KeyboardEvent)=>{if(e.key==='Escape')setServerMenuOpen(false)}
  window.addEventListener('pointerdown',onPointerDown)
  window.addEventListener('keydown',onKeyDown)
  return()=>{window.removeEventListener('pointerdown',onPointerDown);window.removeEventListener('keydown',onKeyDown)}
 },[serverMenuOpen])

 const [switchServerOpen,setSwitchServerOpen]=useState(false)
 const [serverSearch,setServerSearch]=useState('')
 const serverSearchRef=useRef<HTMLInputElement>(null)
 const [createChannelOpen,setCreateChannelOpen]=useState(false)
 interface SpaceCategory { id: string; name: string; collapsed?: boolean; channelIds: string[] }
 const [categories,setCategories]=useState<SpaceCategory[]>([])
 const [createCategoryOpen,setCreateCategoryOpen]=useState(false)
 const [categoryNameInput,setCategoryNameInput]=useState('')
 const [creatingCategory,setCreatingCategory]=useState(false)
 const [createCategoryError,setCreateCategoryError]=useState('')
 const [targetCategoryId,setTargetCategoryId]=useState<string|null>(null)
 const categoryInputRef=useRef<HTMLInputElement>(null)
 const [draggedChannelId,setDraggedChannelId]=useState<string|null>(null)
 const [dragOverTarget,setDragOverTarget]=useState<string|null>(null)
 const [dragOverChannelId,setDragOverChannelId]=useState<string|null>(null)
 const [channelNameInput,setChannelNameInput]=useState('')
 const [createError,setCreateError]=useState('')
 const [creating,setCreating]=useState(false)
 const nameInputRef=useRef<HTMLInputElement>(null)

 const [channelSettingsOpen,setChannelSettingsOpen]=useState(false)
 const [editingChannel,setEditingChannel]=useState<Channel|null>(null)
 const [editChannelName,setEditChannelName]=useState('')
 const [editChannelTopic,setEditChannelTopic]=useState('')
 const [savingChannel,setSavingChannel]=useState(false)
 const [editError,setEditError]=useState('')
 const editNameRef=useRef<HTMLInputElement>(null)
 const [channelTopics,setChannelTopics]=useState<Record<string,string>>(()=>{
  try{const raw=localStorage.getItem('realm:channel-topics');return raw?JSON.parse(raw):{}}catch{return {}}
 })

 const normalizedEditChannelName=editChannelName.trim().toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9_-]/g,'')

 function openEditChannel(c:Channel){
  setEditingChannel(c)
  setEditChannelName(c.name)
  setEditChannelTopic(channelTopics[c.id]||'')
  setEditError('')
  setChannelSettingsOpen(true)
 }

 useEffect(()=>{
  if(channelSettingsOpen){
   requestAnimationFrame(()=>editNameRef.current?.focus())
  }
 },[channelSettingsOpen])

 function saveChannelTopic(id:string,topic:string){
  setChannelTopics(prev=>{
   const next={...prev,[id]:topic}
   try{localStorage.setItem('realm:channel-topics',JSON.stringify(next))}catch{}
   return next
  })
 }

 async function handleSaveChannelSettings(e:FormEvent){
  e.preventDefault()
  if(!editingChannel||savingChannel)return
  if(!normalizedEditChannelName){
   setEditError('Channel name cannot be empty.')
   return
  }
  if(normalizedEditChannelName!==editingChannel.name&&channels.some(c=>c.id!==editingChannel.id&&c.name.toLowerCase()===normalizedEditChannelName)){
   setEditError('A channel with this name already exists in this server.')
   return
  }
  setSavingChannel(true)
  setEditError('')
  try{
   if(normalizedEditChannelName!==editingChannel.name){
    await rpc<string>(client!,'manage_channel',{
     p_action:'rename',
     p_space:spaceId,
     p_channel:editingChannel.id,
     p_name:normalizedEditChannelName,
     p_revision:editingChannel.revision
    })
    const rows=await listChannels(client!,spaceId)
    setChannels(rows)
   }
   saveChannelTopic(editingChannel.id,editChannelTopic.trim())
   setChannelSettingsOpen(false)
  }catch(err){
   setEditError(errorText(err))
  }finally{
   setSavingChannel(false)
  }
 }

 const normalizedChannelName=channelNameInput.trim().toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9_-]/g,'')

 useEffect(()=>{
  if(!spaceId){setCategories([]);return}
  try{
   const raw=localStorage.getItem(`realm:categories:${spaceId}`)
   if(raw){
    const parsed=JSON.parse(raw)
    if(Array.isArray(parsed)){setCategories(parsed);return}
   }
  }catch{}
  setCategories([])
 },[spaceId])

 function saveCategories(cats:SpaceCategory[]){
  if(!spaceId)return
  setCategories(cats)
  try{localStorage.setItem(`realm:categories:${spaceId}`,JSON.stringify(cats))}catch{}
 }

 function openCreateCategory(){
  setServerMenuOpen(false)
  setCategoryNameInput('')
  setCreateCategoryError('')
  setCreateCategoryOpen(true)
 }

 useEffect(()=>{
  if(createCategoryOpen){
   requestAnimationFrame(()=>categoryInputRef.current?.focus())
  }
 },[createCategoryOpen])

 function handleCreateCategory(e:FormEvent){
  e.preventDefault()
  if(creatingCategory)return
  const trimmed=categoryNameInput.trim()
  if(!trimmed){
   setCreateCategoryError('Category name cannot be empty.')
   return
  }
  if(categories.some(c=>c.name.toLowerCase()===trimmed.toLowerCase())){
   setCreateCategoryError('A category with this name already exists.')
   return
  }
  const newCat:SpaceCategory={
   id:`cat-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
   name:trimmed,
   collapsed:false,
   channelIds:[]
  }
  const next=[...categories,newCat]
  saveCategories(next)
  setCreateCategoryOpen(false)
  setCategoryNameInput('')
 }

 function toggleCategoryCollapse(catId:string){
  const next=categories.map(cat=>cat.id===catId?{...cat,collapsed:!cat.collapsed}:cat)
  saveCategories(next)
 }

 function moveChannelToCategory(channelId:string,targetCatId:string|null,targetIndex?:number){
  const next=categories.map(cat=>{
   const filteredIds=cat.channelIds.filter(id=>id!==channelId)
   if(targetCatId&&cat.id===targetCatId){
    if(typeof targetIndex==='number'&&targetIndex>=0&&targetIndex<=filteredIds.length){
     filteredIds.splice(targetIndex,0,channelId)
    }else{
     filteredIds.push(channelId)
    }
    return {...cat,channelIds:filteredIds,collapsed:false}
   }
   return {...cat,channelIds:filteredIds}
  })
  saveCategories(next)
 }

 function openCreateChannel(inCategoryId?:string){
  setServerMenuOpen(false)
  setTargetCategoryId(inCategoryId||null)
  setChannelNameInput('')
  setCreateError('')
  setCreateChannelOpen(true)
 }

 useEffect(()=>{
  if(createChannelOpen){
   requestAnimationFrame(()=>nameInputRef.current?.focus())
  }
 },[createChannelOpen])
 useEffect(()=>{
  if(switchServerOpen){
   requestAnimationFrame(()=>serverSearchRef.current?.focus())
  }
 },[switchServerOpen])

 async function handleCreateChannel(e:FormEvent){
  e.preventDefault()
  if(creating)return
  if(!normalizedChannelName){
   setCreateError('Channel name is required.')
   return
  }
  if(channels.some(c=>c.name.toLowerCase()===normalizedChannelName)){
   setCreateError('A channel with this name already exists in this server.')
   return
  }
  setCreating(true)
  setCreateError('')
  try{
   const newId=await rpc<string>(client!,'manage_channel',{p_action:'create',p_space:spaceId,p_name:normalizedChannelName})
   const rows=await listChannels(client!,spaceId)
   setChannels(rows)
   const createdChannelId=newId||(rows.length?rows[rows.length-1].id:null)
   if(createdChannelId)setSelected(createdChannelId)
   if(createdChannelId&&targetCategoryId){
    const next=categories.map(cat=>{
     if(cat.id===targetCategoryId){
      const channelIds=cat.channelIds.includes(createdChannelId)?cat.channelIds:[...cat.channelIds,createdChannelId]
      return {...cat,channelIds,collapsed:false}
     }
     return cat
    })
    saveCategories(next)
   }
   setCreateChannelOpen(false)
   setChannelNameInput('')
   setTargetCategoryId(null)
  }catch(err){
   setCreateError(errorText(err))
  }finally{
   setCreating(false)
  }
 }

 return <div className="shell realm-chat"><WorkspaceNav current="chat"/><aside className="sidebar"><div className="sidebar-heading" ref={serverMenuRef}><button type="button" className="chat-server-identity-button" aria-expanded={serverMenuOpen} aria-haspopup="menu" disabled={!space} onClick={()=>setServerMenuOpen(o=>!o)} aria-label={space?`${space.name} server menu`:'No server selected'}><span className="chat-server-name-wrap"><h1>{space?.name||"Your conversations"}</h1><svg className="server-menu-indicator" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></span></button>{serverMenuOpen&&<div className="server-dropdown-menu" role="menu" aria-label="Server menu"><button type="button" role="menuitem" className="server-menu-item" disabled={!canManageChannels} title={canManageChannels?undefined:'Only Server Owner or Admin can create channels'} onClick={()=>openCreateChannel()}><Icon name="plus"/> Create Channel</button><button type="button" role="menuitem" className="server-menu-item" disabled={!canManageChannels} title={canManageChannels?undefined:'Only Server Owner or Admin can create categories'} onClick={openCreateCategory}><Icon name="plus"/> Create Category</button><div className="server-menu-divider"/><button type="button" role="menuitem" className="server-menu-item" onClick={()=>{setServerMenuOpen(false);setServerSearch('');setSwitchServerOpen(true)}}><Icon name="shuffle"/> Switch Server</button><a href="/?spaces" className="server-menu-link" onClick={()=>setServerMenuOpen(false)}><Icon name="hall"/> Explore Server Halls</a></div>}<div className="sr-only"><label className="space-switcher">Server<select value={spaceId} onChange={e=>{setSpaceId(e.target.value);setServerMenuOpen(false)}}>{!spaces.length&&<option value="">No spaces yet</option>}{spaces.map(s=><option key={s.id} value={s.id}>{s.name}{s.archived_at?' · archived':''}</option>)}</select></label></div></div><div className={`side-section ${dragOverTarget==='uncategorized'?'is-drag-over':''}`} onDragOver={e=>{if(!draggedChannelId)return;e.preventDefault();e.dataTransfer.dropEffect='move'}} onDragEnter={e=>{if(!draggedChannelId)return;setDragOverTarget('uncategorized')}} onDragLeave={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node)&&dragOverTarget==='uncategorized')setDragOverTarget(null)}} onDrop={e=>{e.preventDefault();e.stopPropagation();const id=e.dataTransfer.getData('text/plain')||draggedChannelId;if(!id)return;moveChannelToCategory(id,null);setDraggedChannelId(null);setDragOverTarget(null);setDragOverChannelId(null)}}><span>CHANNELS <span>{channels.length}</span></span><button type="button" className="channel-plus-button" title={canManageChannels?"Create Channel":"Only Server Owner or Admin can create channels"} aria-label="Create Channel" disabled={!canManageChannels} onClick={()=>openCreateChannel()}>+</button></div><nav aria-label="Channels">{(()=>{
  const renderItem=(c:Channel,catId:string|null)=>(
   <div
    key={c.id}
    className={`channel-nav-item ${selected===c.id?'is-selected':''} ${draggedChannelId===c.id?'is-dragging':''} ${dragOverChannelId===c.id?'is-drag-target':''}`}
    draggable={canManageChannels}
    onDragStart={e=>{
     e.dataTransfer.setData('text/plain',c.id)
     e.dataTransfer.effectAllowed='move'
     setDraggedChannelId(c.id)
    }}
    onDragEnd={()=>{
     setDraggedChannelId(null)
     setDragOverTarget(null)
     setDragOverChannelId(null)
    }}
    onDragOver={e=>{
     if(!draggedChannelId||draggedChannelId===c.id)return
     e.preventDefault()
     e.stopPropagation()
     e.dataTransfer.dropEffect='move'
    }}
    onDragEnter={e=>{
     if(!draggedChannelId||draggedChannelId===c.id)return
     e.stopPropagation()
     setDragOverChannelId(c.id)
     setDragOverTarget(catId||'uncategorized')
    }}
    onDrop={e=>{
     e.preventDefault()
     e.stopPropagation()
     const droppedId=e.dataTransfer.getData('text/plain')||draggedChannelId
     if(!droppedId||droppedId===c.id)return
     if(catId){
      const targetCat=categories.find(cat=>cat.id===catId)
      const targetIdx=targetCat?targetCat.channelIds.indexOf(c.id):undefined
      moveChannelToCategory(droppedId,catId,targetIdx)
     }else{
      moveChannelToCategory(droppedId,null)
     }
     setDraggedChannelId(null)
     setDragOverTarget(null)
     setDragOverChannelId(null)
    }}
    onClick={()=>setSelected(c.id)}
   >
    <button type="button" className={`channel-nav-btn ${selected===c.id?'selected':''}`} aria-current={selected===c.id?'page':undefined} onClick={(e)=>{e.stopPropagation();setSelected(c.id)}} title={`# ${c.name}`}>
     <span className="channel-hash" aria-hidden="true">#</span>
     <span className="channel-name-label">{c.name}</span>
     {c.archived_at&&<small>Archived</small>}
     {counts[c.id]>0&&<span className="unread-count" aria-label={`${counts[c.id]} unread messages`}>{counts[c.id]}</span>}
    </button>
    <button type="button" className="channel-gear-btn" title="Edit Channel" aria-label={`Edit #${c.name}`} onClick={e=>{e.stopPropagation();openEditChannel(c)}}>
     <Icon name="settings"/>
    </button>
   </div>
  )
  const assignedIds=new Set(categories.flatMap(cat=>cat.channelIds))
  const uncategorized=channels.filter(c=>!assignedIds.has(c.id))
  return (
   <>
    {uncategorized.map(c=>renderItem(c,null))}
    {categories.map(cat=>{
     const catChannels=cat.channelIds.map(id=>channels.find(c=>c.id===id)).filter((c):c is Channel=>Boolean(c))
     // Include any channels in this space matching cat.channelIds
     const additional=channels.filter(c=>cat.channelIds.includes(c.id)&&!catChannels.some(x=>x.id===c.id))
     const allCatChannels=[...catChannels,...additional]
     return (
      <div
       key={cat.id}
       className={`channel-category-group ${dragOverTarget===cat.id?'is-drag-over':''}`}
       onDragOver={e=>{if(!draggedChannelId)return;e.preventDefault();e.dataTransfer.dropEffect='move'}}
       onDragEnter={e=>{if(!draggedChannelId)return;setDragOverTarget(cat.id)}}
       onDragLeave={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node)&&dragOverTarget===cat.id)setDragOverTarget(null)}}
       onDrop={e=>{
        e.preventDefault()
        e.stopPropagation()
        const droppedId=e.dataTransfer.getData('text/plain')||draggedChannelId
        if(!droppedId)return
        moveChannelToCategory(droppedId,cat.id)
        setDraggedChannelId(null)
        setDragOverTarget(null)
        setDragOverChannelId(null)
       }}
      >
       <div
        className={`channel-category-header ${cat.collapsed?'is-collapsed':''}`}
        onClick={()=>toggleCategoryCollapse(cat.id)}
        role="button"
        tabIndex={0}
        aria-expanded={!cat.collapsed}
        onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggleCategoryCollapse(cat.id)}}}
        title={cat.collapsed?`Expand ${cat.name}`:`Collapse ${cat.name}`}
       >
        <div className="channel-category-title-wrap">
         <svg
          className={`channel-category-arrow ${cat.collapsed?'is-collapsed':''}`}
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
         >
          <path d="m6 9 6 6 6-6"/>
         </svg>
         <span className="channel-category-name">{cat.name}</span>
        </div>
        <button
         type="button"
         className="channel-category-plus-btn"
         title={`Create Channel in ${cat.name}`}
         aria-label={`Create Channel in ${cat.name}`}
         disabled={!canManageChannels}
         onClick={e=>{e.stopPropagation();openCreateChannel(cat.id)}}
        >
         +
        </button>
       </div>
       {!cat.collapsed&&(
        <div className="channel-category-items">
         {allCatChannels.map(c=>renderItem(c,cat.id))}
        </div>
       )}
      </div>
     )
    })}
   </>
  )
})()}</nav><div className="account"><span className="avatar"><AccountPortrait person={account.identity?.profile}/></span><div><a className="account-profile-link" href="/?profile">{account.identity?.profile.display_name??session.user.email}</a><small><a href="/?privacy">Privacy & data</a></small></div><button onClick={()=>void client!.auth.signOut()}>Sign out</button></div></aside><main className="chat"><header className="chat-header"><div className="chat-channel-title"><span className="chat-channel-glyph" aria-hidden="true"><Icon name="chat"/></span><div><h2>{current?`# ${current.name}`:"Your channels"}</h2><p>{space?.name??"Choose a server to begin"}{(current?.archived_at||space?.archived_at)?" · Read-only archive":""}</p></div></div><nav className="chat-header-actions" aria-label="Conversation controls"><a href="/?settings" aria-label="App settings" title="App settings"><Icon name="settings"/></a><button ref={detailsButton} type="button" aria-expanded={detailsOpen} aria-controls="server-details" disabled={!space} onClick={()=>setDetailsOpen(open=>!open)}><Icon name="people"/>Details</button></nav></header>{error&&<p className="error" role="alert">{error}</p>}<div className={`chat-body ${detailsOpen&&space?'details-open':''}`}>{current?<MessageThread key={`${session.user.id}:${current.id}`} kind="channel" id={current.id} visible={!(detailsOpen&&space&&compactDetails)} title={`Message #${current.name}`} channelName={current.name} topic={channelTopics[current.id]||''} onOpenSettings={canManageChannels?()=>openEditChannel(current):undefined} readOnly={!!current.archived_at||!!space?.archived_at} onSync={()=>void unread()} availableChannels={channels.map(c=>({id:c.id,name:c.name,spaceName:space?.name||'Current Server'}))}/>:<div className="empty"><h2>{loading?'Loading your spaces…':'Make room for a conversation.'}</h2><p>Create a space or accept an invitation to get started.</p><a href="/?spaces">Manage spaces</a></div>}{detailsOpen&&space&&<ServerDetails key={space.id} space={space} channels={channels.filter(c=>c.space_id===space.id)} selected={selected} onChannel={id=>{setSelected(id);if(window.matchMedia('(max-width:1100px)').matches)closeDetails()}} onClose={closeDetails}/>}</div></main>{switchServerOpen&&<div className="modal-backdrop" role="presentation" onClick={e=>{if(e.target===e.currentTarget)setSwitchServerOpen(false)}} onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();setSwitchServerOpen(false)}}}><div className="modal-dialog switch-server-dialog" role="dialog" aria-modal="true" aria-labelledby="switch-server-title"><div className="modal-header"><div className="modal-header-top"><h2 id="switch-server-title">Switch Server</h2><button type="button" className="modal-close-btn" aria-label="Close" onClick={()=>setSwitchServerOpen(false)}><Icon name="close"/></button></div><p className="modal-subtitle">Select a server to view conversations and spaces.</p></div><div className="server-search-box"><Icon name="search"/><input ref={serverSearchRef} type="text" placeholder="Search servers…" value={serverSearch} onChange={e=>setServerSearch(e.target.value)}/></div><div className="server-modal-list" role="listbox" aria-label="Servers">{spaces.filter(s=>s.name.toLowerCase().includes(serverSearch.trim().toLowerCase())).length===0?<p className="server-modal-empty">No servers found matching &ldquo;{serverSearch}&rdquo;</p>:spaces.filter(s=>s.name.toLowerCase().includes(serverSearch.trim().toLowerCase())).map(s=><button key={s.id} type="button" role="option" aria-selected={s.id===spaceId} className={`server-modal-item ${s.id===spaceId?'is-active':''}`} onClick={()=>{setSpaceId(s.id);setSwitchServerOpen(false)}}><span className="server-modal-seal" aria-hidden="true">{s.name.trim().slice(0,1).toLocaleUpperCase()||'R'}</span><div className="server-modal-info"><strong>{s.name}</strong><small>{s.archived_at?'Archived':s.closed_at?'Closed':'Active Server'}</small></div>{s.id===spaceId&&<span className="server-modal-check" aria-label="Current server">✓</span>}</button>)}</div><div className="modal-actions"><button type="button" className="secondary-btn" onClick={()=>setSwitchServerOpen(false)}>Close</button></div></div></div>}{createChannelOpen&&<div className="modal-backdrop" role="presentation" onClick={e=>{if(e.target===e.currentTarget)setCreateChannelOpen(false)}} onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();setCreateChannelOpen(false)}}}><div className="modal-dialog" role="dialog" aria-modal="true" aria-labelledby="create-channel-title"><div className="modal-header"><h2 id="create-channel-title">Create Channel</h2><p className="modal-subtitle">in {targetCategoryId?(categories.find(c=>c.id===targetCategoryId)?.name||'Category'):'Text Channels'}</p></div><form onSubmit={handleCreateChannel}><label>CHANNEL NAME<input ref={nameInputRef} type="text" required maxLength={80} placeholder="new-channel" value={channelNameInput} onChange={e=>{setChannelNameInput(e.target.value);setCreateError('')}}/></label><div className="channel-name-preview">Preview: <code># {normalizedChannelName||'new-channel'}</code></div>{createError&&<p role="alert" className="error">{createError}</p>}<div className="modal-actions"><button type="button" className="secondary-btn" disabled={creating} onClick={()=>setCreateChannelOpen(false)}>Cancel</button><button type="submit" className="primary" disabled={creating||!normalizedChannelName}>{creating?'Creating…':'Create Channel'}</button></div></form></div></div>}{createCategoryOpen&&<div className="modal-backdrop" role="presentation" onClick={e=>{if(e.target===e.currentTarget)setCreateCategoryOpen(false)}} onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();setCreateCategoryOpen(false)}}}><div className="modal-dialog create-category-dialog" role="dialog" aria-modal="true" aria-labelledby="create-category-title"><div className="modal-header"><div className="modal-header-top"><h2 id="create-category-title">Create Category</h2><button type="button" className="modal-close-btn" aria-label="Close" onClick={()=>setCreateCategoryOpen(false)}><Icon name="close"/></button></div><p className="modal-subtitle">in {space?.name||'Server'}</p></div><form onSubmit={handleCreateCategory}><div className="create-category-section"><label className="create-category-label" htmlFor="create-category-name">CATEGORY NAME</label><div className="create-category-input-wrap"><input id="create-category-name" ref={categoryInputRef} type="text" required maxLength={80} placeholder="New Category" value={categoryNameInput} onChange={e=>{setCategoryNameInput(e.target.value);setCreateCategoryError('')}}/></div></div>{createCategoryError&&<p role="alert" className="error">{createCategoryError}</p>}<div className="modal-actions"><button type="button" className="secondary-btn" onClick={()=>setCreateCategoryOpen(false)}>Cancel</button><button type="submit" className="primary" disabled={creatingCategory||!categoryNameInput.trim()}>{creatingCategory?'Creating…':'Create Category'}</button></div></form></div></div>}{channelSettingsOpen&&editingChannel&&<div className="modal-backdrop" role="presentation" onClick={e=>{if(e.target===e.currentTarget)setChannelSettingsOpen(false)}} onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();setChannelSettingsOpen(false)}}}><div className="modal-dialog channel-settings-dialog" role="dialog" aria-modal="true" aria-labelledby="channel-settings-title"><div className="channel-settings-header"><h2 id="channel-settings-title">Overview</h2><button type="button" className="modal-close-btn" aria-label="Close" onClick={()=>setChannelSettingsOpen(false)}><Icon name="close"/></button></div><form onSubmit={handleSaveChannelSettings}><div className="channel-settings-section"><label className="channel-settings-label" htmlFor="edit-channel-name">CHANNEL NAME</label><div className="channel-settings-input-wrap"><span className="channel-settings-prefix" aria-hidden="true">#</span><input id="edit-channel-name" ref={editNameRef} type="text" required maxLength={80} placeholder="channel-name" value={editChannelName} onChange={e=>{setEditChannelName(e.target.value);setEditError('')}}/></div><div className="channel-name-preview">Preview: <code># {normalizedEditChannelName||'channel-name'}</code></div></div><div className="channel-settings-section"><label className="channel-settings-label" htmlFor="edit-channel-topic">CHANNEL TOPIC</label><div className="channel-topic-box"><div className="channel-topic-toolbar" aria-hidden="true"><span className="topic-tool" title="Bold">B</span><span className="topic-tool" title="Italic"><em>I</em></span><span className="topic-tool" title="Underline"><u>U</u></span><span className="topic-tool" title="Strikethrough"><s>S</s></span><span className="topic-tool" title="Spoiler">👁</span></div><textarea id="edit-channel-topic" maxLength={1024} rows={4} placeholder="Let everyone know what this channel is about" value={editChannelTopic} onChange={e=>setEditChannelTopic(e.target.value)}/></div></div>{editError&&<p role="alert" className="error">{editError}</p>}<div className="modal-actions channel-settings-actions"><button type="button" className="secondary-btn" disabled={savingChannel} onClick={()=>setChannelSettingsOpen(false)}>Cancel</button><button type="submit" className="primary" disabled={savingChannel||!normalizedEditChannelName}>{savingChannel?'Saving…':'Save Changes'}</button></div></form></div></div>}</div>
}
export default function App(){
 const account=useAccount()
 if(!client)return <main className="setup"><h1>Set up Realm</h1><p>Add your Supabase project URL and public key to <code>apps/web/.env.local</code> to connect.</p></main>
 if(account.loading)return <main className="setup" role="status">Opening Realm…</main>
 return account.session?<AccountGate><Chat key={account.session.user.id} session={account.session}/></AccountGate>:<SignIn/>
}

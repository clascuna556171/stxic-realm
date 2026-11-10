import {useEffect,useState} from 'react'
import {AccountGate,useAccount} from './Account'
import {errorText,publicIdentities,rpc,type PublicIdentity} from './account-repository'
import {client} from './data'
import {WorkspaceNav} from './WorkspaceNav'
import {MessageThread} from './MessageThread'
import {AccountPortrait} from './AccountPortrait'

interface ConversationItem {
 id: string
 peerId: string
 peer?: PublicIdentity
 unread: number
}

export default function DirectMessages({id}:{id:string}){
 return (
  <AccountGate>
   <ConversationView currentId={id}/>
  </AccountGate>
 )
}

function ConversationView({currentId: propId}:{currentId:string}){
 const user=useAccount().session!.user.id
 const [currentId,setCurrentId]=useState(propId)
 const [peer,setPeer]=useState<PublicIdentity|null>(null)
 const [error,setError]=useState('')
 const [conversations,setConversations]=useState<ConversationItem[]>([])
 const [loadingConvs,setLoadingConvs]=useState(true)
 const [showMobileList,setShowMobileList]=useState(false)

 useEffect(()=>{
  setCurrentId(propId)
 },[propId])

 useEffect(()=>{
  const handlePopState=()=>{
   const params=new URLSearchParams(window.location.search)
   const dm=params.get('dm')
   if(dm)setCurrentId(dm)
  }
  window.addEventListener('popstate',handlePopState)
  return()=>window.removeEventListener('popstate',handlePopState)
 },[])

 useEffect(()=>{
  if(!showMobileList)return
  const onKeyDown=(e:KeyboardEvent)=>{
   if(e.key==='Escape')setShowMobileList(false)
  }
  window.addEventListener('keydown',onKeyDown)
  return()=>window.removeEventListener('keydown',onKeyDown)
 },[showMobileList])

 useEffect(()=>{
  const supabase=client
  if(!supabase)return
  let active=true
  async function loadConversations(){
   const db=client
   if(!db)return
   try{
    const {data,error:convError}=await db.from('direct_conversations').select('id,user_a,user_b')
    if(convError||!data)return
    const peerIds=data.map(c=>c.user_a===user?c.user_b:c.user_a)
    const people=await publicIdentities(db,peerIds)
    const list=await Promise.all(
     data.map(async c=>{
      const peerId=c.user_a===user?c.user_b:c.user_a
      const unread=await rpc<number>(db,'message_unread',{p_kind:'direct',p_stream:c.id}).catch(()=>0)
      return {
       id:c.id,
       peerId,
       peer:people[peerId],
       unread:unread||0,
      }
     })
    )
    if(active){
     setConversations(list)
     setLoadingConvs(false)
    }
   }catch{
    if(active)setLoadingConvs(false)
   }
  }
  void loadConversations()
  const channel=supabase.channel(`user_dm_convs:${user}`)
   .on('postgres_changes',{event:'*',schema:'public',table:'direct_messages'},()=>void loadConversations())
   .subscribe()
  return()=>{
   active=false
   void supabase.removeChannel(channel)
  }
 },[user])

 useEffect(()=>{
  let active=true
  void (async()=>{
   try{
    const existing=conversations.find(c=>c.id===currentId)
    if(existing?.peer){
     setPeer(existing.peer)
     return
    }
    const {data,error:fetchError}=await client!.from('direct_conversations').select('user_a,user_b').eq('id',currentId).single()
    if(fetchError)throw new Error('Conversation unavailable. You must still be friends.')
    const other=data.user_a===user?data.user_b:data.user_a
    const people=await publicIdentities(client!,[other])
    if(active)setPeer(people[other]??null)
   }catch(e){
    if(active)setError(errorText(e))
   }
  })()
  return()=>{active=false}
 },[currentId,user,conversations])

 return (
  <main className="workspace-page dm-page">
   <WorkspaceNav current="direct"/>
   <header className="workspace-header">
    <div className="dm-peer-heading">
     <button
      type="button"
      className="dm-mobile-switcher-btn"
      onClick={()=>setShowMobileList(v=>!v)}
      aria-label="Toggle direct message conversations list"
     >
      {showMobileList?'Close list':'All DMs'}
     </button>
     {peer&&(
      <a className="dm-peer-portrait" href={`/?profile=${peer.id}`} aria-label={`View ${peer.display_name} profile`}>
       <AccountPortrait person={peer}/>
      </a>
     )}
     <strong>{peer?.display_name??'Direct message'}</strong>
     {peer&&<a href={`/?home=${peer.id}`}>Visit home</a>}
    </div>
    <div className="admin-links">
     <a href="/?friends">Back to friends</a>
    </div>
   </header>
   <div className="dm-layout">
    <aside className={`dm-sidebar ${showMobileList?'is-mobile-open':''}`} aria-label="Direct message conversations">
     <div className="dm-sidebar-header">
      <span className="dm-sidebar-title">Conversations</span>
      <a href="/?friends" className="dm-sidebar-new-btn" title="Start a conversation with a friend">+ New</a>
     </div>
     <nav className="dm-sidebar-list" aria-label="Conversations list">
      {conversations.length===0&&!loadingConvs&&(
       <p className="dm-sidebar-empty">No conversations yet.</p>
      )}
      {conversations.map(conv=>{
       const active=conv.id===currentId
       const p=conv.peer
       return (
        <a
         key={conv.id}
         href={`/?dm=${conv.id}`}
         className={`dm-sidebar-item ${active?'is-active':''}`}
         onClick={e=>{
          e.preventDefault()
          if(conv.id!==currentId){
           setCurrentId(conv.id)
           window.history.pushState(null,'',`/?dm=${conv.id}`)
          }
          setShowMobileList(false)
         }}
        >
         <div className="dm-item-portrait-wrap">
          <AccountPortrait person={p}/>
         </div>
         <div className="dm-item-info">
          <span className="dm-item-name">{p?.display_name??'Friend'}</span>
          <span className="dm-item-handle">@{p?.username??'member'}</span>
         </div>
         {conv.unread>0&&<span className="dm-item-badge">{conv.unread}</span>}
        </a>
       )
      })}
     </nav>
    </aside>
    <div className="dm-content">
     {error?(
      <p className="error" role="alert">{error}</p>
     ):(
      <MessageThread
       key={currentId}
       kind="direct"
       id={currentId}
       title={`Message ${peer?.display_name??'your friend'}`}
      />
     )}
    </div>
   </div>
  </main>
 )
}

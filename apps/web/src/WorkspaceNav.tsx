import {useEffect,useRef,useState} from 'react'
import { Brand } from './Brand'
import { Icon } from './Icon'
import { useAccount } from './Account'
import { client } from './data'
export function WorkspaceNav({ current }: { current: 'chat'|'room'|'appearance'|'studio'|'friends'|'profile'|'direct'|'spaces'|'privacy'|'moderation'|'platform'|'settings' }) {
 const {session}=useAccount()
 const [pendingRequests,setPendingRequests]=useState(0)
 const more=useRef<HTMLDetailsElement>(null)
 useEffect(()=>{const close=(event:PointerEvent)=>{if(more.current&&!more.current.contains(event.target as Node))more.current.open=false};const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'&&more.current?.open){more.current.open=false;more.current.querySelector('summary')?.focus()}};document.addEventListener('pointerdown',close);document.addEventListener('keydown',escape);return()=>{document.removeEventListener('pointerdown',close);document.removeEventListener('keydown',escape)}},[])
 useEffect(()=>{
  const userId=session?.user?.id
  const supabase=client
  if(!userId||!supabase)return
  let active=true
  async function checkPending(){
   try{
    const {count,error}=await supabase!.from('friendships').select('id',{count:'exact',head:true}).eq('addressee',userId).eq('status','pending')
    if(!error&&active&&count!==null)setPendingRequests(count)
   }catch{}
  }
  void checkPending()
  const channel=supabase.channel(`pending_friends:${userId}`)
   .on('postgres_changes',{event:'*',schema:'public',table:'friendships',filter:`addressee=eq.${userId}`},()=>void checkPending())
   .subscribe()
  const interval=setInterval(()=>void checkPending(),30000)
  return()=>{
   active=false
   clearInterval(interval)
   void supabase.removeChannel(channel)
  }
 },[session?.user?.id])
 return <aside className="workspace-nav"><a href="/" aria-label="Realm chat"><Brand compact/></a><nav aria-label="Realm workspace"><a href="/" aria-current={current==='chat'?'page':undefined}><Icon name="chat"/><span>Chat</span></a><a href={session?'/?spaces':'/?hall-preview'} aria-current={current==='spaces'?'page':undefined}><Icon name="hall"/><span>Halls</span></a><a href="/?friends" aria-current={current==='friends'||current==='direct'?'page':undefined}><div className="nav-icon-wrap"><Icon name="people"/>{pendingRequests>0&&<span className="nav-badge" aria-label={`${pendingRequests} pending friend request${pendingRequests>1?'s':''}`}>{pendingRequests>9?'9+':pendingRequests}</span>}</div><span>People</span></a><a href={session?`/?home=${session.user.id}`:'/?room-preview'} aria-current={current==='room'?'page':undefined}><Icon name="home"/><span>Home</span></a><a className="workspace-secondary" href="/?appearance" aria-current={current==='appearance'?'page':undefined}><Icon name="avatar"/><span>Avatar</span></a><a className="workspace-secondary" href="/?room-studio" aria-current={current==='studio'?'page':undefined}><Icon name="studio"/><span>Studio</span></a><details ref={more} className="workspace-more"><summary data-active={["settings","profile","appearance","studio"].includes(current)}><Icon name="more"/><span>More</span></summary><nav aria-label="More destinations"><a href={session?'/?profile':'/'} aria-current={current==='profile'?'page':undefined}><Icon name="profile"/><span>{session?'Your profile':'Sign in'}</span></a><a href="/?settings" aria-current={current==='settings'?'page':undefined}><Icon name="settings"/><span>App settings</span></a><a href="/?appearance"><Icon name="avatar"/><span>Character</span></a><a href="/?room-studio"><Icon name="studio"/><span>Home Studio</span></a></nav></details></nav><nav className="workspace-account" aria-label="Account navigation"><a href={session?'/?profile':'/'} aria-current={current==='profile'?'page':undefined}><Icon name="profile"/><span>{session?'Profile':'Sign in'}</span></a><a href="/?settings" aria-current={current==='settings'?'page':undefined}><Icon name="settings"/><span>Settings</span></a></nav></aside>
}

import { Brand } from './Brand'
import { Icon } from './Icon'
import { useAccount } from './Account'
export function WorkspaceNav({ current }: { current: 'room'|'appearance'|'studio'|'friends'|'profile'|'direct' }) {
 const {session}=useAccount()
 return <aside className="workspace-nav"><a href="/" aria-label="Realm chat"><Brand compact/></a><nav aria-label="Realm workspace"><a href="/" title="Chat"><Icon name="chat"/><span>Chat</span></a><a href="/?friends" aria-current={current==='friends'||current==='direct'?'page':undefined}><Icon name="person"/><span>People</span></a><a href={session?`/?home=${session.user.id}`:'/?room-preview'} aria-current={current==='room'?'page':undefined}><Icon name="home"/><span>Home</span></a><a href="/?appearance" aria-current={current==='appearance'?'page':undefined}><Icon name="person"/><span>Avatar</span></a><a href="/?room-studio" aria-current={current==='studio'?'page':undefined}><Icon name="studio"/><span>Studio</span></a></nav><a className="workspace-local" href={session?'/?profile':'/'}>{session?'PROFILE':'SIGN IN'}</a></aside>
}

import { useState } from 'react'
import {
  Bell, BookOpen, Check, ChevronDown, CircleUserRound, DoorOpen, Edit3, Gamepad2,
  Hash, Heart, Home, Image, LayoutGrid, MessageCircle, Mic, MoreHorizontal,
  Palette, PanelRightClose, Plus, RotateCcw, Search, Send, Settings, Shield,
  Smile, Sparkles, Trash2, Undo2, Users, Volume2, Wifi
} from 'lucide-react'

type View = 'friends' | 'dm' | 'spaces' | 'home' | 'studio' | 'settings'
type Icon = React.ComponentType<{ size?: number; strokeWidth?: number }>

const people = [
  { name: 'Mika', handle: '@mika', color: '#f59eaf', status: 'online', detail: 'Finishing a new room set', initials: 'MK' },
  { name: 'Ren', handle: '@ren', color: '#74b9ff', status: 'away', detail: 'In Lunar Divide', initials: 'RN' },
  { name: 'Sam', handle: '@sam', color: '#f4bf75', status: 'dnd', detail: 'Designing — focus mode', initials: 'SM' },
  { name: 'Kai', handle: '@kai', color: '#65d6ad', status: 'online', detail: 'Building something cozy', initials: 'KI' },
]

const initialMessages = [
  { id: 1, author: 'Mika', time: 'Today at 8:42 PM', text: 'I like the reading nook in your new home layout.', reaction: '✨  2' },
  { id: 2, author: 'Alex', time: 'Today at 8:44 PM', text: 'Thank you! I finally got the desk interaction working too. It links straight to the project.', mine: true },
  { id: 3, author: 'Mika', time: 'Today at 8:46 PM', text: 'Nice. Want to test the guestbook flow before we hop into a game?', reaction: '💜  1' },
]

function Button({ children, tone = 'default', className = '', onClick, disabled, title }: {
  children: React.ReactNode; tone?: 'default' | 'primary' | 'ghost' | 'danger'; className?: string;
  onClick?: () => void; disabled?: boolean; title?: string
}) {
  return <button title={title} disabled={disabled} onClick={onClick} className={`button ${tone} ${className}`}>{children}</button>
}

function Avatar({ person, size = 'md' }: { person: typeof people[number] | { name: string; color: string; status?: string; initials: string }, size?: 'sm' | 'md' | 'lg' }) {
  return <div className={`avatar ${size}`} style={{ background: person.color }}>
    {person.initials}<span className={`presence ${person.status || 'online'}`} />
  </div>
}

function Logo() {
  return <div className="logo" aria-label="STXIC Realm"><span /><i /></div>
}

function Welcome({ enter }: { enter: () => void }) {
  return <main className="welcome">
    <div className="welcome-brand"><Logo /><span>STXIC <strong>REALM</strong></span></div>
    <section className="welcome-copy">
      <h1>A place for your people.</h1>
      <p>Keep the conversation going, then step into a space of your own.</p>
      <Button tone="primary" onClick={enter}>Explore the demo <span aria-hidden="true">→</span></Button>
      <small>Interactive preview · Sample content · Nothing is saved</small>
    </section>
    <div className="welcome-scene"><div className="scene-caption"><span>YOUR SPACE</span><strong>Make yourself at home.</strong><p>A little room for the things you want to share.</p></div><PixelRoom compact /></div>
    <div className="welcome-foot">A space that’s yours.</div>
  </main>
}

function Rail({ view, setView }: { view: View; setView: (v: View) => void }) {
  const items: [View, Icon, string][] = [
    ['friends', Home, 'Home'], ['dm', MessageCircle, 'Messages'], ['spaces', LayoutGrid, 'Spaces'],
    ['home', Gamepad2, 'My Home'], ['settings', Settings, 'Settings'],
  ]
  return <nav className="rail">
    <Logo />
    <div className="rail-line" />
    {items.map(([id, I, label]) => <button key={id} aria-label={label} title={label} onClick={() => setView(id)} className={view === id ? 'active' : ''}><I size={20} /></button>)}
    <div className="rail-spacer" />
    <button aria-label="Notifications"><Bell size={20} /><b className="notification-dot" /></button>
  </nav>
}

function Account() {
  return <div className="account">
    <Avatar person={{ name: 'Alex', initials: 'AX', color: '#8b7cf6', status: 'online' }} size="sm" />
    <div><strong>Alex</strong><span>@alex</span></div>
    <Mic size={16} /><Settings size={16} />
  </div>
}

function AppShell({ view, setView, children, sidebar }: { view: View; setView: (v: View) => void; children: React.ReactNode; sidebar?: React.ReactNode }) {
  return <div className="app-shell">
    <Rail view={view} setView={setView} />
    {sidebar}
    <main className="workspace">{children}</main>
  </div>
}

function FriendsSidebar({ setView }: { setView: (v: View) => void }) {
  return <aside className="sidebar">
    <div className="side-title"><span>Home</span><Plus size={16} /></div>
    <button className="search"><Search size={15} /> Find a conversation</button>
    <div className="side-nav">
      <button className="selected"><Users size={17} /> Friends <span>4</span></button>
      <button onClick={() => setView('spaces')}><LayoutGrid size={17} /> Spaces</button>
      <button><Bell size={17} /> Activity <b>3</b></button>
    </div>
    <label className="section-label">DIRECT MESSAGES <Plus size={13} /></label>
    {people.map(p => <button className="person-row" key={p.name} onClick={() => setView('dm')}>
      <Avatar person={p} size="sm" /><span><strong>{p.name}</strong><small>{p.detail}</small></span>
    </button>)}
    <Account />
  </aside>
}

function Friends({ setView }: { setView: (v: View) => void }) {
  const [tab, setTab] = useState('All')
  const [query, setQuery] = useState('')
  const shown = people.filter(p => (tab === 'Online' ? p.status === 'online' : true) && `${p.name} ${p.handle}`.toLowerCase().includes(query.toLowerCase()))
  return <div className="page">
    <header className="topbar"><div className="title"><Users size={19} /><strong>Friends</strong></div><span className="demo-tag">DEMO PREVIEW</span></header>
    <div className="page-scroll friends-content">
      <div className="friends-heading"><div><h1>Your people</h1><p>Pick up a conversation or stop by a home.</p></div><Button onClick={() => setView('dm')}><MessageCircle size={16} /> Open messages</Button></div>
      <div className="friends-layout"><section className="friends-main" aria-label="Friends list">
        <div className="friends-controls"><div className="tabs">{['All', 'Online'].map(x => <button key={x} className={tab === x ? 'active' : ''} onClick={() => setTab(x)}>{x}</button>)}</div><label className="friend-search"><Search size={16}/><span className="sr-only">Search friends</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search friends" /></label></div>
        <div className="list-heading"><span>{tab === 'Online' ? 'ONLINE' : 'ALL FRIENDS'}</span><span>{shown.length}</span></div>
        <div className="friend-list">{shown.length ? shown.map(p => <div className="friend-card" key={p.name}>
          <Avatar person={p} /><div className="friend-info"><strong>{p.name}<span>{p.handle}</span></strong><small><i className={p.status} /> {p.status === 'dnd' ? 'Do not disturb' : p.status === 'away' ? 'Away' : 'Online'} · {p.detail}</small></div>
          <Button onClick={() => setView('dm')}><MessageCircle size={16} /> Message</Button><Button onClick={() => setView('home')} tone="ghost"><DoorOpen size={17} /> Preview home</Button>
        </div>) : <p className="empty-friends">No friends match your search.</p>}</div>
      </section><aside className="home-preview"><div className="preview-heading"><div><span>YOUR SPACE</span><h2>Your home</h2></div><Home size={18}/></div><div className="preview-room"><PixelRoom compact /></div><p>A place to share your projects, favorite things, and a little bit of yourself.</p><button className="preview-link" onClick={() => setView('home')}>Go to your home <span aria-hidden="true">→</span></button></aside></div>
    </div>
  </div>
}

function ChatSidebar({ setView }: { setView: (v: View) => void }) {
  return <aside className="sidebar">
    <div className="side-title"><span>Messages</span><Edit3 size={16} /></div>
    <button className="search"><Search size={15} /> Search conversations</button>
    <label className="section-label">RECENT</label>
    {people.map((p, i) => <button key={p.name} className={`person-row ${i === 0 ? 'selected' : ''}`} onClick={() => setView('dm')}>
      <Avatar person={p} size="sm" /><span><strong>{p.name}</strong><small>{i === 0 ? 'Want to test the guestbook…' : p.detail}</small></span>{i === 1 && <b className="unread">2</b>}
    </button>)}
    <Account />
  </aside>
}

function DirectMessage({ setView }: { setView: (v: View) => void }) {
  const [messages, setMessages] = useState(initialMessages)
  const [text, setText] = useState('')
  const [editing, setEditing] = useState<number | null>(null)
  const send = () => {
    if (!text.trim()) return
    setMessages([...messages, { id: Date.now(), author: 'Alex', time: 'Just now', text: text.trim(), mine: true }])
    setText('')
  }
  return <div className="chat-layout">
    <header className="topbar chat-head">
      <Avatar person={people[0]} size="sm" /><div><strong>Mika</strong><span><i /> Online</span></div>
      <div className="head-actions"><Button onClick={() => setView('home')}><DoorOpen size={16} /> Visit Home</Button><Button tone="ghost"><Bell size={18} /></Button><Button tone="ghost"><PanelRightClose size={18} /></Button></div>
    </header>
    <div className="messages">
      <div className="chat-intro"><Avatar person={people[0]} size="lg" /><h2>Mika</h2><p>This is the beginning of your conversation with <strong>@mika</strong>.</p><Button tone="ghost">View profile</Button></div>
      <div className="date-rule"><span>Today</span></div>
      {messages.map(m => <div className={`message ${m.mine ? 'mine' : ''}`} key={m.id}>
        <Avatar person={m.mine ? { name: 'Alex', initials: 'AX', color: '#8b7cf6', status: 'online' } : people[0]} size="sm" />
        <div className="message-body"><div><strong>{m.author}</strong><time>{m.time}</time>{m.mine && <span className="edited">{editing === m.id ? 'editing' : ''}</span>}</div>
          {editing === m.id ? <input autoFocus defaultValue={m.text} onKeyDown={e => { if (e.key === 'Enter') { setMessages(messages.map(x => x.id === m.id ? {...x, text: e.currentTarget.value } : x)); setEditing(null) } }} /> : <p>{m.text}</p>}
          {m.reaction && <button className="reaction">{m.reaction}</button>}
        </div>
        <div className="message-tools"><button title="React" onClick={() => setMessages(messages.map(x => x.id === m.id ? {...x, reaction: '💜  2'} : x))}><Smile size={15} /></button>{m.mine && <><button title="Edit" onClick={() => setEditing(m.id)}><Edit3 size={15} /></button><button title="Delete" onClick={() => setMessages(messages.filter(x => x.id !== m.id))}><Trash2 size={15} /></button></>}</div>
      </div>)}
      <div className="typing"><span /><span /><span /> Mika is typing</div>
    </div>
    <div className="composer">
      <Button tone="ghost"><Plus size={19} /></Button>
      <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder="Message @mika" />
      <button><Image size={18} /></button><button><Smile size={18} /></button><button onClick={send} className="send"><Send size={17} /></button>
    </div>
  </div>
}

function PixelRoom({ compact = false, onObject }: { compact?: boolean; onObject?: (name: string) => void }) {
  return <div className={`pixel-room ${compact ? 'compact' : ''}`}>
    <div className="wall"><div className="window"><i /><i /></div><div className="poster">STXIC<br/><small>REALM</small></div><div className="shelf"><i/><i/><i/><i/></div></div>
    <div className="floor">
      <button className="desk" onClick={() => onObject?.('Project desk')}><span className="monitor">›_</span><i /></button>
      <button className="plant" onClick={() => onObject?.('Moonleaf plant')}><i/><i/><i/><span /></button>
      <button className="couch" onClick={() => onObject?.('Velvet couch')}><i/><span/><span/></button>
      <div className="rug" />
      <button className="books" onClick={() => onObject?.('Trophy shelf')}><i/><i/><i/><i/></button>
      <button className="portal" onClick={() => onObject?.('Realm portal')}><i /></button>
      <div className="sprite alex"><span/><i/>Alex</div>
      {!compact && <div className="sprite mika"><span/><i/>Mika</div>}
      <div className="lamp"><i/><span/></div>
    </div>
  </div>
}

function HomeView({ setView }: { setView: (v: View) => void }) {
  const [object, setObject] = useState<string | null>(null)
  return <div className="world-page">
    <header className="world-top">
      <div><Button tone="ghost" onClick={() => setView('dm')}>← Back to chat</Button><span className="divider"/><strong>Alex’s Home</strong><span className="privacy"><Shield size={12}/> Friends only</span></div>
      <div><span className="visitors"><Users size={15}/> 2 visiting</span><Button onClick={() => setView('studio')}><Palette size={16}/> Home Studio</Button><Button tone="danger">Leave room</Button></div>
    </header>
    <div className="world-stage">
      <div className="world-label"><span>WELCOME TO</span><h2>Alex’s night loft</h2><p>Click an object to interact</p></div>
      <PixelRoom onObject={setObject} />
      <div className="world-actions"><Button><BookOpen size={16}/> Guestbook <b>12</b></Button><Button><Volume2 size={16}/> Lo-fi orbit</Button><Button><Wifi size={16}/> Connected</Button></div>
    </div>
    {object && <div className="modal-backdrop" onClick={() => setObject(null)}><div className="object-modal" onClick={e => e.stopPropagation()}>
      <div className="object-icon"><Sparkles /></div><div><span>INTERACTIVE OBJECT</span><h3>{object}</h3><p>{object === 'Project desk' ? 'A tidy setup linked to Alex’s current project: Realm UI Kit.' : 'A carefully placed part of Alex’s cozy night loft.'}</p></div>
      <Button tone="primary">{object === 'Project desk' ? 'Open project' : 'Interact'}</Button><Button onClick={() => setObject(null)}>Close</Button>
    </div></div>}
  </div>
}

function Spaces({ setView }: { setView: (v: View) => void }) {
  const [channel, setChannel] = useState('general')
  return <div className="space-layout">
    <aside className="channel-side"><div className="space-name"><span className="space-icon">DL</span><strong>The Dev Lounge</strong><ChevronDown size={16}/></div>
      <Button className="hall-button" onClick={() => setView('home')}><DoorOpen size={16}/> Enter Server Hall</Button>
      <label>TEXT CHANNELS <Plus size={13}/></label>
      {['general','projects','gaming','announcements'].map((c,i) => <button key={c} onClick={() => setChannel(c)} className={channel === c ? 'active' : ''}><Hash size={17}/>{c}{i===1 && <b>3</b>}</button>)}
      <div className="space-bottom"><Settings size={16}/> Space settings</div>
    </aside>
    <section className="space-chat"><header className="topbar"><Hash size={19}/><strong>{channel}</strong><span>Talk, share, and build together.</span><div className="head-actions"><Users size={18}/><Search size={18}/></div></header>
      <div className="messages"><div className="channel-intro"><div><Hash size={28}/></div><h2>Welcome to #{channel}</h2><p>This is the start of the #{channel} channel in The Dev Lounge.</p></div>
        {initialMessages.slice(0,2).map((m,i) => <div key={m.id || i} className="message"><Avatar person={people[i]} size="sm"/><div className="message-body"><div><strong>{people[i].name}</strong><time>{m.time}</time></div><p>{i ? 'The new navigation pass is ready for feedback. I kept the interactions really lightweight.' : 'Hey everyone — cozy coding session tonight? I’ll be in the hall around nine.'}</p></div></div>)}
      </div><div className="composer"><Button tone="ghost"><Plus size={19}/></Button><input placeholder={`Message #${channel}`}/><button><Smile size={18}/></button><button className="send"><Send size={17}/></button></div>
    </section>
    <aside className="members"><label>FRIENDS — 4</label>{people.map(p => <div key={p.name} className="member"><Avatar person={p} size="sm"/><span><strong>{p.name}</strong><small>{p.detail}</small></span></div>)}</aside>
  </div>
}

function Studio({ setView }: { setView: (v: View) => void }) {
  const [selected, setSelected] = useState('Velvet couch')
  const [saved, setSaved] = useState(false)
  const items = [['Velvet couch','▰'],['Moonleaf plant','♠'],['Orbit lamp','◉'],['Project desk','▤'],['Realm portal','◌'],['Trophy shelf','▥']]
  return <div className="studio">
    <header className="topbar"><Button tone="ghost" onClick={() => setView('home')}>← Exit studio</Button><div className="title"><Palette size={18}/><strong>Home Studio</strong><span>{saved ? 'All changes saved' : 'Unsaved changes'}</span></div><div className="head-actions"><Button><Undo2 size={16}/></Button><Button disabled><RotateCcw size={16}/></Button><Button onClick={() => setView('home')}>Preview</Button><Button tone="primary" onClick={() => setSaved(true)}><Check size={16}/> Save changes</Button></div></header>
    <div className="studio-body"><aside className="catalog"><div className="input"><Search size={15}/>Search furniture</div><div className="category-tabs"><button className="active">All</button><button>Furniture</button><button>Decor</button></div><label>MY ITEMS — 24</label><div className="catalog-grid">{items.map(([name,icon]) => <button key={name} onClick={() => {setSelected(name);setSaved(false)}} className={selected===name?'active':''}><span>{icon}</span><strong>{name}</strong><small>1 available</small></button>)}</div></aside>
      <div className="editor-canvas"><div className="grid-overlay"/><PixelRoom onObject={setSelected}/><div className="zoom">− <span>100%</span> +</div></div>
      <aside className="inspector"><span>SELECTED OBJECT</span><div className="item-preview">▰</div><h3>{selected}</h3><p>A cozy statement piece with soft, low-profile cushions.</p><label>POSITION</label><div className="coords"><span>X <b>8</b></span><span>Y <b>6</b></span></div><div className="inspector-buttons"><Button><RotateCcw size={16}/> Rotate</Button><Button tone="danger"><Trash2 size={16}/> Remove</Button></div><small className="hint">Tip: drag an item on the canvas to reposition it.</small></aside>
    </div>
  </div>
}

function SettingsView() {
  const [light, setLight] = useState(false)
  const [privacy, setPrivacy] = useState('Friends only')
  return <div className={`settings-page ${light ? 'light-preview' : ''}`}><aside className="settings-nav"><strong>SETTINGS</strong>{['My Account','Profile','Appearance','Accessibility','Notifications','Privacy & Safety','Friends & Blocked','Home Privacy'].map((x,i)=><button key={x} className={i===2?'active':''}>{x}</button>)}</aside>
    <div className="settings-content"><h2>Appearance</h2><p>Make Realm feel comfortable and familiar.</p>
      <section><h3>Theme</h3><div className="choice-grid"><button className={!light?'selected':''} onClick={()=>setLight(false)}><i className="theme dark"/><strong>Obsidian</strong><small>Easy on the eyes</small></button><button className={light?'selected':''} onClick={()=>setLight(true)}><i className="theme light"/><strong>Mist</strong><small>Bright and clean</small></button></div></section>
      <section><h3>Accent color</h3><div className="swatches">{['#a78bfa','#65d6ad','#74b9ff','#f59eaf','#f4bf75'].map((x,i)=><button key={x} className={i===0?'active':''} style={{background:x}}/>)}</div></section>
      <section><h3>Home privacy</h3><p>Choose who can visit your personal home.</p><div className="segmented">{['Private','Friends only','Invite only'].map(x=><button key={x} className={privacy===x?'active':''} onClick={()=>setPrivacy(x)}>{x}</button>)}<button disabled>Public <small>Alpha unavailable</small></button></div></section>
      <div className="settings-save"><span><Check size={15}/> Preferences update instantly in this demo</span><Button tone="primary">Save preferences</Button></div>
    </div></div>
}

export default function App() {
  const [signedIn, setSignedIn] = useState(false)
  const [view, setView] = useState<View>('friends')
  if (!signedIn) return <Welcome enter={() => setSignedIn(true)} />
  if (view === 'home') return <AppShell view={view} setView={setView}><HomeView setView={setView}/></AppShell>
  if (view === 'studio') return <AppShell view="home" setView={setView}><Studio setView={setView}/></AppShell>
  if (view === 'spaces') return <AppShell view={view} setView={setView}><Spaces setView={setView}/></AppShell>
  if (view === 'settings') return <AppShell view={view} setView={setView}><SettingsView/></AppShell>
  return <AppShell view={view} setView={setView} sidebar={view === 'dm' ? <ChatSidebar setView={setView}/> : <FriendsSidebar setView={setView}/>}>
    {view === 'dm' ? <DirectMessage setView={setView}/> : <Friends setView={setView}/>}
  </AppShell>
}

import { useEffect, useState, type CSSProperties } from 'react'
import { Icon } from './Icon'
import { PixelCharacter } from './AppearanceStudio'
import { readAppearance } from './appearance'
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
 const [query, setQuery] = useState('')
 const [page, setPage] = useState(0)
 const [ambient, setAmbient] = useState(true)
 const [appearance] = useState(readAppearance)
 const { session } = useAccount()
 const { layout, error: layoutError } = useHall(session?.user.id)
 const selectedSpace = spaces.find(s => s.id === selected)
 const channels = allChannels.filter(c => c.space_id === selected)
 const filtered = spaces.filter(s => s.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
 const pages = Math.max(1, Math.ceil(spaces.length / 3))
 const visible = spaces.slice(page * 3, page * 3 + 3)
 const slot = visible.findIndex(s => s.id === selected)
 const activeChannels = channels.filter(c => !c.archived_at)
 const destination = selectedSpace && !selectedSpace.closed_at
  ? `/?space=${encodeURIComponent(selectedSpace.id)}${activeChannels[0] ? `&channel=${encodeURIComponent(activeChannels[0].id)}` : ''}` : null

 useEffect(() => {
  const index = spaces.findIndex(s => s.id === selected)
  if (index >= 0) setPage(Math.floor(index / 3))
 }, [selected])
 useEffect(() => { if (page >= pages) setPage(pages - 1) }, [page, pages])

 return <section className="server-hall" aria-labelledby="hall-heading">
  <div className="hall-introduction">
   <div><h1 id="hall-heading">Server Halls<span aria-hidden="true">.</span></h1><p>A door to your people. A place to belong.</p></div>
   <div className="hall-intro-actions"><a href="#hall-management" onClick={onManage}><Icon name="person" />Join a server</a><a className="hall-primary" href="#hall-management" onClick={onManage}><Icon name="plus" />Create a server</a></div>
  </div>
  {preview && <p className="hall-preview-note"><Icon name="compass" /><span>Hall preview · These three servers are illustrative. <a href="/">Sign in to find your own.</a></span></p>}
  {layoutError && <p className="hall-layout-warning" role="status">{layoutError}</p>}
  <div className="hall-layout">
   <div className="hall-world">
    <div className="hall-world-top"><span><Icon name="hall" /><strong>{worldPalettes[layout.theme].name}</strong></span><div className="hall-scene-tools"><a href="/?hall-studio"><Icon name="studio"/>Customize hall</a><button type="button" className="hall-ambience" aria-pressed={ambient} onClick={() => setAmbient(!ambient)}><Icon name="sun" />Ambient effects <span>{ambient ? 'On' : 'Off'}</span></button></div></div>
    <div className={`hall-scene ${ambient ? 'has-ambience' : ''}`} aria-label="A pixel-art gathering hall. Select a server entrance or use the directory.">
     <HallCanvas layout={layout}/>
     <div className="hall-firelight" aria-hidden="true" />
     {ambient && <div className="hall-embers" aria-hidden="true"><WorldAmbience width={768} height={512} hearths={layout.pieces.filter(p=>p.kind==='hearth').map(p=>({x:p.x*32,y:p.y*32}))}/></div>}
     <div className="hall-entrances" aria-label="Server entrances" aria-busy={loading}>
      {visible.map((space, i) => <button key={space.id} type="button" className={`hall-entrance entrance-${i} ${hallTheme(space.id)}`} aria-pressed={selected === space.id} aria-label={`Select ${space.name}${space.closed_at ? ', closed' : space.archived_at ? ', archived' : ''}`} onClick={() => onSelect(space.id)}>
       <span className="entrance-outline" aria-hidden="true" />
       <span className="entrance-name"><ServerCrest theme={hallTheme(space.id)} /><span><strong>{space.name}</strong><small>{space.closed_at ? 'Closed' : space.archived_at ? 'Archived' : selected === space.id ? 'Selected · enter below' : 'Select entrance'}</small></span></span>
      </button>)}
     </div>
     {!loading && !error && !spaces.length && <div className="hall-scene-message"><Icon name="hall" /><strong>Your story starts here.</strong><span>Create a server or bring an invitation.</span></div>}
     {loading && <div className="hall-scene-message" role="status"><Icon name="hall" /><strong>Lighting the lanterns…</strong><span>Finding your servers.</span></div>}
     <div className="hall-traveler" style={{ '--traveler-x': slot < 0 ? '50%' : `${25 + slot * 25}%` } as CSSProperties}><PixelCharacter value={appearance} /><span>You</span></div>
     <div className="hall-location"><Icon name="compass" /><span>The crossroads of your Realm</span></div>
     {pages > 1 && <div className="hall-scene-pagination" aria-label="Hall wings"><button aria-label="Previous hall wing" disabled={page === 0} onClick={() => setPage(p => p - 1)}><Icon name="back" /></button><span>Wing {page + 1} / {pages}</span><button aria-label="Next hall wing" disabled={page + 1 === pages} onClick={() => setPage(p => p + 1)}><Icon name="arrow" /></button></div>}
    </div>
    <div className="hall-world-bottom"><span><Icon name="compass" />Choose a door. Your next conversation is inside.</span><a href={preview ? '/?room-preview' : '/?appearance'}>{preview ? 'Explore a home' : 'Customize your traveler'}<Icon name="arrow" /></a></div>
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
    <div className="hall-directory-foot"><Icon name="shield" /><p>Only servers you belong to appear here.<br />Have an invitation? <a href="#hall-management" onClick={onManage}>Join your people.</a></p></div>
   </aside>
  </div>
  <nav className="hall-wayfinding" aria-label="Around the Realm"><a href={session ? `/?home=${session.user.id}` : '/?room-preview'}><Icon name="home" /><span><strong>A room of your own</strong><small>Step away from the great hall</small></span><Icon name="arrow" /></a><a href="/?appearance"><Icon name="avatar" /><span><strong>Dress for the journey</strong><small>Make your traveler your own</small></span><Icon name="arrow" /></a></nav>
 </section>
}

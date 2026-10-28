import { useEffect, useRef, useState, type FormEvent } from 'react'
import { AccountGate, useAccount } from './Account'
import { errorText, rpc } from './account-repository'
import { client, type Channel } from './data'
import { listChannels, listSpaces, roleRank, membershipToken, type Space, type SpaceData } from './space-repository'
import { WorkspaceNav } from './WorkspaceNav'

function RealmCastleBanner() {
 return (
  <svg className="castle-hero-art" viewBox="0 0 320 120" shapeRendering="crispEdges" aria-hidden="true">
   {/* Deep night sky & stars */}
   <rect x="0" y="0" width="320" height="120" fill="#171528" />
   <rect x="0" y="42" width="320" height="44" fill="#241e3d" />
   <rect x="0" y="76" width="320" height="44" fill="#1b1830" />
   {/* Crescent moon */}
   <rect x="152" y="16" width="16" height="16" fill="#e9d8fd" />
   <rect x="158" y="14" width="12" height="12" fill="#171528" />
   {/* Twinkling stars */}
   <rect x="28" y="14" width="2" height="2" fill="#ffffff" />
   <rect x="74" y="22" width="2" height="2" fill="#b794f4" />
   <rect x="118" y="12" width="2" height="2" fill="#ffffff" />
   <rect x="196" y="18" width="2" height="2" fill="#fbd38d" />
   <rect x="234" y="10" width="2" height="2" fill="#ffffff" />
   {/* Distant mountain silhouettes */}
   <rect x="90" y="58" width="80" height="28" fill="#1f1b36" />
   <rect x="110" y="50" width="44" height="8" fill="#1f1b36" />
   {/* Grand Moonlit Pixel Castle on the right */}
   <rect x="210" y="34" width="96" height="54" fill="#231d38" />
   <rect x="224" y="20" width="24" height="68" fill="#2d2547" />
   <rect x="230" y="10" width="12" height="10" fill="#3b305c" />
   <rect x="234" y="4" width="4" height="6" fill="#554380" />
   <rect x="256" y="14" width="28" height="74" fill="#282040" />
   <rect x="262" y="6" width="16" height="8" fill="#3b305c" />
   <rect x="268" y="1" width="4" height="5" fill="#6b539c" />
   <rect x="288" y="26" width="18" height="62" fill="#1e1830" />
   {/* Warm glowing castle windows */}
   <rect x="233" y="26" width="3" height="6" fill="#fbd38d" />
   <rect x="233" y="38" width="3" height="6" fill="#f6ad55" />
   <rect x="266" y="22" width="4" height="7" fill="#fbd38d" />
   <rect x="274" y="22" width="4" height="7" fill="#fbd38d" />
   <rect x="268" y="36" width="6" height="8" fill="#f6ad55" />
   <rect x="294" y="36" width="3" height="6" fill="#fbd38d" />
   {/* Arched stone bridge & water reflections */}
   <rect x="148" y="68" width="96" height="18" fill="#382e57" />
   <rect x="148" y="66" width="96" height="3" fill="#5e4f87" />
   <rect x="156" y="74" width="12" height="12" fill="#171528" />
   <rect x="176" y="74" width="12" height="12" fill="#171528" />
   <rect x="196" y="74" width="12" height="12" fill="#171528" />
   <rect x="216" y="74" width="12" height="12" fill="#171528" />
   {/* Shimmering moonlit lake */}
   <rect x="110" y="86" width="210" height="34" fill="#141326" />
   <rect x="164" y="92" width="38" height="2" fill="#554380" />
   <rect x="172" y="98" width="26" height="2" fill="#805ad5" />
   <rect x="228" y="94" width="46" height="2" fill="#b7791f" />
   <rect x="236" y="100" width="30" height="2" fill="#f6ad55" />
   {/* Foreground cliff & caped adventurer silhouette */}
   <rect x="0" y="88" width="126" height="32" fill="#121020" />
   <rect x="16" y="82" width="92" height="8" fill="#1d1930" />
   <rect x="68" y="58" width="14" height="26" fill="#121020" />
   <rect x="62" y="66" width="18" height="18" fill="#292242" />
   <rect x="70" y="52" width="10" height="8" fill="#181426" />
   <rect x="66" y="70" width="4" height="4" fill="#b794f4" />
  </svg>
 )
}

export default function SpacesPage() {
 return (
  <AccountGate>
   <Spaces />
  </AccountGate>
 )
}
function Spaces() {
 const account = useAccount(),
  user = account.session!.user.id
 const [spaces, setSpaces] = useState<Space[]>([]),
  [selected, setSelected] = useState(''),
  [channels, setChannels] = useState<Channel[]>([]),
  [data, setData] = useState<SpaceData | null>(null),
  [name, setName] = useState(''),
  [rename, setRename] = useState(''),
  [channelName, setChannelName] = useState(''),
  [email, setEmail] = useState(''),
  [token, setToken] = useState(() => new URLSearchParams(location.search).get('invite') ?? ''),
  [grant, setGrant] = useState(''),
  [error, setError] = useState(''),
  [notice, setNotice] = useState(''),
  [busy, setBusy] = useState(false),
  [loading, setLoading] = useState(true)
 const serial = useRef(0),
  alive = useRef(true)
 const space = spaces.find(s => s.id === selected),
  myRole = data?.members.find(m => m.user_id === user)?.role,
  rank = roleRank(myRole),
  enabled = account.access?.administration === true,
  canManage = rank >= 3 && enabled && !space?.closed_at
 async function load() {
  const ticket = ++serial.current
  const rows = await listSpaces(client!)
  if (!alive.current || ticket !== serial.current) return
  setSpaces(rows)
  setSelected(current => (rows.some(s => s.id === current) ? current : (rows[0]?.id ?? '')))
  setLoading(false)
 }
 async function detail() {
  if (!selected) return
  const ticket = ++serial.current
  try {
   const [rows, d] = await Promise.all([listChannels(client!, selected), rpc<SpaceData>(client!, 'space_admin_data', { p_space: selected })])
   if (!alive.current || ticket !== serial.current) return
   setChannels(rows)
   setData(d)
  } catch (e) {
   if (alive.current && ticket === serial.current) {
    setData(null)
    setChannels([])
    setError(errorText(e))
   }
  }
 }
 useEffect(() => {
  alive.current = true
  if (location.search.includes('invite=')) history.replaceState(null, '', '/?spaces')
  void load().catch(e => {
   setError(errorText(e))
   setLoading(false)
  })
  const timer = setInterval(
   () =>
    void load().catch(e => {
     setData(null)
     setChannels([])
     setError(errorText(e))
    }),
   15000,
  )
  return () => {
   alive.current = false
   serial.current++
   clearInterval(timer)
  }
 }, [])
 useEffect(() => {
  setData(null)
  setChannels([])
  setGrant('')
  setRename(space?.name ?? '')
  void detail()
 }, [selected])
 useEffect(() => {
  if (selected) void detail()
 }, [spaces])
 async function action(name: string, args: Record<string, unknown>, message: string) {
  if (busy) return
  setBusy(true)
  setError('')
  setNotice('')
  try {
   const result = await rpc<unknown>(client!, name, args)
   await load()
   await detail()
   setNotice(message)
   return result
  } catch (e) {
   setError(errorText(e))
  } finally {
   setBusy(false)
  }
 }
 async function create(e: FormEvent) {
  e.preventDefault()
  const id = await action('manage_space', { p_action: 'create', p_name: name }, 'Space created.')
  if (typeof id === 'string') {
   setSelected(id)
   setName('')
  }
 }
 async function invite(e: FormEvent) {
  e.preventDefault()
  setGrant('')
  const value = await action('membership_invite', { p_action: 'create', p_space: selected, p_email: email }, 'Invitation created. Share the one-time link with its recipient.')
  if (value && typeof value === 'object' && 'token' in value) setGrant(`${location.origin}/?spaces&invite=${String(value.token)}`)
 }
 async function manage(p_action: string, extra: Record<string, unknown> = {}) {
  if (
   ['archive', 'transfer', 'remove', 'leave'].includes(p_action) &&
   !confirm(`${p_action === 'transfer' ? 'Transfer ownership' : p_action === 'remove' ? 'Remove this member' : p_action === 'leave' ? 'Leave this space' : 'Archive this space'}?`)
  )
   return
  await action('manage_space', { p_action, p_space: selected, p_revision: space?.revision, ...extra }, 'Space updated.')
 }
 return (
  <main className="workspace-page">
   <WorkspaceNav current="spaces" />
   <header className="workspace-header">
    <strong>Your spaces</strong>
    <a href="/">Back to chat</a>
   </header>
   <div className="social-content admin-content">
    <div className="castle-hero">
     <RealmCastleBanner />
     <div className="castle-hero-copy">
      <span className="castle-eyebrow">WELCOME TO STXIC REALM</span>
      <h1>Make room for your people.</h1>
      <p>Chat. Build. Explore. Together.</p>
     </div>
    </div>
    <nav className="admin-links" aria-label="Administration">
     <a href="/?privacy">Privacy & data</a>
     {account.access?.platform_admin && <a href="/?platform">Platform administration</a>}
    </nav>
    {!enabled && <p className="muted" role="status">Space administration is awaiting operator setup. Existing conversations remain available.</p>}
    {error && <p className="error" role="alert">{error}</p>}
    <p role="status">{notice || (loading ? 'Loading spaces…' : '')}</p>
    <section className="admin-section">
     <h2>Join a space</h2>
     <form
      className="admin-fields"
      onSubmit={e => {
       e.preventDefault()
       void action('membership_invite', { p_action: 'redeem', p_token: token }, 'You joined the space.').then(v => {
        if (v) {
         setToken('')
         if (typeof v === 'object' && 'space_id' in v) setSelected(String(v.space_id))
        }
       })
      }}
     >
      <label>
       Membership invitation
       <input value={token} onChange={e => setToken(membershipToken(e.target.value))} autoComplete="off" maxLength={500} required />
      </label>
      <button disabled={busy || !enabled || !token}>Accept invitation</button>
     </form>
    </section>
    <section className="admin-section">
     <h2>Create a space</h2>
     <form className="admin-fields" onSubmit={create}>
      <label>
       Space name
       <input required maxLength={80} value={name} onChange={e => setName(e.target.value)} />
      </label>
      <button disabled={busy || !enabled || !name.trim()}>Create space</button>
     </form>
    </section>
    {!loading && !spaces.length && <p className="social-empty">You have no spaces yet. Create one or accept a membership invitation.</p>}
    {spaces.length > 0 && (
     <section className="admin-section">
      <div className="space-cards-grid" aria-label="Your spaces">
       {spaces.map((s, idx) => (
        <button
         key={s.id}
         type="button"
         className={`space-visual-card theme-${idx % 4}`}
         aria-pressed={selected === s.id}
         onClick={() => setSelected(s.id)}
        >
         <span className="space-card-scene" aria-hidden="true" />
         <strong>{s.name}</strong>
         <small>{s.archived_at ? 'Archived space' : 'Active space'}</small>
        </button>
       ))}
      </div>
      <label>
       Manage space
       <select value={selected} onChange={e => setSelected(e.target.value)}>
        {spaces.map(s => (
         <option key={s.id} value={s.id}>
          {s.name}
          {s.archived_at ? ' · archived' : ''}
         </option>
        ))}
       </select>
      </label>
      {space && (
       <>
        <div className="admin-row">
         <h2>{space.name}</h2>
         <span className="muted">
          {myRole ?? 'Loading membership…'}
          {space.closed_at ? ' · permanently closed' : space.archived_at ? ' · archived' : ''}
         </span>
        </div>
        {rank >= 2 && <a href={`/?moderation&space=${selected}`}>Review space reports</a>}
        {canManage && (
         <form
          className="admin-fields"
          onSubmit={e => {
           e.preventDefault()
           void manage('rename', { p_name: rename })
          }}
         >
          <label>
           Space name
           <input maxLength={80} required value={rename} onChange={e => setRename(e.target.value)} />
          </label>
          <button disabled={busy}>Rename space</button>
          {myRole === 'owner' && (
           <button type="button" disabled={busy} onClick={() => void manage(space.archived_at ? 'restore' : 'archive')}>
            {space.archived_at ? 'Restore space' : 'Archive space'}
           </button>
          )}
         </form>
        )}
        <h3>Channels</h3>
        {channels.map(c => (
         <ChannelRow key={`${c.id}:${c.revision}`} channel={c} canManage={canManage && !space.archived_at} busy={busy} action={action} />
        ))}
        {canManage && !space.archived_at && (
         <form
          className="admin-fields"
          onSubmit={e => {
           e.preventDefault()
           void action('manage_channel', { p_action: 'create', p_space: selected, p_name: channelName }, 'Channel created.').then(v => {
            if (v) setChannelName('')
           })
          }}
         >
          <label>
           New channel name
           <input required maxLength={80} value={channelName} onChange={e => setChannelName(e.target.value)} />
          </label>
          <button disabled={busy}>Create channel</button>
         </form>
        )}
        <h3>Members</h3>
        {data?.members.map(m => (
         <div className="admin-row" key={m.user_id}>
          <div>
           <strong>{m.name}</strong>
           <p className="muted">
            @{m.username} · {m.role}
            {m.user_id === user ? ' · you' : ''}
           </p>
          </div>
          {canManage && !space.archived_at && m.user_id !== user && roleRank(m.role) < rank && (
           <div className="social-actions">
            <label className="sr-only" htmlFor={`role-${m.user_id}`}>
             Role for {m.name}
            </label>
            <select id={`role-${m.user_id}`} value={m.role} disabled={busy} onChange={e => void manage('role', { p_target: m.user_id, p_role: e.target.value })}>
             <option value="member">Member</option>
             <option value="moderator">Moderator</option>
             {myRole === 'owner' && <option value="admin">Admin</option>}
            </select>
            <button disabled={busy} onClick={() => void manage('remove', { p_target: m.user_id })}>
             Remove
            </button>
            {myRole === 'owner' && (
             <button disabled={busy} onClick={() => void manage('transfer', { p_target: m.user_id })}>
              Transfer ownership
             </button>
            )}
           </div>
          )}
         </div>
        ))}
        {canManage && !space.archived_at && (
         <>
          <h3>Invite an existing Realm account</h3>
          <form className="admin-fields" onSubmit={invite}>
           <label>
            Verified email
            <input type="email" autoComplete="off" required value={email} onChange={e => setEmail(e.target.value)} />
           </label>
           <button disabled={busy}>Create / replace invitation</button>
          </form>
          <p className="muted">Membership invitations grant member access only. A replacement revokes the previous application token.</p>
          {grant && (
           <label>
            One-time invitation link
            <input readOnly value={grant} onFocus={e => e.currentTarget.select()} />
           </label>
          )}
          {data?.invites
           .filter(i => !i.accepted_at && !i.revoked_at && Date.parse(i.expires_at) > Date.now())
           .map(i => (
            <div className="admin-row" key={i.id}>
             <span>
              Account {i.target.slice(0, 8)} · Expires {new Date(i.expires_at).toLocaleDateString()}
             </span>
             <button disabled={busy} onClick={() => void action('membership_invite', { p_action: 'revoke', p_space: selected, p_invite: i.id }, 'Invitation revoked.')}>
              Revoke
             </button>
            </div>
           ))}
         </>
        )}
        {rank >= 2 && data?.restrictions.length !== 0 && (
         <>
          <h3>Active restrictions</h3>
          {data?.restrictions.map(r => (
           <RestrictionRow key={r.id} restriction={r} disabled={busy || (r.kind === 'ban' && rank < 3)} action={action} />
          ))}
         </>
        )}
        {myRole && myRole !== 'owner' && (
         <button disabled={busy || !enabled} onClick={() => void manage('leave')}>
          Leave this space
         </button>
        )}
       </>
      )}
     </section>
    )}
   </div>
  </main>
 )
}
function ChannelRow({
 channel: c,
 canManage,
 busy,
 action,
}: {
 channel: Channel
 canManage: boolean
 busy: boolean
 action: (name: string, args: Record<string, unknown>, message: string) => Promise<unknown>
}) {
 const [name, setName] = useState(c.name)
 return (
  <form
   className="admin-row"
   onSubmit={e => {
    e.preventDefault()
    void action('manage_channel', { p_action: 'rename', p_space: c.space_id, p_channel: c.id, p_name: name, p_revision: c.revision }, 'Channel renamed.')
   }}
  >
   {canManage ? (
    <>
     <label>
      Channel name
      <input required maxLength={80} value={name} onChange={e => setName(e.target.value)} />
     </label>
     <div className="social-actions">
      <button disabled={busy}>Rename</button>
      <button
       type="button"
       disabled={busy}
       onClick={() => {
        if (c.archived_at || confirm('Archive this channel? Its history remains visible.'))
         void action('manage_channel', { p_action: c.archived_at ? 'restore' : 'archive', p_space: c.space_id, p_channel: c.id, p_revision: c.revision }, 'Channel updated.')
       }}
      >
       {c.archived_at ? 'Restore' : 'Archive'}
      </button>
     </div>
    </>
   ) : (
    <span>
     #{c.name}
     {c.archived_at ? ' · archived' : ''}
    </span>
   )}
  </form>
 )
}
function RestrictionRow({
 restriction: r,
 disabled,
 action,
}: {
 restriction: import('./space-repository').Restriction
 disabled: boolean
 action: (name: string, args: Record<string, unknown>, message: string) => Promise<unknown>
}) {
 const [reason, setReason] = useState('')
 return (
  <form
   className="admin-row"
   onSubmit={e => {
    e.preventDefault()
    void action('lift_restriction', { p_restriction: r.id, p_reason: reason }, 'Restriction lifted.')
   }}
  >
   <div>
    <strong>
     {r.kind} · {r.user_id.slice(0, 8)}
    </strong>
    <p className="muted">
     {r.reason} · Until {new Date(r.expires_at).toLocaleString()}
    </p>
   </div>
   <label>
    Reason to lift
    <input required maxLength={500} value={reason} onChange={e => setReason(e.target.value)} />
   </label>
   <button disabled={disabled}>Lift restriction</button>
  </form>
 )
}

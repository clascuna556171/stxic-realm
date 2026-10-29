import { useEffect, useRef, useState, type FormEvent } from 'react'
import { AccountGate, useAccount } from './Account'
import { errorText, rpc } from './account-repository'
import { client, type Channel } from './data'
import { listChannels, listSpaces, roleRank, membershipToken, type Space, type SpaceData } from './space-repository'
import { WorkspaceNav } from './WorkspaceNav'
import { ServerHall } from './ServerHall'

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
  [loading, setLoading] = useState(true),
  [detailsLoading, setDetailsLoading] = useState(false)
 const listSerial = useRef(0), detailSerial = useRef(0),
  alive = useRef(true), management = useRef<HTMLDetailsElement>(null)
 const space = spaces.find(s => s.id === selected),
  myRole = data?.members.find(m => m.user_id === user)?.role,
  rank = roleRank(myRole),
  enabled = account.access?.administration === true,
  canManage = rank >= 3 && enabled && !space?.closed_at
 async function load() {
  const ticket = ++listSerial.current
  const rows = await listSpaces(client!)
  if (!alive.current || ticket !== listSerial.current) return
  setSpaces(rows)
  setSelected(current => (rows.some(s => s.id === current) ? current : (rows[0]?.id ?? '')))
  setLoading(false)
  setError('')
 }
 async function detail() {
  if (!selected) return
  const ticket = ++detailSerial.current
  setDetailsLoading(true)
  try {
   const [rows, d] = await Promise.all([listChannels(client!, selected), rpc<SpaceData>(client!, 'space_admin_data', { p_space: selected })])
   if (!alive.current || ticket !== detailSerial.current) return
   setChannels(rows)
   setData(d)
   setError('')
  } catch (e) {
   if (alive.current && ticket === detailSerial.current) {
    setData(null)
    setChannels([])
    setError(errorText(e))
   }
  } finally { if (alive.current && ticket === detailSerial.current) setDetailsLoading(false) }
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
   listSerial.current++
   detailSerial.current++
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
  <main className="workspace-page halls-page">
   <WorkspaceNav current="spaces" />
   <header className="workspace-header">
    <div><span>Realm</span><span className="header-divider">/</span><strong>Server Halls</strong></div>
    <a href="/">Back to chat</a>
   </header>
   <div className="halls-content">
    <ServerHall spaces={spaces} selected={selected} onSelect={setSelected} channels={channels} loading={loading} detailsLoading={detailsLoading} error={!spaces.length ? error : undefined} onManage={() => { if (management.current) management.current.open = true }} onRetry={() => { setError(''); setLoading(true); void load().catch(e => { setError(errorText(e)); setLoading(false) }) }} />
    {error && spaces.length > 0 && <p className="error" role="alert">{error}</p>}
    <p role="status">{notice}</p>
    <details ref={management} className="hall-management" id="hall-management" open={token ? true : undefined}>
    <summary>Manage spaces <span>Invitations, channels, members & server settings</span></summary>
    <div className="admin-content">
    <nav className="admin-links" aria-label="Administration">
     <a href="/?privacy">Privacy & data</a>
     {account.access?.platform_admin && <a href="/?platform">Platform administration</a>}
    </nav>
    {!enabled && <p className="muted" role="status">Space administration is awaiting operator setup. Existing conversations remain available.</p>}
    {error && <p className="error" role="alert">{error}</p>}
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
    </details>
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

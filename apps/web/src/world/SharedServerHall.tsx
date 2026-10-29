import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { AccountGate } from '../Account'
import { rpc, errorText } from '../account-repository'
import { client, type Channel } from '../data'
import { listChannels, type SpaceData } from '../space-repository'
import { WorkspaceNav } from '../WorkspaceNav'
import { HallCanvas } from './HallCanvas'
import { HallSceneBoundary } from './HallSceneBoundary'
import { HallEditor } from './HallStudio'
import { WorldAmbience } from './WorldAmbience'
import { getSharedHall, useSocialSnapshot, type SharedHallState, type Announcement } from './social-repository'
import type { HallLayout } from './hall-layout'
import './social-world.css'

export default function SharedServerHall({ space }: { space: string }) {
 return <AccountGate><SharedHall key={space} space={space}/></AccountGate>
}
function SharedHall({ space }: { space: string }) {
 const load = useCallback(() => getSharedHall(space), [space])
 const { data, error, refresh, apply } = useSocialSnapshot(load)
 const protectedForms = useRef<SharedHallState | null>(null)
 if(data) protectedForms.current = data
 const formState = data ?? protectedForms.current
 const [editing, setEditing] = useState(false), [busy, setBusy] = useState(false), [notice, setNotice] = useState(''), [ambient, setAmbient] = useState(true)
 async function mutate(action: string, args: Record<string, unknown> = {}) {
  if (!data || busy) return; setBusy(true); setNotice('')
  try { const next = await rpc<SharedHallState>(client!, 'manage_server_hall', { p_space: space, p_action: action, p_revision: data.revision, ...args }); apply(next); setNotice('Shared hall updated.'); return next }
  catch (e) { setNotice(errorText(e)); void refresh().catch(() => {}) }
  finally { setBusy(false) }
 }
 async function portal(slot: number) {
  if (busy) return; setBusy(true); setNotice('')
  try { const channel = await rpc<string>(client!, 'enter_hall_portal', { p_space: space, p_slot: slot }); location.assign(`/?space=${encodeURIComponent(space)}&channel=${encodeURIComponent(channel)}`) }
  catch (e) { setNotice(errorText(e)); void refresh().catch(() => {}); setBusy(false) }
 }
 // Keep editor drafts on transient read failures; a failed save still preserves the draft.
 const editorInitial = useRef<SharedHallState | null>(null)
 function editorState(next: SharedHallState) {
  if (!next.can_edit || !next.layout) throw new Error('Editing permission changed. Return to the shared hall.')
  return { layout: next.layout, revision: next.revision }
 }
 if (editing && editorInitial.current?.layout) return <HallEditor remote={{
  layout: editorInitial.current.layout, revision: data?.revision ?? editorInitial.current.revision, name: editorInitial.current.name, exit: `/?server-hall=${encodeURIComponent(space)}`, writable: data?.can_edit === true, error,
  save: async (layout: HallLayout, revision: number) => { const next = await rpc<SharedHallState>(client!, 'manage_server_hall', { p_space: space, p_action: 'save', p_revision: revision, p_layout: layout }); apply(next); return editorState(next) },
  reload: async () => editorState(await refresh()),
 }}/>
 return <main className="workspace-page"><WorkspaceNav current="spaces"/><header className="workspace-header"><strong>Shared Server Hall</strong><a href={`/?space=${encodeURIComponent(space)}`}>Return to chat</a></header>
  <div className="shared-hall-content"><a href="/?spaces">Back to your personal hub</a><h1>{data?.name ?? 'Server hall'}</h1>
   {error && <p role="alert" className="error">{error}</p>}<div className="social-actions"><button disabled={busy} onClick={() => void refresh().catch(() => {})}>Refresh shared hall</button>{data?.can_edit && data.layout && <button onClick={() => { editorInitial.current = data; setEditing(true) }}>Decorate shared hall</button>}{data?.owner && data.can_edit && <button disabled={busy} onClick={() => void mutate('enabled', { p_enabled: !data.enabled })}>{data.enabled ? 'Disable shared hall' : 'Enable shared hall'}</button>}</div>
   {data ? <><p>{data.enabled ? `Shared account arrangement · Revision ${data.revision}` : 'This server’s hall is disabled. Its saved arrangement is retained. Chat remains available.'}</p>
    {data.enabled && data.layout && <><HallSceneBoundary key={`${space}:${data.revision}`}><div className="shared-hall-scene"><HallCanvas layout={data.layout}/>{ambient && <WorldAmbience width={768} height={512} hearths={data.layout.pieces.filter(p => p.kind === 'hearth').map(p => ({ x: p.x * 32, y: p.y * 32 }))}/>}</div></HallSceneBoundary><button aria-pressed={ambient} onClick={() => setAmbient(v => !v)}>Ambient effects {ambient ? 'On' : 'Off'}</button>
     <nav className="shared-hall-portals" aria-label="Channel portals">{data.portals.map((destination, i) => <button key={i} disabled={busy || !destination || !data.portal_names[i]} onClick={() => void portal(i)}>{['West','Central','East'][i]} channel portal{!destination ? ' · unassigned' : data.portal_names[i] ? ` · #${data.portal_names[i]}` : ' · unavailable'}</button>)}</nav>
     </>}

   </> : !error && <p role="status">Checking hall membership…</p>}{notice && <p role="status">{notice}</p>}
   {formState && <>
    <div hidden={!data?.enabled}><AnnouncementBoard space={space} state={formState} refresh={refresh}/></div>
    <div hidden={!data?.owner || !data.can_edit}><HallSettings space={space} state={formState} busy={busy} mutate={mutate}/></div>
   </>}
  </div>
 </main>
}
function HallSettings({ space, state, busy, mutate }: { space: string; state: SharedHallState; busy: boolean; mutate: (action: string, args: Record<string, unknown>) => Promise<SharedHallState | undefined> }) {
 const [members, setMembers] = useState<SpaceData['members']>([]), [channels, setChannels] = useState<Channel[]>([]), [error, setError] = useState('')
 const [portals, setPortals] = useState(state.portals), [baseline, setBaseline] = useState(state)
 const revision = baseline.revision, dirty = JSON.stringify(portals) !== JSON.stringify(baseline.portals)
 useEffect(() => { let alive = true; Promise.all([rpc<SpaceData>(client!, 'space_admin_data', { p_space: space }), listChannels(client!, space)]).then(([roster, rows]) => { if (alive) { setMembers(roster.members); setChannels(rows); setError('') } }).catch(e => { if (alive) { setMembers([]); setChannels([]); setError(errorText(e)) } }); return () => { alive = false } }, [space, state])
 useEffect(() => { if (!dirty) { setPortals(state.portals); setBaseline(state) } }, [state, dirty])
 return <section className="world-social" aria-label="Shared hall owner settings"><h2>Hall permissions & portals</h2><p>Only the owner and granted decorators can arrange furniture. Announcements are managed by server owners, admins and moderators.</p>{error && <p role="alert">{error}</p>}
  <h3>Decorators</h3>{members.filter(m => m.role !== 'owner').map(m => <div className="admin-row" key={m.user_id}><span>{m.name} · {m.role}</span><button disabled={busy} onClick={() => void mutate(state.decorators.includes(m.user_id) ? 'revoke' : 'grant', { p_target: m.user_id })}>{state.decorators.includes(m.user_id) ? 'Revoke' : 'Grant'} decorator: {m.name}</button></div>)}
  <form onSubmit={e => { e.preventDefault(); void mutate('portals', { p_portals: portals, p_revision: revision }).then(next => { if(next) { setBaseline(next); setPortals(next.portals) } }) }}><h3>Channel destinations</h3>{portals.map((id, i) => <label key={i}>{['West','Central','East'][i]} portal destination<select aria-label={`${['West','Central','East'][i]} portal destination`} value={id ?? ''} disabled={busy} onChange={e => { setPortals(ps => ps.map((p, n) => n === i ? e.target.value || null : p)) }}><option value="">Unassigned</option>{channels.filter(c => !c.archived_at).map(c => <option key={c.id} value={c.id}>#{c.name}</option>)}</select></label>)}<button disabled={busy || !dirty || revision !== state.revision}>Save channel portals</button>{dirty && revision !== state.revision && <p role="alert">The hall changed. Reload destinations before saving.</p>}<button type="button" onClick={() => { setPortals(state.portals); setBaseline(state) }}>Reload portal destinations</button></form>
 </section>
}
function AnnouncementBoard({ space, state, refresh }: { space: string; state: SharedHallState; refresh: () => Promise<SharedHallState> }) {
 const [body, setBody] = useState(''), [entry, setEntry] = useState<Announcement | null>(null), [busy, setBusy] = useState(false), [notice, setNotice] = useState('')
 const intent = useRef({ id: crypto.randomUUID(), body: '' })
 async function change(e?: FormEvent, remove?: Announcement) {
  e?.preventDefault(); if (busy) return; setBusy(true); setNotice('')
  const target = remove ?? entry
  if (intent.current.body !== body) intent.current = { id: crypto.randomUUID(), body }
  try { await rpc(client!, 'change_hall_announcement', { p_space: space, p_client: intent.current.id, p_body: body, p_entry: target?.id ?? null, p_revision: target?.revision ?? null, p_remove: !!remove }); if (!remove) { setBody(''); setEntry(null); intent.current = { id: crypto.randomUUID(), body: '' } }; await refresh(); setNotice(remove ? 'Announcement removed.' : 'Announcement saved.') }
  catch (e) { setNotice(errorText(e)) } finally { setBusy(false) }
 }
 return <section className="world-social" aria-labelledby="board-heading"><h2 id="board-heading">Announcement board</h2>{state.can_announce && <form onSubmit={e => void change(e)}><label>{entry ? 'Edit announcement' : 'New announcement'}<textarea aria-label={entry ? 'Edit announcement' : 'New announcement'} required disabled={busy} maxLength={2000} value={body} onChange={e => setBody(e.target.value)}/></label><div className="social-actions"><button disabled={busy || !body.trim()}>{entry ? 'Save announcement edit' : 'Publish announcement'}</button>{entry && <button type="button" onClick={() => { setBody(''); setEntry(null) }}>Cancel edit</button>}</div></form>}
  <ol className="world-entry-list">{state.announcements.map(a => <li key={a.id}><time dateTime={a.updated_at}>{new Date(a.updated_at).toLocaleString()}</time><p>{a.body}</p>{state.can_announce && <div className="social-actions"><button disabled={busy} onClick={() => { setEntry(a); setBody(a.body) }}>Edit announcement</button><button disabled={busy} onClick={() => void change(undefined, a)}>Remove announcement</button></div>}</li>)}</ol>{!state.announcements.length && <p className="muted">No announcements yet.</p>}{notice && <p role="status">{notice}</p>}
 </section>
}

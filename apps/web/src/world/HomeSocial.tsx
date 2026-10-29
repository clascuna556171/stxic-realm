import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { useAccount } from '../Account'
import { errorText, rpc } from '../account-repository'
import { client } from '../data'
import { safeProjectUrl, useSocialSnapshot, type HomeSocialState, type ProjectLink } from './social-repository'
import './social-world.css'

export function HomeSocial({ owner, selected }: { owner: string; selected: string }) {
 const user = useAccount().session!.user.id, own = owner === user
 const load = useCallback(() => rpc<HomeSocialState>(client!, 'home_social', { p_owner: owner }), [owner])
 const { data, error, refresh, apply } = useSocialSnapshot(load)
 const settings = useRef<HomeSocialState | null>(null)
 if (data) settings.current = data
 const [body, setBody] = useState(''), [notice, setNotice] = useState(''), [busy, setBusy] = useState(false)
 const intent = useRef({ id: crypto.randomUUID(), body: '' })
 const book = useRef<HTMLElement>(null), desk = useRef<HTMLElement>(null)
 async function post(e: FormEvent) {
  e.preventDefault(); if (busy) return; setBusy(true); setNotice('')
  if (intent.current.body !== body) intent.current = { id: crypto.randomUUID(), body }
  try { await rpc(client!, 'post_guestbook', { p_owner: owner, p_body: body, p_client: intent.current.id }); setBody(''); intent.current = { id: crypto.randomUUID(), body: '' }; await refresh(); setNotice('Guestbook entry saved.') }
  catch (e) { setNotice(errorText(e)); if ((e as {code?: string}).code === '42501') void refresh().catch(() => {}) }
  finally { setBusy(false) }
 }
 async function remove(id: string) {
  if (busy) return; setBusy(true)
  try { await rpc(client!, 'remove_guestbook', { p_entry: id }); await refresh(); setNotice('Entry removed.') } catch (e) { setNotice(errorText(e)) } finally { setBusy(false) }
 }
 return <section id="home-social" className="world-social" aria-label="Home social features">
  <div className="social-actions"><a href="/">Return to chat</a><button onClick={() => book.current?.focus()}>Open guestbook</button>{selected === 'desk' && <button onClick={() => desk.current?.focus()}>Open project links</button>}</div>
  {error && <p className="error" role="alert">{error}</p>}
  <button disabled={busy} onClick={() => void refresh().catch(() => {})}>Refresh home social</button>
  {data ? <>
   <section ref={desk} tabIndex={-1} aria-labelledby="project-heading"><h2 id="project-heading">Project desk</h2><p>Links shared by this home’s owner. External sites open in a new tab.</p>
    {data.links.length ? <ul>{data.links.map((link, i) => { const url = safeProjectUrl(link.url); return url ? <li key={i}><a href={url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">{link.title} <small>({new URL(url).hostname})</small></a></li> : null })}</ul> : <p className="muted">No project links shared yet.</p>}
   </section>
   <section ref={book} tabIndex={-1} aria-labelledby="guestbook-heading"><h2 id="guestbook-heading">Guestbook</h2><p className="muted">Visible to people who can currently visit this home. Up to 100 entries; 5 new posts per hour per account.</p>
    {data.can_post ? <form onSubmit={post}><label>Leave a guestbook entry<textarea aria-label="Leave a guestbook entry" required maxLength={1000} value={body} disabled={busy} onChange={e => setBody(e.target.value)}/></label><button disabled={busy || !body.trim()}>Post entry</button></form> : <p>The owner has closed guestbook posting.</p>}
    <ol className="world-entry-list">{data.entries.map(entry => <li key={entry.id}><strong>{entry.display_name}</strong><time dateTime={entry.created_at}>{new Date(entry.created_at).toLocaleString()}</time><p>{entry.body}</p>{(data.can_moderate || entry.author_id === user) && <button disabled={busy} onClick={() => void remove(entry.id)}>Remove entry by {entry.display_name}</button>}</li>)}</ol>{!data.entries.length && <p className="muted">No entries yet.</p>}
   </section>
  </> : !error && <p role="status">Opening the guestbook…</p>}
  {own && settings.current && <div hidden={!data}><HomeSocialSettings key={owner} state={data ?? settings.current} onSaved={apply} reload={refresh}/></div>}
  {notice && <p role="status">{notice}</p>}
 </section>
}
function HomeSocialSettings({ state, onSaved, reload }: { state: HomeSocialState; onSaved: (s: HomeSocialState) => void; reload: () => Promise<HomeSocialState> }) {
 const [posting, setPosting] = useState(state.posting), [links, setLinks] = useState<ProjectLink[]>(state.links)
 const [baseline, setBaseline] = useState(state), [notice, setNotice] = useState(''), [busy, setBusy] = useState(false)
 const dirty = posting !== baseline.posting || JSON.stringify(links) !== JSON.stringify(baseline.links), stale = state.revision !== baseline.revision
 useEffect(() => { if (!dirty && !busy) { setBaseline(state); setPosting(state.posting); setLinks(state.links) } }, [state, dirty, busy])
 useEffect(() => { if (!dirty) return; const guard = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }; window.addEventListener('beforeunload', guard); return () => window.removeEventListener('beforeunload', guard) }, [dirty])
 async function save(e: FormEvent) {
  e.preventDefault(); if (busy || stale) return
  if (links.some(l => !l.title.trim() || !safeProjectUrl(l.url))) { setNotice('Give each link a title and a full HTTPS address.'); return }
  setBusy(true)
  try { const next = await rpc<HomeSocialState>(client!, 'save_home_social', { p_posting: posting, p_links: links, p_revision: baseline.revision }); setBaseline(next); onSaved(next); setNotice('Home social settings saved.') } catch (e) { setNotice(errorText(e)) } finally { setBusy(false) }
 }
 return <details><summary>Guestbook & project link settings</summary><form onSubmit={save}>
  <label>Guestbook posting<select aria-label="Guestbook posting" value={posting} disabled={busy} onChange={e => setPosting(e.target.value as typeof posting)}><option value="friends">Friends and owner</option><option value="closed">Owner only</option></select></label>
  <p>Privacy is still controlled in Home Studio. These settings do not move furniture or end visits.</p>
  {links.map((link, i) => <fieldset key={i} disabled={busy}><legend>Project link {i + 1}</legend><label>Link title<input required maxLength={80} value={link.title} onChange={e => setLinks(ls => ls.map((l, n) => n === i ? { ...l, title: e.target.value } : l))}/></label><label>HTTPS address<input type="url" required maxLength={2048} value={link.url} onChange={e => setLinks(ls => ls.map((l, n) => n === i ? { ...l, url: e.target.value } : l))}/></label><button type="button" onClick={() => setLinks(ls => ls.filter((_, n) => n !== i))}>Remove project link {i + 1}</button></fieldset>)}
  <div className="social-actions"><button type="button" disabled={busy || links.length >= 5} onClick={() => setLinks(ls => [...ls, { title: '', url: '' }])}>Add project link</button><button disabled={busy || stale || !dirty}>Save home social settings</button><button type="button" disabled={busy} onClick={() => { if (dirty && !confirm('Discard unsaved social settings?')) return; void reload().then(next => { setBaseline(next); setPosting(next.posting); setLinks(next.links); setNotice('Loaded saved settings.') }).catch(e => setNotice(errorText(e))) }}>Reload social settings</button></div>
  {stale && <p role="alert">These settings changed on another device. Reload before saving.</p>}{notice && <p role="status">{notice}</p>}
 </form></details>
}

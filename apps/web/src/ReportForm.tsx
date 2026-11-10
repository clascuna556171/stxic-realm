import { useState, type FormEvent } from 'react'
import { useAccount } from './Account'
import { errorText, rpc } from './account-repository'
import { client } from './data'
import type { StreamKind } from './stream-repository'

export function ReportForm({
  kind,
  stream,
  message,
  user,
  onClose,
  onReported,
}: {
  kind: StreamKind | 'user'
  stream?: string
  message?: string
  user?: string
  onClose: () => void
  onReported: () => void
}) {
  const reporting = useAccount().access?.administration === true
  const [reason, setReason] = useState('harassment')
  const [note, setNote] = useState('')
  const [block, setBlock] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await rpc(client!, 'submit_report', {
        p_kind: kind,
        p_stream: stream ?? null,
        p_message: message ?? null,
        p_user: user ?? null,
        p_reason: reason,
        p_note: note,
        p_block: block,
      })
      setDone(true)
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="report-form" aria-label="Report abuse">
      <h2>{done ? 'Report received' : 'Report abuse'}</h2>
      {done ? (
        <>
          <p role="status">
            Authorized reviewers can investigate the submitted evidence. Reports are retained for at most 90 days, or
            30 days after closure, whichever is earlier.
          </p>
          <button className="primary" onClick={onReported}>
            Done
          </button>
        </>
      ) : (
        <form onSubmit={submit}>
          <p>
            {kind === 'direct'
              ? 'Platform reviewers receive only this message as evidence. They cannot browse your conversation.'
              : 'Reviewers receive this report and the reported message, where applicable.'}
          </p>
          {!reporting && <p role="status">Reporting is awaiting operator setup and verification.</p>}
          <label>
            Reason
            <select value={reason} onChange={e => setReason(e.target.value)}>
              <option value="harassment">Harassment</option>
              <option value="spam">Spam</option>
              <option value="threat">Threat</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label>
            Additional context (optional)
            <textarea value={note} maxLength={500} rows={3} onChange={e => setNote(e.target.value)} />
          </label>
          <label className="check-label">
            <input type="checkbox" checked={block} onChange={e => setBlock(e.target.checked)} />
            Also block this account
          </label>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <div className="social-actions">
            <button className="primary" disabled={busy || !reporting}>
              {busy ? 'Submitting…' : 'Submit report'}
            </button>
            <button type="button" disabled={busy} onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </section>
  )
}

import { useState } from 'react'
import {
  getPassportStamps,
  savePassportStamp,
  STAMP_BADGES,
  STAMP_INKS,
  type StampBadge,
  type StampInk,
  type RoomStamp,
} from './passport'
import { PixelStampIcon } from './pixel-icons'
import { trackHallmarkMilestone } from '../badges'
import './turntable.css'

interface Props {
  roomId: string
  roomName: string
  ownerName: string
  mood: string
  canStampRoom?: boolean
}

export function PassportPanel({ roomId, roomName, ownerName, mood, canStampRoom = true }: Props) {
  const [stamps, setStamps] = useState<RoomStamp[]>(() => getPassportStamps())
  const [selectedBadge, setSelectedBadge] = useState<StampBadge>('paw')
  const [selectedInk, setSelectedInk] = useState<StampInk>('gold')
  const [customNote, setCustomNote] = useState('')
  const [statusMessage, setStatusMessage] = useState('')

  const handleStampPassport = () => {
    const newStamp = savePassportStamp({
      roomId,
      roomName,
      ownerName,
      badge: selectedBadge,
      ink: selectedInk,
      mood,
      note: customNote.trim() || undefined,
    })
    setStamps(getPassportStamps())
    trackHallmarkMilestone('self', 'passport_stamp', customNote.trim() ? 'with_note' : undefined)
    setStatusMessage(`Passport stamped with ${STAMP_BADGES[newStamp.badge].name}!`)
    setCustomNote('')
  }

  return (
    <div className="passport-container" aria-label="Realm Traveler Passport">
      <div className="passport-book">
        <div className="passport-header">
          <div>
            <h3 className="passport-title">
              Realm Traveler’s Passport
            </h3>
            <p className="passport-subtitle">
              Collectible spatial seals gathered from visited rooms and personal hearths.
            </p>
          </div>
          <span className="passport-counter">
            {stamps.length} Visa{stamps.length === 1 ? '' : 's'}
          </span>
        </div>

        {/* Current Room Stamp Action */}
        {canStampRoom && (
          <div className="stamp-action-box">
            <h4 className="stamp-action-title">
              Stamp This Room: {roomName}
            </h4>

            {/* Emblem badge picker */}
            <div className="stamp-customizer">
              <div className="stamp-badge-group" role="group" aria-label="Stamp insignia">
                {(Object.keys(STAMP_BADGES) as StampBadge[]).map(b => (
                  <button
                    key={b}
                    type="button"
                    title={STAMP_BADGES[b].name}
                    className={`stamp-badge-btn ${selectedBadge === b ? 'is-active' : ''}`}
                    onClick={() => setSelectedBadge(b)}
                    aria-pressed={selectedBadge === b}
                  >
                    <PixelStampIcon badge={b} size={18} color={selectedBadge === b ? STAMP_INKS[selectedInk].hex : 'currentColor'} />
                  </button>
                ))}
              </div>

              {/* Ink pad selector */}
              <div className="stamp-ink-group" role="group" aria-label="Stamp ink color">
                {(Object.keys(STAMP_INKS) as StampInk[]).map(k => (
                  <button
                    key={k}
                    type="button"
                    title={STAMP_INKS[k].name}
                    className={`stamp-ink-pad ${selectedInk === k ? 'is-selected' : ''}`}
                    style={{ backgroundColor: STAMP_INKS[k].hex }}
                    onClick={() => setSelectedInk(k)}
                    aria-pressed={selectedInk === k}
                  />
                ))}
              </div>
            </div>

            <div className="stamp-input-row">
              <input
                type="text"
                placeholder="Optional traveler note (e.g. loved the music & plants)"
                maxLength={60}
                value={customNote}
                onChange={e => setCustomNote(e.target.value)}
                className="stamp-note-input"
              />
              <button
                type="button"
                className="stamp-submit-btn"
                onClick={handleStampPassport}
              >
                Stamp Passport
              </button>
            </div>

            {statusMessage && (
              <p className="stamp-status-msg" role="status">
                {statusMessage}
              </p>
            )}
          </div>
        )}

        {/* Stamp Collection Grid */}
        <h4 className="passport-section-label">
          Collected Passport Visas
        </h4>

        {stamps.length === 0 ? (
          <p className="passport-empty-state">
            No stamps collected yet. Explore friends’ rooms to gather unique spatial seals!
          </p>
        ) : (
          <div className="passport-stamp-grid">
            {stamps.map(s => {
              const inkInfo = STAMP_INKS[s.ink] ?? STAMP_INKS.gold
              return (
                <div
                  key={s.id}
                  className="passport-stamp-item"
                  style={{
                    borderColor: inkInfo.hex,
                    color: inkInfo.hex,
                  }}
                >
                  <div className="stamp-seal-ring">
                    <PixelStampIcon badge={s.badge} size={24} color={inkInfo.hex} />
                  </div>
                  <span className="stamp-room-name">{s.roomName}</span>
                  <span className="stamp-owner-tag">{s.ownerName}</span>
                  <time className="stamp-date">{new Date(s.date).toLocaleDateString()}</time>
                  {s.note && (
                    <span className="stamp-note" title={s.note}>
                      "{s.note}"
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

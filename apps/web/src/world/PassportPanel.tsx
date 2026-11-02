import { useState, useMemo } from 'react'
import {
  getPassportStamps,
  savePassportStamp,
  deletePassportStamp,
  generateRoomEmblem,
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

const QUICK_NOTES = [
  'Loved the cozy atmosphere & warm hearth! 🔥',
  'Listened to vinyl tracks on the turntable 🎶',
  'Stopped by to pet the room companion 🐾',
  'A peaceful haven between conversations ☕',
]

export function PassportPanel({ roomId, roomName, ownerName, mood, canStampRoom = true }: Props) {
  const [stamps, setStamps] = useState<RoomStamp[]>(() => getPassportStamps())
  
  // Recommended native emblem for this specific room
  const roomEmblem = useMemo(() => generateRoomEmblem(roomId, mood), [roomId, mood])

  const [selectedBadge, setSelectedBadge] = useState<StampBadge>(roomEmblem.badge)
  const [selectedInk, setSelectedInk] = useState<StampInk>(roomEmblem.ink)
  const [customNote, setCustomNote] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [inspectingStamp, setInspectingStamp] = useState<RoomStamp | null>(null)

  const todayStr = new Date().toISOString().slice(0, 10)
  const stampedToday = useMemo(
    () => stamps.some(s => s.roomId === roomId && s.date.slice(0, 10) === todayStr),
    [stamps, roomId, todayStr]
  )

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
    const refreshed = getPassportStamps()
    setStamps(refreshed)
    trackHallmarkMilestone('self', 'passport_stamp', customNote.trim() ? 'with_note' : undefined)
    setStatusMessage(`Passport stamped with ${STAMP_BADGES[newStamp.badge].name}!`)
    setCustomNote('')
    setInspectingStamp(newStamp)
  }

  const handleDeleteStamp = (id: string) => {
    const next = deletePassportStamp(id)
    setStamps(next)
    if (inspectingStamp?.id === id) setInspectingStamp(null)
    setStatusMessage('Visa removed from your passport.')
  }

  const handleApplyRoomEmblem = () => {
    setSelectedBadge(roomEmblem.badge)
    setSelectedInk(roomEmblem.ink)
    setStatusMessage(`Applied signature seal: ${STAMP_BADGES[roomEmblem.badge].name} (${STAMP_INKS[roomEmblem.ink].name}).`)
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

        {/* Milestone Achievement Tracker */}
        <div className="passport-milestone-pill" role="status" aria-label="Explorer milestone status">
          <span className="milestone-badge">Hallmark Progress</span>
          <span className="milestone-label">
            {stamps.length >= 5 ? '⭐ Explorer Hallmark Unlocked!' : `${stamps.length} / 5 stamps for Explorer hallmark`}
          </span>
        </div>

        {/* Current Room Stamp Action */}
        {canStampRoom && (
          <div className="stamp-action-box">
            <div className="stamp-action-header">
              <h4 className="stamp-action-title">
                Stamp This Room: {roomName}
              </h4>
              {stampedToday && (
                <span className="stamp-already-badge" title="You visited today. Stamping again will update today's note.">
                  ✓ Visited today
                </span>
              )}
            </div>

            <div className="stamp-recommendation-row">
              <button
                type="button"
                className="stamp-native-btn"
                onClick={handleApplyRoomEmblem}
                title="Use this room's authentic signature crest"
              >
                <PixelStampIcon badge={roomEmblem.badge} size={16} color={STAMP_INKS[roomEmblem.ink].hex} />
                <span>Use Signature Room Seal: {STAMP_BADGES[roomEmblem.badge].name}</span>
              </button>
            </div>

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

            {/* Quick Note Presets */}
            <div className="stamp-quick-notes" role="group" aria-label="Quick travel notes">
              {QUICK_NOTES.map(note => (
                <button
                  key={note}
                  type="button"
                  className="quick-note-chip"
                  onClick={() => setCustomNote(note)}
                >
                  {note}
                </button>
              ))}
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

        {/* Selected Stamp Detail / Inspector */}
        {inspectingStamp && (
          <div className="passport-inspect-modal" role="region" aria-label="Visa details">
            <div className="inspect-header">
              <div
                className="inspect-seal"
                style={{
                  borderColor: (STAMP_INKS[inspectingStamp.ink] ?? STAMP_INKS.gold).hex,
                  color: (STAMP_INKS[inspectingStamp.ink] ?? STAMP_INKS.gold).hex,
                }}
              >
                <PixelStampIcon badge={inspectingStamp.badge} size={36} color={(STAMP_INKS[inspectingStamp.ink] ?? STAMP_INKS.gold).hex} />
              </div>
              <div className="inspect-meta">
                <h5>{inspectingStamp.roomName}</h5>
                <p>Owner: {inspectingStamp.ownerName}</p>
                <time dateTime={inspectingStamp.date}>
                  Visited on {new Date(inspectingStamp.date).toLocaleDateString()} at {new Date(inspectingStamp.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </time>
                <span className="inspect-badge-tag">
                  Seal: {STAMP_BADGES[inspectingStamp.badge]?.name ?? inspectingStamp.badge} · {STAMP_INKS[inspectingStamp.ink]?.name ?? inspectingStamp.ink}
                </span>
              </div>
              <button
                type="button"
                className="inspect-close-btn"
                onClick={() => setInspectingStamp(null)}
                aria-label="Close visa inspection"
              >
                ✕
              </button>
            </div>

            {inspectingStamp.note && (
              <blockquote className="inspect-quote">
                "{inspectingStamp.note}"
              </blockquote>
            )}

            <div className="inspect-actions">
              <button
                type="button"
                className="inspect-delete-btn"
                onClick={() => handleDeleteStamp(inspectingStamp.id)}
              >
                Remove from Passport
              </button>
            </div>
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
              const isSelected = inspectingStamp?.id === s.id
              return (
                <div
                  key={s.id}
                  className={`passport-stamp-item ${isSelected ? 'is-inspecting' : ''}`}
                  style={{
                    borderColor: inkInfo.hex,
                    color: inkInfo.hex,
                  }}
                  onClick={() => setInspectingStamp(s)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setInspectingStamp(s)
                    }
                  }}
                  title="Click to view full visa details"
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

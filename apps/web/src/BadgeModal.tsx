import {useState, useRef, useEffect} from 'react'
import {
  BADGE_CATALOG,
  BADGE_CATEGORY_NAMES,
  BADGE_RARITY_COLORS,
  toggleBadgePin,
  type BadgeCategory,
  type BadgeDefinition,
  type UserBadgeState,
} from './badges'
import './badge-modal.css'

interface Props {
  isOpen: boolean
  onClose: () => void
  userBadgeState: UserBadgeState
  userId: string
  isOwnProfile?: boolean
  onBadgeStateChange?: (newState: UserBadgeState) => void
}

type CategoryFilter = 'all' | BadgeCategory

export function BadgeModal({
  isOpen,
  onClose,
  userBadgeState,
  userId,
  isOwnProfile = false,
  onBadgeStateChange,
}: Props) {
  const [filter, setFilter] = useState<CategoryFilter>('all')
  const [selectedId, setSelectedId] = useState<string>('realm-creator')
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (isOpen) {
      dialog?.showModal()
    } else {
      dialog?.close()
    }
  }, [isOpen])

  if (!isOpen) return null

  const allBadges = Object.values(BADGE_CATALOG)
  const unlockedCount = Object.keys(userBadgeState.unlocked).length
  const totalCount = allBadges.length
  const progressPercent = Math.round((unlockedCount / totalCount) * 100)

  const filteredBadges = allBadges.filter(b => {
    if (filter === 'all') return true
    return b.category === filter
  })

  const selectedBadge = BADGE_CATALOG[selectedId] || allBadges[0]
  const isSelectedUnlocked = !!userBadgeState.unlocked[selectedBadge.id]
  const isSelectedFeatured = userBadgeState.featured.includes(selectedBadge.id)

  function handleTogglePin(badgeId: string) {
    if (!isOwnProfile) return
    const updated = toggleBadgePin(userId, badgeId)
    onBadgeStateChange?.(updated)
  }

  return (
    <dialog
      ref={dialogRef}
      className="badge-modal"
      aria-labelledby="badge-modal-title"
      onCancel={e => {
        e.preventDefault()
        onClose()
      }}
      onClick={e => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="badge-modal-container">
        {/* Modal Header */}
        <header className="badge-modal-header">
          <div className="badge-modal-title-wrap">
            <h2 id="badge-modal-title">Hallmarks of the Realm</h2>
            <p className="badge-modal-sub">
              Prestige crests, honors, and milestones across the Obsidian Citadel.
            </p>
          </div>
          <button
            type="button"
            className="badge-modal-close-btn"
            aria-label="Close Hallmarks showcase"
            onClick={onClose}
          >
            ✕
          </button>
        </header>

        {/* Progress Bar & Filter Tabs */}
        <div className="badge-modal-toolbar">
          <div className="badge-progress-wrap">
            <div className="badge-progress-label">
              <span>Unlocked Hallmarks</span>
              <strong>{unlockedCount} / {totalCount} ({progressPercent}%)</strong>
            </div>
            <div className="badge-progress-track">
              <div
                className="badge-progress-fill"
                style={{width: `${Math.max(5, progressPercent)}%`}}
              />
            </div>
          </div>

          <nav className="badge-category-tabs" role="tablist" aria-label="Hallmark Categories">
            <button
              type="button"
              role="tab"
              aria-selected={filter === 'all'}
              className={`badge-cat-tab ${filter === 'all' ? 'is-active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All ({totalCount})
            </button>
            {(Object.keys(BADGE_CATEGORY_NAMES) as BadgeCategory[]).map(cat => {
              const count = allBadges.filter(b => b.category === cat).length
              return (
                <button
                  key={cat}
                  type="button"
                  role="tab"
                  aria-selected={filter === cat}
                  className={`badge-cat-tab ${filter === cat ? 'is-active' : ''}`}
                  onClick={() => setFilter(cat)}
                >
                  {BADGE_CATEGORY_NAMES[cat].split(' ')[0]} ({count})
                </button>
              )
            })}
          </nav>
        </div>

        {/* Content Area: Grid + Detail Drawer */}
        <div className="badge-modal-content">
          <div className="badge-grid-pane" role="region" aria-label="Hallmark list">
            <div className="badge-cards-grid">
              {filteredBadges.map(badge => {
                const isUnlocked = !!userBadgeState.unlocked[badge.id]
                const isFeatured = userBadgeState.featured.includes(badge.id)
                const isSelected = selectedId === badge.id
                const rarity = BADGE_RARITY_COLORS[badge.rarity]

                return (
                  <button
                    key={badge.id}
                    type="button"
                    className={`badge-grid-card ${isUnlocked ? 'is-unlocked' : 'is-locked'} ${
                      isSelected ? 'is-selected' : ''
                    }`}
                    onClick={() => setSelectedId(badge.id)}
                    style={{
                      borderColor: isSelected
                        ? rarity.border
                        : isUnlocked
                        ? 'var(--realm-line)'
                        : 'rgba(255, 255, 255, 0.04)',
                    }}
                  >
                    {isFeatured && (
                      <span className="badge-card-pin-pill" title="Pinned to profile card">
                        PINNED
                      </span>
                    )}
                    <div className="badge-card-icon-wrap">
                      <img
                        src={badge.icon}
                        alt=""
                        className={`badge-card-img ${isUnlocked ? '' : 'is-locked-img'}`}
                        loading="lazy"
                        width={64}
                        height={64}
                      />
                    </div>
                    <div className="badge-card-info">
                      <span
                        className="badge-card-rarity"
                        style={{color: rarity.text, backgroundColor: rarity.bg}}
                      >
                        {badge.rarity.toUpperCase()}
                      </span>
                      <strong className="badge-card-title">{badge.name}</strong>
                      <span className="badge-card-sub">{badge.subtitle}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Right Detail Pane */}
          <aside className="badge-detail-pane" aria-label="Selected Hallmark Details">
            <div className="badge-detail-hero">
              <div
                className="badge-detail-icon-wrap"
                style={{
                  borderColor: BADGE_RARITY_COLORS[selectedBadge.rarity].border,
                  boxShadow: isSelectedUnlocked
                    ? `0 0 24px ${BADGE_RARITY_COLORS[selectedBadge.rarity].glow}`
                    : 'none',
                }}
              >
                <img
                  src={selectedBadge.icon}
                  alt={selectedBadge.name}
                  className={`badge-detail-img ${isSelectedUnlocked ? '' : 'is-locked-img'}`}
                  width={96}
                  height={96}
                />
              </div>
              <div className="badge-detail-header">
                <span
                  className="badge-detail-rarity"
                  style={{
                    color: BADGE_RARITY_COLORS[selectedBadge.rarity].text,
                    backgroundColor: BADGE_RARITY_COLORS[selectedBadge.rarity].bg,
                    borderColor: BADGE_RARITY_COLORS[selectedBadge.rarity].border,
                  }}
                >
                  {selectedBadge.rarity.toUpperCase()} · {BADGE_CATEGORY_NAMES[selectedBadge.category]}
                </span>
                <h3 className="badge-detail-name">{selectedBadge.name}</h3>
                <p className="badge-detail-sub">{selectedBadge.subtitle}</p>
              </div>
            </div>

            <div className="badge-detail-body">
              <p className="badge-detail-desc">{selectedBadge.description}</p>
              {selectedBadge.loreSnippet && (
                <blockquote className="badge-detail-lore">
                  "{selectedBadge.loreSnippet}"
                </blockquote>
              )}

              <div className="badge-detail-status-box">
                {isSelectedUnlocked ? (
                  <div className="badge-status-unlocked">
                    <span className="badge-status-dot is-active" />
                    <div>
                      <strong>Unlocked Hallmark</strong>
                      <p>
                        Earned{' '}
                        {new Date(
                          userBadgeState.unlocked[selectedBadge.id].unlockedAt
                        ).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                        {userBadgeState.unlocked[selectedBadge.id].grantedBy && (
                          <> · Granted by {userBadgeState.unlocked[selectedBadge.id].grantedBy}</>
                        )}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="badge-status-locked">
                    <span className="badge-status-dot is-locked" />
                    <div>
                      <strong>Locked Hallmark</strong>
                      <p>{selectedBadge.unlockHint}</p>
                    </div>
                  </div>
                )}
              </div>

              {isOwnProfile && isSelectedUnlocked && (
                <div className="badge-detail-actions">
                  <button
                    type="button"
                    className={`badge-pin-toggle-btn ${isSelectedFeatured ? 'is-pinned' : ''}`}
                    onClick={() => handleTogglePin(selectedBadge.id)}
                  >
                    {isSelectedFeatured ? 'Unpin from Profile Card' : 'Pin to Profile Card (Max 5)'}
                  </button>
                  <small className="badge-pin-help">
                    Pinned Hallmarks appear prominently on your 3D profile card.
                  </small>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </dialog>
  )
}

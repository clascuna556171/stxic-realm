import {useState} from 'react'
import {BADGE_CATALOG, BADGE_RARITY_COLORS, type BadgeDefinition} from './badges'
import './badge-ribbon.css'

interface Props {
  badgeIds: string[]
  onOpenHallmarks: () => void
  unlockedCount: number
}

export function BadgeRibbon({badgeIds, onOpenHallmarks, unlockedCount}: Props) {
  const [activePin, setActivePin] = useState<{badge: BadgeDefinition; left: number; notch: number} | null>(null)

  function showBadge(badge: BadgeDefinition, button: HTMLButtonElement) {
    const ribbon = button.closest('.profile-badge-ribbon')!.getBoundingClientRect()
    const pin = button.getBoundingClientRect()
    const center = pin.left + pin.width / 2 - ribbon.left
    const width = Math.min(260, ribbon.width - 16)
    const left = Math.max(8, Math.min(center - width / 2, ribbon.width - width - 8))
    setActivePin({badge, left, notch: center - left})
  }

  const badges = badgeIds
    .map(id => BADGE_CATALOG[id])
    .filter(Boolean)

  return (
    <div className="profile-badge-ribbon" role="region" aria-label="Featured Hallmarks">
      <div className="profile-badge-list">
        {badges.map(badge => {
          const rarity = BADGE_RARITY_COLORS[badge.rarity]
          const isCurrentActive = activePin?.badge.id === badge.id

          return (
            <button
              key={badge.id}
              type="button"
              className="profile-badge-pin"
              onMouseEnter={event => showBadge(badge, event.currentTarget)}
              onMouseLeave={() => setActivePin(null)}
              onFocus={event => showBadge(badge, event.currentTarget)}
              onBlur={() => setActivePin(null)}
              onClick={onOpenHallmarks}
              aria-label={`${badge.name} Hallmark: ${badge.subtitle}`}
              style={{
                borderColor: isCurrentActive ? rarity.border : 'var(--realm-line)',
                boxShadow: isCurrentActive ? `0 0 12px ${rarity.glow}` : 'none',
              }}
            >
              <img
                src={badge.icon}
                alt=""
                className="profile-badge-icon-img"
                width={36}
                height={36}
                loading="lazy"
              />
            </button>
          )
        })}
      </div>

      <button
        type="button"
        className="profile-hallmarks-btn"
        onClick={onOpenHallmarks}
        aria-label="View Hallmarks Trophy Case"
      >
        <span>Hallmarks</span>
        <span className="profile-hallmarks-count">{unlockedCount}</span>
      </button>

      {/* Floating Rich Tooltip anchored safely below the ribbon */}
      {activePin && (() => {
        const badge = activePin.badge
        const rarity = BADGE_RARITY_COLORS[badge.rarity]

        return (
          <div
            className="profile-badge-tooltip"
            role="tooltip"
            style={{
              borderColor: rarity.border,
              boxShadow: `0 8px 24px rgba(0, 0, 0, 0.85), 0 0 16px ${rarity.glow}`,
              left: `${activePin.left}px`,
              ['--notch-x' as string]: `${activePin.notch}px`,
            }}
          >
            <div className="badge-tooltip-topline">
              <span
                className="badge-tooltip-rarity"
                style={{color: rarity.text, backgroundColor: rarity.bg, borderColor: rarity.border}}
              >
                {badge.rarity.toUpperCase()}
              </span>
              <span className="badge-tooltip-cat">{badge.category}</span>
            </div>
            <strong className="badge-tooltip-title">{badge.name}</strong>
            <span className="badge-tooltip-sub">{badge.subtitle}</span>
            <p className="badge-tooltip-desc">{badge.description}</p>
          </div>
        )
      })()}
    </div>
  )
}

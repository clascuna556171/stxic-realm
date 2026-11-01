import {useState} from 'react'
import {BADGE_CATALOG, BADGE_RARITY_COLORS, type BadgeDefinition} from './badges'
import './badge-ribbon.css'

interface Props {
  badgeIds: string[]
  onOpenHallmarks: () => void
  unlockedCount: number
}

export function BadgeRibbon({badgeIds, onOpenHallmarks, unlockedCount}: Props) {
  const [activePin, setActivePin] = useState<{badge: BadgeDefinition; index: number} | null>(null)

  const badges = badgeIds
    .map(id => BADGE_CATALOG[id])
    .filter(Boolean)

  return (
    <div className="profile-badge-ribbon" role="region" aria-label="Featured Hallmarks">
      <div className="profile-badge-list">
        {badges.map((badge, index) => {
          const rarity = BADGE_RARITY_COLORS[badge.rarity]
          const isCurrentActive = activePin?.badge.id === badge.id

          return (
            <button
              key={badge.id}
              type="button"
              className="profile-badge-pin"
              onMouseEnter={() => setActivePin({badge, index})}
              onMouseLeave={() => setActivePin(null)}
              onFocus={() => setActivePin({badge, index})}
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
                width={28}
                height={28}
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
        // Each pin is 34px wide with 8px gap. Left offset starts at 10px.
        const pinCenter = 10 + activePin.index * 42 + 17
        const tooltipLeft = Math.max(8, Math.min(activePin.index * 42 + 4, 130))
        const notchOffset = pinCenter - tooltipLeft

        return (
          <div
            className="profile-badge-tooltip"
            role="tooltip"
            style={{
              borderColor: rarity.border,
              boxShadow: `0 8px 24px rgba(0, 0, 0, 0.85), 0 0 16px ${rarity.glow}`,
              left: `${tooltipLeft}px`,
              ['--notch-x' as string]: `${notchOffset}px`,
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

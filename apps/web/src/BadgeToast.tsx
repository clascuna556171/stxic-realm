import {useEffect, useState} from 'react'
import {BADGE_RARITY_COLORS, onBadgeUnlocked, type BadgeDefinition} from './badges'
import './badge-toast.css'

interface ToastItem {
  id: string
  badge: BadgeDefinition
}

export function BadgeToastContainer({onOpenTrophyCase}: {onOpenTrophyCase?: () => void}) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  useEffect(() => {
    return onBadgeUnlocked(badge => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
      setToasts(prev => [...prev.slice(-2), {id, badge}])

      // Auto dismiss after 5.5s
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id))
      }, 5500)
    })
  }, [])

  if (toasts.length === 0) return null

  return (
    <div className="badge-toast-viewport" role="region" aria-label="Hallmark notifications">
      {toasts.map(({id, badge}) => {
        const rarity = BADGE_RARITY_COLORS[badge.rarity]
        return (
          <aside
            key={id}
            className="badge-toast-card"
            role="status"
            aria-live="polite"
            style={{
              borderColor: rarity.border,
              boxShadow: `0 8px 24px rgba(0, 0, 0, 0.6), 0 0 16px ${rarity.glow}`,
            }}
          >
            <div className="badge-toast-icon-wrap">
              <img
                src={badge.icon}
                alt={`${badge.name} hallmark insignia`}
                className="badge-toast-img"
                width={48}
                height={48}
                loading="eager"
              />
            </div>
            <div className="badge-toast-body">
              <div className="badge-toast-topline">
                <span className="badge-toast-tag">HALLMARK UNLOCKED</span>
                <span
                  className="badge-toast-rarity"
                  style={{color: rarity.text, backgroundColor: rarity.bg, borderColor: rarity.border}}
                >
                  {badge.rarity.toUpperCase()}
                </span>
              </div>
              <h4 className="badge-toast-title">{badge.name}</h4>
              <p className="badge-toast-subtitle">{badge.subtitle}</p>
            </div>
            <div className="badge-toast-actions">
              {onOpenTrophyCase && (
                <button
                  type="button"
                  className="badge-toast-btn primary"
                  onClick={() => {
                    setToasts(prev => prev.filter(t => t.id !== id))
                    onOpenTrophyCase()
                  }}
                >
                  View
                </button>
              )}
              <button
                type="button"
                className="badge-toast-btn dismiss"
                aria-label="Dismiss notification"
                onClick={() => setToasts(prev => prev.filter(t => t.id !== id))}
              >
                ✕
              </button>
            </div>
          </aside>
        )
      })}
    </div>
  )
}

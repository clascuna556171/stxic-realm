import { memo, useState, useEffect } from 'react'
import type { BannerShroudId } from './profile-model'

export type BannerShroudProps = {
  shroud?: BannerShroudId | string | null
  isEntrance?: boolean
  entranceKey?: string | number
}

export const BannerShroud = memo(function BannerShroud({
  shroud,
  isEntrance = false,
  entranceKey,
}: BannerShroudProps) {
  const [entering, setEntering] = useState(isEntrance)

  useEffect(() => {
    if (!isEntrance) {
      setEntering(false)
      return
    }
    setEntering(true)
    const timer = setTimeout(() => {
      setEntering(false)
    }, 2000)
    return () => clearTimeout(timer)
  }, [isEntrance, entranceKey, shroud])

  if (!shroud || shroud === 'none') return null

  if (shroud === 'crows') {
    return (
      <div className={`banner-shroud-layer banner-shroud-crows ${entering ? 'is-entrance' : ''}`} aria-hidden="true">
        {/* Entrance swoop flock */}
        {entering && (
          <div className="shroud-crow-swoop" aria-hidden="true">
            <svg viewBox="0 0 24 12" className="crow-svg">
              <path d="M0,7 Q6,0 12,5 Q18,0 24,7 Q16,3 12,8 Q8,3 0,7 Z" fill="#08090c" />
            </svg>
          </div>
        )}

        {/* Entrance feather flurry */}
        {entering && Array.from({ length: 8 }).map((_, i) => (
          <div
            key={`burst-${i}`}
            className="shroud-feather shroud-feather-burst"
            style={{
              left: `${8 + ((i * 13 + 3) % 84)}%`,
              top: `${-15 + (i % 3) * 5}%`,
              animationDelay: `${(i * 0.05).toFixed(2)}s`,
            }}
          />
        ))}

        {/* Distant gliding crows in the banner sky */}
        <div className="shroud-crow crow-1">
          <svg viewBox="0 0 24 12" className="crow-svg">
            <path d="M0,7 Q6,0 12,5 Q18,0 24,7 Q16,3 12,8 Q8,3 0,7 Z" fill="#0d0e12" />
          </svg>
        </div>
        <div className="shroud-crow crow-2">
          <svg viewBox="0 0 20 10" className="crow-svg">
            <path d="M0,6 Q5,0 10,4 Q15,0 20,6 Q13,2 10,6 Q7,2 0,6 Z" fill="#121318" />
          </svg>
        </div>
        <div className="shroud-crow crow-3">
          <svg viewBox="0 0 16 8" className="crow-svg">
            <path d="M0,5 Q4,0 8,3 Q12,0 16,5 Q10,2 8,5 Q6,2 0,5 Z" fill="#0a0a0d" />
          </svg>
        </div>

        {/* Drifting raven feathers cascading down the whole profile */}
        {Array.from({ length: 14 }).map((_, i) => (
          <div
            key={i}
            className={`shroud-feather ${i % 2 === 0 ? 'feather-drift' : 'feather-drift-alt'}`}
            style={{
              left: `${5 + ((i * 17 + 7) % 88)}%`,
              top: `${((i * 11) % 45) - 8}%`,
              animationDelay: `${(i * 0.7).toFixed(2)}s`,
              animationDuration: `${7.5 + (i % 4) * 1.2}s`,
            }}
          />
        ))}
      </div>
    )
  }

  if (shroud === 'embers') {
    return (
      <div className={`banner-shroud-layer banner-shroud-embers ${entering ? 'is-entrance' : ''}`} aria-hidden="true">
        <div className="shroud-ember-underglow" />

        {/* Entrance ember burst flurry */}
        {entering && Array.from({ length: 10 }).map((_, i) => (
          <span
            key={`burst-${i}`}
            className={`shroud-ember ember-${(i % 4) + 1} shroud-ember-burst`}
            style={{
              left: `${6 + ((i * 9.8 + 4) % 88)}%`,
              bottom: '-6px',
              animationDelay: `${(i * 0.05).toFixed(2)}s`,
            }}
          />
        ))}

        {/* Rising embers from the card base */}
        {Array.from({ length: 18 }).map((_, i) => (
          <span
            key={`base-${i}`}
            className={`shroud-ember ember-${(i % 4) + 1} ember-full`}
            style={{
              left: `${(i * 5.4 + 2) % 96}%`,
              bottom: '-8px',
              animationDelay: `${(i * 0.38).toFixed(2)}s`,
              animationDuration: `${4.2 + (i % 3) * 0.9}s`,
            }}
          />
        ))}
        {/* Mid-card embers rising through banner */}
        {Array.from({ length: 8 }).map((_, i) => (
          <span
            key={`mid-${i}`}
            className={`shroud-ember ember-${(i % 3) + 1} ember-mid`}
            style={{
              left: `${(i * 11.8 + 6) % 94}%`,
              top: 'calc(var(--banner-height, 180px) + 15px)',
              animationDelay: `${(i * 0.52).toFixed(2)}s`,
              animationDuration: `${3.4 + (i % 3) * 0.6}s`,
            }}
          />
        ))}
      </div>
    )
  }

  if (shroud === 'mist') {
    return (
      <div className={`banner-shroud-layer banner-shroud-mist ${entering ? 'is-entrance' : ''}`} aria-hidden="true">
        {/* Parting mist veil on entrance */}
        {entering && (
          <div className="shroud-mist-veil" aria-hidden="true">
            <div className="mist-veil-part left" />
            <div className="mist-veil-part right" />
          </div>
        )}
        <div className="shroud-mist-fog fog-card-bottom" />
        <div className="shroud-mist-fog fog-banner-seam" />
        <div className="shroud-mist-ambient" />
      </div>
    )
  }

  if (shroud === 'stardust') {
    return (
      <div className={`banner-shroud-layer banner-shroud-stardust ${entering ? 'is-entrance' : ''}`} aria-hidden="true">
        {/* Entrance diagonal celestial streak */}
        {entering && <div className="shroud-stardust-streak" aria-hidden="true" />}

        {/* Entrance blooming star bursts */}
        {entering && Array.from({ length: 8 }).map((_, i) => (
          <span
            key={`burst-${i}`}
            className={`shroud-star star-${(i % 3) + 1} shroud-star-burst`}
            style={{
              top: `${12 + ((i * 11) % 76)}%`,
              left: `${10 + ((i * 12) % 80)}%`,
              animationDelay: `${(i * 0.04).toFixed(2)}s`,
            }}
          />
        ))}

        {Array.from({ length: 24 }).map((_, i) => (
          <span
            key={i}
            className={`shroud-star star-${(i % 3) + 1}`}
            style={{
              top: `${4 + ((i * 15.3) % 92)}%`,
              left: `${5 + ((i * 21.7) % 89)}%`,
              animationDelay: `${(i * 0.32).toFixed(2)}s`,
              animationDuration: `${2.6 + (i % 3) * 0.8}s`,
            }}
          />
        ))}
      </div>
    )
  }

  return null
})

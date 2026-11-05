import { memo, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { BannerShroudId } from './profile-model'

export type FullScreenShroudProps = {
  shroud?: BannerShroudId | string | null
  active?: boolean
  durationMs?: number
  onComplete?: () => void
}

export const FullScreenShroud = memo(function FullScreenShroud({
  shroud,
  active = false,
  durationMs = 2400,
  onComplete,
}: FullScreenShroudProps) {
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!active || !shroud || shroud === 'none') {
      setVisible(false)
      return
    }

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    setVisible(true)

    const timer = setTimeout(() => {
      setVisible(false)
      onComplete?.()
    }, prefersReducedMotion ? 150 : durationMs)

    return () => clearTimeout(timer)
  }, [active, shroud, durationMs, onComplete])

  if (!mounted || !visible || !shroud || shroud === 'none' || typeof document === 'undefined') {
    return null
  }

  const content = (
    <aside
      className={`fullscreen-shroud-overlay fullscreen-shroud-${shroud}`}
      aria-label={`${shroud} atmospheric entrance transition`}
      aria-hidden="true"
      style={{ animationDuration: `${durationMs}ms` }}
    >
      <div className="fullscreen-shroud-backdrop" />

      {shroud === 'crows' && (
        <div className="fullscreen-crows-scene">
          {/* Flock of 6 crows swooping across the viewport */}
          <div className="fullscreen-crow-flock flock-bird-1">
            <svg viewBox="0 0 28 14" className="fullscreen-crow-svg">
              <path d="M0,8 Q7,0 14,6 Q21,0 28,8 Q19,3 14,9 Q9,3 0,8 Z" fill="#0b0d11" />
            </svg>
          </div>
          <div className="fullscreen-crow-flock flock-bird-2">
            <svg viewBox="0 0 28 14" className="fullscreen-crow-svg">
              <path d="M0,8 Q7,0 14,6 Q21,0 28,8 Q19,3 14,9 Q9,3 0,8 Z" fill="#0d0f14" />
            </svg>
          </div>
          <div className="fullscreen-crow-flock flock-bird-3">
            <svg viewBox="0 0 28 14" className="fullscreen-crow-svg">
              <path d="M0,8 Q7,0 14,6 Q21,0 28,8 Q19,3 14,9 Q9,3 0,8 Z" fill="#090a0e" />
            </svg>
          </div>
          <div className="fullscreen-crow-flock flock-bird-4">
            <svg viewBox="0 0 28 14" className="fullscreen-crow-svg">
              <path d="M0,8 Q7,0 14,6 Q21,0 28,8 Q19,3 14,9 Q9,3 0,8 Z" fill="#0b0d11" />
            </svg>
          </div>
          <div className="fullscreen-crow-flock flock-bird-5">
            <svg viewBox="0 0 28 14" className="fullscreen-crow-svg">
              <path d="M0,8 Q7,0 14,6 Q21,0 28,8 Q19,3 14,9 Q9,3 0,8 Z" fill="#0d0f14" />
            </svg>
          </div>
          <div className="fullscreen-crow-flock flock-bird-6">
            <svg viewBox="0 0 28 14" className="fullscreen-crow-svg">
              <path d="M0,8 Q7,0 14,6 Q21,0 28,8 Q19,3 14,9 Q9,3 0,8 Z" fill="#090a0e" />
            </svg>
          </div>

          {/* Cascading falling feathers across screen */}
          {Array.from({ length: 16 }).map((_, i) => (
            <div
              key={`crow-feather-${i}`}
              className="fullscreen-feather"
              style={{
                left: `${3 + ((i * 17 + 5) % 94)}%`,
                top: `${-10 - (i % 4) * 8}%`,
                animationDelay: `${(i * 0.075).toFixed(2)}s`,
                animationDuration: `${1.6 + (i % 3) * 0.35}s`,
                transform: `scale(${0.75 + (i % 4) * 0.2})`,
              }}
            />
          ))}
        </div>
      )}

      {shroud === 'embers' && (
        <div className="fullscreen-embers-scene">
          <div className="fullscreen-embers-underglow" />
          <div className="fullscreen-embers-burst-flare" />
          {Array.from({ length: 24 }).map((_, i) => (
            <div
              key={`fullscreen-ember-${i}`}
              className={`fullscreen-ember ember-type-${(i % 4) + 1}`}
              style={{
                left: `${2 + ((i * 13 + 7) % 96)}%`,
                bottom: `${-5 - (i % 3) * 10}px`,
                animationDelay: `${(i * 0.055).toFixed(2)}s`,
                animationDuration: `${1.55 + (i % 5) * 0.22}s`,
                width: `${3 + (i % 4) * 2}px`,
                height: `${3 + (i % 4) * 2}px`,
              }}
            />
          ))}
        </div>
      )}

      {shroud === 'mist' && (
        <div className="fullscreen-mist-scene">
          <div className="fullscreen-mist-cloud cloud-1" />
          <div className="fullscreen-mist-cloud cloud-2" />
          <div className="fullscreen-mist-cloud cloud-3" />
          <div className="fullscreen-mist-curtain-left" />
          <div className="fullscreen-mist-curtain-right" />
        </div>
      )}

      {shroud === 'stardust' && (
        <div className="fullscreen-stardust-scene">
          <div className="fullscreen-shooting-star star-streak-1" />
          <div className="fullscreen-shooting-star star-streak-2" />
          <div className="fullscreen-shooting-star star-streak-3" />
          {Array.from({ length: 28 }).map((_, i) => (
            <div
              key={`fullscreen-star-${i}`}
              className={`fullscreen-star star-size-${(i % 3) + 1}`}
              style={{
                left: `${3 + ((i * 19 + 11) % 94)}%`,
                top: `${5 + ((i * 23 + 7) % 88)}%`,
                animationDelay: `${(i * 0.06).toFixed(2)}s`,
                animationDuration: `${1.35 + (i % 4) * 0.28}s`,
              }}
            />
          ))}
        </div>
      )}
    </aside>
  )

  return createPortal(content, document.body)
})

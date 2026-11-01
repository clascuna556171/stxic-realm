import { useEffect, useRef, useState } from 'react'
import type { PetAnimationState, PetSpeciesId } from './pet-model.ts'
import { getPetPixels, getPetSpriteDimensions } from './pet-sprites.ts'

interface PetSpriteProps {
  speciesId: PetSpeciesId
  state?: PetAnimationState
  scale?: number
  animate?: boolean
  silhouette?: boolean
  className?: string
  label?: string
}

export function PetSprite({
  speciesId,
  state = 'idle',
  scale = 2,
  animate = true,
  silhouette = false,
  className = '',
  label,
}: PetSpriteProps) {
  const { width, height } = getPetSpriteDimensions(speciesId)
  const svgRef = useRef<SVGSVGElement>(null)
  const [frame, setFrame] = useState(0)
  const [inView, setInView] = useState(true)
  const [reducedMotion, setReducedMotion] = useState(() =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false,
  )

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReducedMotion(media.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    const el = svgRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0]) setInView(entries[0].isIntersecting)
      },
      { threshold: 0.05 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!animate || reducedMotion || !inView || silhouette) {
      setFrame(0)
      return
    }
    const intervalMs = state === 'walk' || state === 'happy' ? 220 : 380
    const timer = window.setInterval(() => {
      if (!document.hidden) {
        setFrame(prev => (prev + 1) % 4)
      }
    }, intervalMs)
    return () => window.clearInterval(timer)
  }, [animate, reducedMotion, inView, silhouette, state])

  const activeFrame = !animate || reducedMotion || silhouette ? 0 : frame
  const pixels = getPetPixels(speciesId, state, activeFrame)

  return (
    <svg
      ref={svgRef}
      className={`pet-pixel-sprite ${silhouette ? 'is-silhouette' : ''} ${className}`.trim()}
      width={width * scale}
      height={height * scale}
      viewBox={`0 0 ${width} ${height}`}
      shapeRendering="crispEdges"
      role={label ? 'img' : 'presentation'}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {pixels.map((p, idx) => (
        <rect
          key={idx}
          x={p.x}
          y={p.y}
          width={p.w}
          height={p.h}
          fill={silhouette ? '#151621' : p.color}
        />
      ))}
    </svg>
  )
}

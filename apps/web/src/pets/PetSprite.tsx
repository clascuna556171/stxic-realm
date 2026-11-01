import { useEffect, useState } from 'react'
import type { Direction } from '../world/room.ts'
import type { PetAnimationState, PetSpeciesId } from './pet-model.ts'
import { getPetPixels, getPetSpriteDimensions } from './pet-sprites.ts'
import { usePetMotion } from './usePetMotion.ts'

interface PetSpriteProps {
  speciesId: PetSpeciesId
  direction?: Direction
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
  direction = 'down',
  scale = 2,
  animate = true,
  silhouette = false,
  className = '',
  label,
}: PetSpriteProps) {
  const { width, height } = getPetSpriteDimensions(speciesId)
  const { ref: svgRef, reducedMotion, active } = usePetMotion<SVGSVGElement>()
  const [frame, setFrame] = useState(0)

  useEffect(() => {
    if (!animate || !active || silhouette) {
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
  }, [animate, active, silhouette, state])

  const activeFrame = !animate || reducedMotion || silhouette ? 0 : frame
  const pixels = getPetPixels(speciesId, state, activeFrame, direction)

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
          fill={silhouette ? 'var(--realm-muted)' : p.color}
        />
      ))}
    </svg>
  )
}

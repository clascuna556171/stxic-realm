import {useEffect, useRef} from 'react'

// Pointer-driven depth for profile cards. Purely decorative: it never moves
// focus, never runs for touch (scrolling wins) and is off for reduced motion.
export type Tilt = {nx: number; ny: number; gx: number; gy: number}
export const RESTING_TILT: Tilt = {nx: 0, ny: 0, gx: 50, gy: 30}
type Rect = {left: number; top: number; width: number; height: number}

const clamp = (value: number) => Math.min(1, Math.max(0, value))
const round = (value: number) => Math.round(value * 1000) / 1000

/** Normalized tilt (-1..1) and glare position (0..100%). Tall cards tilt less vertically so long profiles do not swing. */
export function tiltFromPointer(rect: Rect, x: number, y: number): Tilt {
 if (!(rect.width > 0 && rect.height > 0) || !Number.isFinite(x) || !Number.isFinite(y)) return RESTING_TILT
 const px = clamp((x - rect.left) / rect.width), py = clamp((y - rect.top) / rect.height)
 const verticalDamping = Math.min(1, 520 / rect.height)
 return {nx: round((px - .5) * 2), ny: round((py - .5) * 2 * verticalDamping), gx: round(px * 100), gy: round(py * 100)}
}

export function useCardTilt<T extends HTMLElement>() {
 const ref = useRef<T>(null)
 useEffect(() => {
  const element = ref.current
  if (!element) return
  const fine = matchMedia('(hover: hover) and (pointer: fine)'), reduced = matchMedia('(prefers-reduced-motion: reduce)')
  let frame = 0, pending: Tilt | null = null
  const apply = (tilt: Tilt) => {
   element.style.setProperty('--tilt-nx', String(tilt.nx))
   element.style.setProperty('--tilt-ny', String(tilt.ny))
   element.style.setProperty('--glare-x', `${tilt.gx}%`)
   element.style.setProperty('--glare-y', `${tilt.gy}%`)
  }
  const reset = () => {
   cancelAnimationFrame(frame); frame = 0; pending = null
   delete element.dataset.tilt
   apply(RESTING_TILT)
  }
  const move = (event: PointerEvent) => {
   if (event.pointerType === 'touch' || !fine.matches || reduced.matches) return
   pending = tiltFromPointer(element.getBoundingClientRect(), event.clientX, event.clientY)
   element.dataset.tilt = 'active'
   if (!frame) frame = requestAnimationFrame(() => { frame = 0; if (pending) apply(pending) })
  }
  element.addEventListener('pointermove', move)
  element.addEventListener('pointerleave', reset)
  reduced.addEventListener('change', reset)
  fine.addEventListener('change', reset)
  return () => {
   reset()
   element.removeEventListener('pointermove', move)
   element.removeEventListener('pointerleave', reset)
   reduced.removeEventListener('change', reset)
   fine.removeEventListener('change', reset)
  }
 }, [])
 return ref
}

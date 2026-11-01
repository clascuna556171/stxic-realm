import type { PetPersonality } from './pet-model.ts'

// Keep the left avatar overlap clear and inset the entire sprite from both edges.
export function bannerRoamBounds(width: number, spriteWidth: number) {
  const max = Math.max(0, width - spriteWidth - 12)
  const min = Math.min(154, max)
  return { min, max }
}

export function nextBannerStop(current: number, bounds: { min: number; max: number }, step: number, personality: PetPersonality) {
  const span = bounds.max - bounds.min
  const fraction = personality === 'Shy' ? 0.75 : personality === 'Loyal' ? 0.55 : [0.15, 0.85, 0.4, 0.95][step % 4]
  let x = bounds.min + span * fraction
  if (Math.abs(x - current) < span * 0.25) x = current > bounds.min + span / 2 ? bounds.min : bounds.max
  return Math.round(x)
}

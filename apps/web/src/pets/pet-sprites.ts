import { companionPixels } from './companion-art.ts'
import { triarchPixels } from './triarch-art.ts'
import { villageCatPixels } from './village-cat-art.ts'
import type { Direction } from '../world/room.ts'
import type { Pixel } from '../character.ts'
import type { PetAnimationState, PetSpeciesId } from './pet-model.ts'

export interface PetSpriteDimensions {
  width: number
  height: number
}

export function getPetSpriteDimensions(speciesId: PetSpeciesId): PetSpriteDimensions {
  if (speciesId === 'triarch') {
    return { width: 48, height: 36 }
  }
  return { width: 32, height: 32 }
}

/**
 * Generates authentic, bounded pixel-art frames for all 8 STXIC Realm pet species
 * across 5 animation states (idle, walk, sit, sleep, happy) and 4 frame ticks (0..3).
 */
export function getPetPixels(
  speciesId: PetSpeciesId,
  state: PetAnimationState = 'idle',
  frame = 0,
  direction: Direction = 'down',
): Pixel[] {
  const f = ((frame % 4) + 4) % 4
  if (speciesId === 'cat') return villageCatPixels(state, f, direction)
  if (speciesId === 'triarch') return triarchPixels(state, f, direction)
  return companionPixels(speciesId, state, f, direction)
}

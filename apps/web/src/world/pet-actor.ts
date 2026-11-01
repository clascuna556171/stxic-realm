import type { PetAnimationState, PetPersonality, PetSpeciesId } from '../pets/pet-model.ts'
import { canOccupy, getWalkableDirections, move, ROOM, type Direction, type Point, type RoomObject } from './room.ts'

export interface PetBehaviorState {
  id: string
  speciesId: PetSpeciesId
  personality: PetPersonality
  point: Point
  direction: Direction
  animState: PetAnimationState
  ticksInState: number
  stateDurationTicks: number
}

const FALLBACK_CANDIDATES: Point[] = [
  { x: 6, y: 8 },
  { x: 9, y: 8 },
  { x: 7, y: 7 },
  { x: 5, y: 5 },
  { x: 10, y: 8 },
  { x: 6, y: 5 },
  { x: 8, y: 7 },
  { x: 11, y: 9 },
]

export function isWalkableForPet(
  point: Point,
  objects: RoomObject[],
  occupiedPoints: ReadonlyArray<Point> = [],
): boolean {
  if (point.x === ROOM.spawn.x && point.y === ROOM.spawn.y) return false
  if (!canOccupy(point, objects)) return false
  return !occupiedPoints.some(p => p.x === point.x && p.y === point.y)
}

export function findSafePetTile(
  preferred: Point,
  objects: RoomObject[],
  occupiedPoints: ReadonlyArray<Point> = [],
): Point {
  if (isWalkableForPet(preferred, objects, occupiedPoints)) {
    return { x: preferred.x, y: preferred.y }
  }

  for (const candidate of FALLBACK_CANDIDATES) {
    if (isWalkableForPet(candidate, objects, occupiedPoints)) {
      return { ...candidate }
    }
  }

  // Breadth-first scan from room center to find any valid walkable tile
  for (let y = 1; y < ROOM.height - 1; y++) {
    for (let x = 1; x < ROOM.width - 1; x++) {
      const pt = { x, y }
      if (isWalkableForPet(pt, objects, occupiedPoints)) {
        return pt
      }
    }
  }

  // Ultimate fallback if every single tile is occupied
  return { x: ROOM.spawn.x, y: Math.max(1, ROOM.spawn.y - 1) }
}

/**
 * Deterministic-capable next behavior transition based on pet personality.
 */
export function chooseNextPetState(
  personality: PetPersonality,
  currentState: PetAnimationState,
  randomValue = Math.random(),
): { state: PetAnimationState; durationTicks: number } {
  const r = Math.max(0, Math.min(0.999, randomValue))

  switch (personality) {
    case 'Sleepy':
      if (r < 0.45) return { state: 'sleep', durationTicks: 10 }
      if (r < 0.78) return { state: 'sit', durationTicks: 7 }
      if (r < 0.92) return { state: 'idle', durationTicks: 5 }
      return { state: 'walk', durationTicks: 2 }

    case 'Playful':
      if (r < 0.48) return { state: 'walk', durationTicks: 3 }
      if (r < 0.72) return { state: 'happy', durationTicks: 4 }
      if (r < 0.9) return { state: 'idle', durationTicks: 4 }
      return { state: 'sit', durationTicks: 5 }

    case 'Curious':
      if (r < 0.45) return { state: 'walk', durationTicks: 3 }
      if (r < 0.78) return { state: 'sit', durationTicks: 5 }
      if (r < 0.94) return { state: 'idle', durationTicks: 5 }
      return { state: 'happy', durationTicks: 3 }

    case 'Shy':
      if (r < 0.4) return { state: 'sit', durationTicks: 8 }
      if (r < 0.72) return { state: 'sleep', durationTicks: 8 }
      if (r < 0.9) return { state: 'idle', durationTicks: 6 }
      return { state: 'walk', durationTicks: 2 }

    case 'Loyal':
      if (r < 0.42) return { state: 'walk', durationTicks: 2 }
      if (r < 0.76) return { state: 'sit', durationTicks: 6 }
      if (r < 0.92) return { state: 'idle', durationTicks: 5 }
      return { state: 'happy', durationTicks: 4 }

    case 'Mischievous':
      if (r < 0.5) return { state: 'walk', durationTicks: 3 }
      if (r < 0.75) return { state: 'happy', durationTicks: 4 }
      if (r < 0.9) return { state: 'idle', durationTicks: 3 }
      return { state: 'sit', durationTicks: 4 }
  }
}

export function stepPetBehavior(
  pet: PetBehaviorState,
  objects: RoomObject[],
  ownerPoint: Point,
  otherPetPoints: ReadonlyArray<Point> = [],
  randomValue = Math.random(),
): PetBehaviorState {
  // Verify current position is still valid after any furniture edits
  const safeCurrent = findSafePetTile(pet.point, objects, otherPetPoints)
  const relocated = safeCurrent.x !== pet.point.x || safeCurrent.y !== pet.point.y

  if (relocated) {
    return {
      ...pet,
      point: safeCurrent,
      animState: 'idle',
      ticksInState: 0,
      stateDurationTicks: 4,
    }
  }

  const nextTicks = pet.ticksInState + 1
  if (nextTicks < pet.stateDurationTicks) {
    return { ...pet, ticksInState: nextTicks }
  }

  const nextChoice = chooseNextPetState(pet.personality, pet.animState, randomValue)
  if (nextChoice.state !== 'walk') {
    return {
      ...pet,
      animState: nextChoice.state,
      ticksInState: 0,
      stateDurationTicks: nextChoice.durationTicks,
    }
  }

  // Pick a walkable adjacent step
  const dirs = getWalkableDirections(pet.point, objects).filter(dir => {
    const candidate = move(pet.point, dir, objects)
    return isWalkableForPet(candidate, objects, otherPetPoints)
  })

  if (dirs.length === 0) {
    return {
      ...pet,
      animState: 'sit',
      ticksInState: 0,
      stateDurationTicks: 5,
    }
  }

  let chosenDir = dirs[Math.floor(randomValue * dirs.length) % dirs.length]

  // Loyal pets prefer stepping closer to the owner avatar
  if (pet.personality === 'Loyal') {
    const best = dirs.reduce((bestDir, dir) => {
      const cand = move(pet.point, dir, objects)
      const bestCand = move(pet.point, bestDir, objects)
      const distCand = Math.abs(cand.x - ownerPoint.x) + Math.abs(cand.y - ownerPoint.y)
      const distBest = Math.abs(bestCand.x - ownerPoint.x) + Math.abs(bestCand.y - ownerPoint.y)
      return distCand < distBest && distCand >= 1 ? dir : bestDir
    }, chosenDir)
    chosenDir = best
  }

  // Shy pets prefer tiles closer to room perimeter walls
  if (pet.personality === 'Shy') {
    const best = dirs.reduce((bestDir, dir) => {
      const cand = move(pet.point, dir, objects)
      const bestCand = move(pet.point, bestDir, objects)
      const edgeDist = Math.min(cand.x, ROOM.width - 1 - cand.x, cand.y, ROOM.height - 1 - cand.y)
      const bestEdgeDist = Math.min(bestCand.x, ROOM.width - 1 - bestCand.x, bestCand.y, ROOM.height - 1 - bestCand.y)
      return edgeDist < bestEdgeDist ? dir : bestDir
    }, chosenDir)
    chosenDir = best
  }

  const nextPoint = move(pet.point, chosenDir, objects)
  return {
    ...pet,
    point: nextPoint,
    direction: chosenDir,
    animState: 'walk',
    ticksInState: 0,
    stateDurationTicks: 2,
  }
}

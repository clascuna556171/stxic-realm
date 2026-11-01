import type { PetAnimationState, PetPersonality, PetSpeciesId } from '../pets/pet-model.ts'
import { petRestTile } from './pet-corner.ts'
import { canOccupy, move, ROOM, type Direction, type Point, type RoomObject } from './room.ts'

export interface PetBehaviorState {
  id: string
  speciesId: PetSpeciesId
  personality: PetPersonality
  point: Point
  direction: Direction
  animState: PetAnimationState
  ticksInState: number
  stateDurationTicks: number
  target?: Point
  intent?: 'rest' | 'inspect' | 'follow' | 'retreat' | 'play'
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

const distance = (a: Point, b: Point) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
const same = (a: Point, b: Point) => a.x === b.x && a.y === b.y
const directions: Direction[] = ['up', 'down', 'left', 'right']

function floorAround(object: RoomObject): Point[] {
  const points: Point[] = []
  for (let x = object.x; x < object.x + object.width; x++) points.push({x, y:object.y-1}, {x, y:object.y+object.height})
  for (let y = object.y; y < object.y + object.height; y++) points.push({x:object.x-1, y}, {x:object.x+object.width, y})
  return points
}

/** One cardinal waypoint on a small room BFS. Replanned only on a behavior step,
 * so moved furniture, another pet, or a visitor can never invalidate a cached route. */
export function nextPetWaypoint(from: Point, target: Point, objects: RoomObject[], occupied: ReadonlyArray<Point> = []): Point | null {
  if (same(from, target)) return null
  const queue = [{point:from, first:from}], seen = new Set([`${from.x},${from.y}`])
  for (let i=0; i<queue.length; i++) {
    const current = queue[i]
    for (const direction of directions) {
      const point = move(current.point, direction, objects), key = `${point.x},${point.y}`
      if (seen.has(key) || !isWalkableForPet(point, objects, occupied)) continue
      seen.add(key)
      const first = i === 0 ? point : current.first
      if (same(point, target)) return first
      queue.push({point, first})
    }
  }
  return null
}

function chooseGoal(pet: PetBehaviorState, objects: RoomObject[], owner: Point, occupied: ReadonlyArray<Point>, random: number): {point:Point; intent:PetBehaviorState['intent']} | null {
  const usable = (p: Point) => isWalkableForPet(p, objects, occupied)
  const nearest = (points:Point[]) => points.filter(usable).sort((a,b)=>distance(a,pet.point)-distance(b,pet.point))[0]
  if (pet.personality === 'Sleepy') {
    const mat = petRestTile(objects, occupied)
    const bed = objects.find(o=>o.id==='bed')
    const point = mat ?? (bed && nearest(floorAround(bed)))
    if (point) return {point,intent:'rest'}
  }
  if (pet.personality === 'Loyal') {
    const point = nearest(directions.map(d=>move(owner,d,objects)).filter(p=>distance(p,owner)===1))
    if (point) return {point,intent:'follow'}
  }
  if (pet.personality === 'Curious' || pet.personality === 'Mischievous') {
    const interests = pet.personality === 'Curious' ? ['plant','bookshelf','lantern'] : ['console','desk','banner']
    const furnishings = objects.filter(o=>interests.includes(o.id))
    // Rotate the interest so a curious pet does not inspect one object forever.
    for (let i=0; i<furnishings.length; i++) {
      const object = furnishings[(Math.floor(random*furnishings.length)+i)%furnishings.length]
      const point = nearest(floorAround(object).filter(p=>distance(p,pet.point)>1))
      if (point) return {point,intent:'inspect'}
    }
  }
  const floor: Point[] = []
  for(let y=1;y<ROOM.height-1;y++)for(let x=1;x<ROOM.width-1;x++) {
    const p={x,y}
    if(usable(p) && distance(p,pet.point)>0 && distance(p,pet.point)<=4)floor.push(p)
  }
  if (pet.personality === 'Shy') {
    floor.sort((a,b)=> (distance(b,owner)-distance(a,owner)) || (Math.min(a.x,a.y,ROOM.width-1-a.x,ROOM.height-1-a.y)-Math.min(b.x,b.y,ROOM.width-1-b.x,ROOM.height-1-b.y)))
    if(floor[0])return {point:floor[0],intent:'retreat'}
  }
  if(!floor.length)return null
  return {point:floor[Math.floor(random*floor.length)%floor.length],intent:'play'}
}

export function stepPetBehavior(
  pet: PetBehaviorState,
  objects: RoomObject[],
  ownerPoint: Point,
  otherPetPoints: ReadonlyArray<Point> = [],
  randomValue = Math.random(),
  visitorPoints: ReadonlyArray<Point> = [],
): PetBehaviorState {
  const random = Math.max(0,Math.min(.999,randomValue))
  const occupied = [...otherPetPoints,ownerPoint,...visitorPoints]
  const nearestPerson = [ownerPoint,...visitorPoints].sort((a,b)=>distance(a,pet.point)-distance(b,pet.point))[0]
  const attentionPoint = pet.personality==='Shy' ? nearestPerson : ownerPoint
  const safeCurrent = findSafePetTile(pet.point, objects, otherPetPoints)
  if (!same(safeCurrent,pet.point)) return {...pet,point:safeCurrent,animState:'idle',ticksInState:0,stateDurationTicks:4,target:undefined,intent:undefined}

  const threatened = pet.personality==='Shy' && distance(pet.point,attentionPoint)<3 && pet.animState!=='happy'
  const ticks = pet.ticksInState+1
  if(ticks<pet.stateDurationTicks && !threatened)return {...pet,ticksInState:ticks}
  let target = pet.target && isWalkableForPet(pet.target,objects,occupied) ? pet.target : undefined
  if(target && same(target,pet.point)) {
    return {...pet,target:undefined,animState:pet.intent==='rest'?'sleep':pet.intent==='play'?'happy':'sit',ticksInState:0,stateDurationTicks:pet.intent==='rest'?12:5}
  }
  const choice = chooseNextPetState(pet.personality,pet.animState,random)
  if(!target && choice.state!=='walk' && !(pet.personality==='Sleepy' && choice.state==='sleep') && !threatened) {
    return {...pet,target:undefined,intent:undefined,animState:choice.state,ticksInState:0,stateDurationTicks:choice.durationTicks}
  }
  let intent = pet.intent
  if(!target || threatened || pet.personality==='Loyal') {
    const goal = chooseGoal(pet,objects,attentionPoint,occupied,random)
    target=goal?.point;intent=goal?.intent
  }
  if(target && same(target,pet.point))return {...pet,target:undefined,intent,animState:intent==='rest'?'sleep':'sit',ticksInState:0,stateDurationTicks:8}
  const point=target?nextPetWaypoint(pet.point,target,objects,occupied):null
  if(!point)return {...pet,target:undefined,intent:undefined,animState:'sit',ticksInState:0,stateDurationTicks:4}
  const direction:Direction=point.x>pet.point.x?'right':point.x<pet.point.x?'left':point.y>pet.point.y?'down':'up'
  return {...pet,point,direction,target,intent,animState:'walk',ticksInState:0,stateDurationTicks:1}
}

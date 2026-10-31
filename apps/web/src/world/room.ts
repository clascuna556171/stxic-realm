export type Point = { x: number; y: number }
export type Direction = 'up' | 'down' | 'left' | 'right'
export type RoomObject = { id: string; name: string; description: string; x: number; y: number; width: number; height: number }
export type RoomAction = { type: 'sit' | 'rest'; target: 'desk' | 'sofa' | string; label: string }

export const ROOM = { width: 16, height: 12, spawn: { x: 8, y: 9 } } as const
export const OBJECTS: RoomObject[] = [
  { id: 'desk', name: 'Project desk', description: 'A place for projects and links. Object actions will be connected later.', x: 2, y: 2, width: 3, height: 2 },
  { id: 'bookshelf', name: 'Bookshelf', description: 'A shelf for the things you want to share.', x: 11, y: 2, width: 2, height: 2 },
  { id: 'sofa', name: 'Sofa', description: 'A place to sit together. Sitting and visitors are not available yet.', x: 3, y: 6, width: 3, height: 2 },
  { id: 'lantern', name: 'Lantern', description: 'A warm medieval-inspired lantern.', x: 7, y: 3, width: 1, height: 1 },
  { id: 'banner', name: 'Banner', description: 'A decorative medieval-inspired banner.', x: 9, y: 3, width: 1, height: 1 },
  { id: 'console', name: 'Tech console', description: 'A compact tech-inspired display.', x: 10, y: 6, width: 1, height: 1 },
  { id: 'plant', name: 'Plant', description: 'A little greenery for the room.', x: 12, y: 7, width: 1, height: 1 },
  { id: 'bed', name: 'Linen bed', description: 'Layered linen and a soft quilt. A quiet corner to unwind.', x: 12, y: 4, width: 2, height: 3 },
  { id: 'coffee-table', name: 'Coffee table', description: 'An open notebook, a warm drink and a moment to yourself.', x: 4, y: 8, width: 2, height: 1 },
  { id: 'floor-lamp', name: 'Reading lamp', description: 'A paper shade and a little warm light for the reading corner.', x: 2, y: 5, width: 1, height: 1 },
]
const offsets: Record<Direction, Point> = { up: {x:0,y:-1}, down: {x:0,y:1}, left: {x:-1,y:0}, right: {x:1,y:0} }

export function canOccupy(point: Point, objects: RoomObject[] = OBJECTS): boolean {
  return Number.isInteger(point.x) && Number.isInteger(point.y) && point.x >= 1 && point.x < ROOM.width - 1 && point.y >= 1 && point.y < ROOM.height - 1 && !objects.some(o => point.x >= o.x && point.x < o.x + o.width && point.y >= o.y && point.y < o.y + o.height)
}

export function move(point: Point, direction: Direction, objects: RoomObject[] = OBJECTS): Point {
  const delta = offsets[direction]; const next = { x: point.x + delta.x, y: point.y + delta.y }
  return canOccupy(next, objects) ? next : point
}

/** Returns the designated seat/action target point for interactive objects */
export function getObjectActionSeat(objectId: string, objects: RoomObject[] = OBJECTS): Point | null {
  const obj = objects.find(o => o.id === objectId)
  if (!obj) return null
  if (objectId === 'desk') {
    // Ergonomic gaming chair position in front of PC desk
    return { x: obj.x + 1, y: obj.y + 1 }
  }
  if (objectId === 'sofa') {
    // Middle seat of the plush sofa
    return { x: obj.x + 1, y: obj.y }
  }
  return { x: obj.x, y: obj.y }
}

/** Get valid adjacent directions a character can walk towards */
export function getWalkableDirections(point: Point, objects: RoomObject[] = OBJECTS): Direction[] {
  const allDirs: Direction[] = ['up', 'down', 'left', 'right']
  return allDirs.filter(dir => {
    const next = move(point, dir, objects)
    return next.x !== point.x || next.y !== point.y
  })
}

/** Pick a random adjacent walkable tile to wander to */
export function getRandomWalkableStep(point: Point, objects: RoomObject[] = OBJECTS): Point {
  const dirs = getWalkableDirections(point, objects)
  if (dirs.length === 0) return point
  const picked = dirs[Math.floor(Math.random() * dirs.length)]
  return move(point, picked, objects)
}

import { OBJECTS, ROOM, type RoomObject } from './room.ts'

export const STORAGE_KEY = 'stxic-realm:local-home:v1'
export type Layout = { schemaVersion: 1; objects: RoomObject[] }
export function starterLayout(): Layout { return { schemaVersion: 1, objects: OBJECTS.map(o => ({...o})) } }
export function validateLayout(value: unknown): string | null {
  if (!value || typeof value !== 'object') return 'Layout is not a valid object.'
  const input = value as { schemaVersion?: unknown; objects?: unknown }
  if (input.schemaVersion !== 1 || !Array.isArray(input.objects) || input.objects.length > OBJECTS.length) return 'Layout version or object count is invalid.'
  const ids = new Set<string>(); const occupied = new Set<string>()
  for (const entry of input.objects) {
    if (!entry || typeof entry !== 'object') return 'Invalid furniture item.'
    const item = entry as RoomObject; const asset = OBJECTS.find(o => o.id === item.id)
    if (!asset || ids.has(item.id) || item.width !== asset.width || item.height !== asset.height) return 'Unknown or duplicate furniture item.'
    if (!Number.isInteger(item.x) || !Number.isInteger(item.y) || item.x < 1 || item.y < 1 || item.x + item.width > ROOM.width - 1 || item.y + item.height > ROOM.height - 1) return `${asset.name} must fit inside the room.`
    ids.add(item.id)
    for (let y=item.y; y<item.y+item.height; y++) for (let x=item.x; x<item.x+item.width; x++) {
      const tile = `${x},${y}`; if (occupied.has(tile)) return 'Furniture cannot overlap.'
      if (x === ROOM.spawn.x && y === ROOM.spawn.y) return 'Keep the entry tile clear.'
      occupied.add(tile)
    }
  }
  return null
}
export function parseLayout(raw: string): Layout | null {
  try {
    const value = JSON.parse(raw) as Layout
    if (validateLayout(value)) return null
    // Display copy is not layout identity. Rehydrate catalog metadata while keeping
    // the saved arrangement; never repair unknown assets or invalid geometry.
    return {schemaVersion:1,objects:value.objects.map(item=>({...OBJECTS.find(o=>o.id===item.id)!,x:item.x,y:item.y}))}
  } catch { return null }
}
export function placeObject(layout: Layout, item: RoomObject, x: number, y: number): {layout: Layout; error: string | null} {
  const placed = {...item, x, y}; const objects = layout.objects.some(o => o.id === item.id) ? layout.objects.map(o => o.id === item.id ? placed : o) : [...layout.objects, placed]
  const next: Layout = {schemaVersion: 1, objects}; const error = validateLayout(next)
  return {layout: error ? layout : next, error}
}

import type { Appearance } from '../appearance.ts'
import type { Pixel } from '../character.ts'
import { worldPalettes } from './palette.ts'
import { canOccupy, ROOM, type Point, type RoomObject } from './room.ts'

// A floor textile beside the sofa, never a new blocking furniture footprint.
export function petRestTile(objects: RoomObject[], occupied: ReadonlyArray<Point> = []): Point | null {
  const sofa = objects.find(o => o.id === 'sofa')
  if (!sofa) return null
  const candidates = [
    { x: sofa.x + sofa.width, y: sofa.y + sofa.height - 1 },
    { x: sofa.x - 1, y: sofa.y + sofa.height - 1 },
    ...Array.from({ length: sofa.width }, (_, i) => ({ x: sofa.x + i, y: sofa.y + sofa.height })),
  ]
  return candidates.find(p => canOccupy(p, objects) && !(p.x === ROOM.spawn.x && p.y === ROOM.spawn.y) && !occupied.some(o => o.x === p.x && o.y === p.y)) ?? null
}

export function petCornerPixels(objects: RoomObject[], mood: Appearance['mood']): Pixel[] {
  const point = petRestTile(objects)
  if (!point) return []
  const p = worldPalettes[mood], pixels: Pixel[] = []
  const r = (x: number, y: number, w: number, h: number, color: string) => pixels.push({ x: point.x * 32 + x, y: point.y * 32 + y, w, h, color })
  r(3, 13, 26, 16, p.timber[0]); r(4, 11, 24, 16, p.cloth[0])
  r(5, 12, 22, 14, p.cloth[1]); r(7, 14, 18, 10, p.cloth[0])
  r(9, 15, 14, 8, p.cloth[1]); r(10, 15, 12, 1, p.cloth[2])
  for (let x = 5; x < 28; x += 3) { r(x, 27, 1, 2, p.trim); r(x, 11, 1, 1, p.trim) }
  r(6, 13, 1, 12, p.trim); r(25, 13, 1, 12, p.trim)
  // Low ceramic dish, blue water and one upper-left reflected highlight.
  r(22, 6, 8, 4, p.timber[0]); r(23, 5, 6, 4, p.stone[2])
  r(24, 6, 4, 1, p.sky[0]); r(24, 6, 1, 1, p.sky[2])
  return pixels
}

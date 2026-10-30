import type { Appearance } from '../appearance'
import type { RoomObject } from './room.ts'

export type RoomLight = { x: number; y: number; rx: number; ry: number; color: string; strength: number }

/** Ground lighting shared by the SVG artwork and the interactive room renderer. */
export function roomLighting(mood: Appearance['mood'], objects: RoomObject[], enabled: Record<string,boolean> = {}): RoomLight[] {
 const warm = mood === 'tech' ? '#96cbd9' : '#ffd18b'
 const lights: RoomLight[] = [
  { x: 244, y: 62, rx: 74, ry: 42, color: warm, strength: .2 },
  { x: 202, y: 340, rx: 28, ry: 24, color: '#ffd18b', strength: .24 },
  { x: 310, y: 340, rx: 28, ry: 24, color: '#ffd18b', strength: .24 },
 ]
 for (const item of objects) {
  if(enabled[item.id]===false)continue
  if (item.id === 'lantern' || item.id === 'floor-lamp') lights.push({ x: item.x * 32 + 16, y: item.y * 32 + 18, rx: 46, ry: 34, color: '#ffd18b', strength: .22 })
  if (item.id === 'desk' || item.id === 'console') lights.push({ x: (item.x + item.width / 2) * 32, y: item.y * 32 + 12, rx: item.width * 18, ry: 28, color: '#8fcac1', strength: .12 })
  if (item.id === 'bookshelf') lights.push({ x: item.x * 32 + 14, y: item.y * 32 - 10, rx: 30, ry: 28, color: '#ffd18b', strength: .14 })
 }
 return lights
}

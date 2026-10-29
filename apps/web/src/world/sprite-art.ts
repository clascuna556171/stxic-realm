import type { Pixel } from '../character'
import { worldPalettes, type WorldMood } from './palette.ts'
import { shelfRuns } from './spritefusion-shelf.ts'

const cache = new Map<WorldMood, Pixel[]>()
// The same furnishing works in every scene. Only its warm timber changes material;
// books, foliage, ivory and the little lantern retain their own colors.
export function libraryShelfPixels(mood: WorldMood): Pixel[] {
 const saved = cache.get(mood)
 if (saved) return saved
 const c = worldPalettes[mood]
 const pixels = shelfRuns.map(([x, y, w, h, original]) => {
  let color = original
  const r = parseInt(color.slice(1,3),16), g = parseInt(color.slice(3,5),16), b = parseInt(color.slice(5,7),16)
  if (mood !== 'cozy' && r > g * 1.16 && g > b * 1.18 && r - b > 30) {
   const shade = Math.max(0, Math.min(2, Math.floor((r + g + b) / 3 / 73)))
   color = c.timber[shade]
  }
  return {x,y,w,h,color}
 })
 cache.set(mood, pixels)
 return pixels
}

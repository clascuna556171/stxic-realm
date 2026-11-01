import type { Pixel } from '../character.ts'
import type { Direction } from '../world/room.ts'
import type { PetAnimationState } from './pet-model.ts'

// Hero asset: warm tabby, cream muzzle/paws and oxblood scarf. One pixel grid,
// upper-left highlights and bottom-center ground anchor across all four views.
const fur = { ink: '#30251f', dark: '#67503e', base: '#a27c56', light: '#c6a374', cream: '#efdbb3', scarf: '#963e3d', fold: '#642b30', pink: '#c88879' }

export function villageCatPixels(state: PetAnimationState, frame: number, facing: Direction): Pixel[] {
  const pixels: Pixel[] = []
  const r = (x: number, y: number, w: number, h: number, color: string) => pixels.push({ x, y, w, h, color })
  const f = frame % 4
  const bob = state === 'happy' && f % 2 === 0 ? -1 : 0
  const closed = state === 'sleep' || (state === 'idle' && f === 3)
  const step = state === 'walk' ? f % 2 : 0
  const { ink, dark, base, light, cream, scarf, fold, pink } = fur

  if (state === 'sleep') {
    // A real curled silhouette: lowered head and a wrapping tail, not a translated idle pose.
    r(5, 20, 22, 8, ink); r(7, 18, 17, 9, dark); r(9, 17, 13, 8, base)
    r(10, 18, 10, 2, light); r(10, 22, 13, 4, cream)
    r(4, 20, 10, 7, ink); r(5, 21, 9, 5, base)
    r(5, 18, 3, 4, ink); r(6, 19, 1, 2, pink)
    r(7, 24, 3, 1, ink); r(11, 25, 1, 1, pink)
    r(14, 21, 3, 5, scarf); r(15, 24, 4, 2, fold)
    r(18, 24, 9, 3, dark); r(16, 26, 10, 2, base); r(13, 26, 5, 2, light)
    r(21, 18, 2, 3, dark); r(17, 18, 2, 2, dark)
  } else if (facing === 'left' || facing === 'right') {
    // Right-facing profile, mirrored on the pixel grid for left. Nose and scarf lead the walk.
    r(3, 15 + (f === 2 ? 1 : 0), 3, 10, ink); r(4, 16, 3, 7, base)
    r(5, 22, 6, 4, dark); r(9, 17 + bob, 15, 10, ink)
    r(10, 18 + bob, 13, 8, base); r(11, 18 + bob, 8, 2, light)
    r(10, 22 + bob, 4, 3, dark); r(14, 23 + bob, 8, 3, cream)
    r(11, 25 - step, 3, 4, ink); r(12, 26 - step, 3, 2, cream)
    r(20, 25 - (state === 'walk' ? 1 - step : 0), 3, 4, ink)
    r(21, 26 - (state === 'walk' ? 1 - step : 0), 3, 2, cream)
    r(17, 10 + bob, 11, 10, ink); r(18, 11 + bob, 9, 8, base)
    r(17, 6 + bob, 4, 6, ink); r(18, 7 + bob, 2, 4, light); r(19, 9 + bob, 1, 2, pink)
    r(24, 8 + bob, 3, 4, dark); r(18, 11 + bob, 5, 2, light)
    r(24, 16 + bob, 5, 3, cream); r(28, 16 + bob, 1, 1, pink)
    r(24, 13 + bob, 2, closed ? 1 : 2, ink)
    r(17, 18 + bob, 8, 3, scarf); r(16, 20 + bob, 3, 4, fold); r(17, 21 + bob, 3, 2, scarf)
    r(12, 20 + bob, 2, 3, dark); r(15, 19 + bob, 2, 2, dark)
  } else {
    // Front and rear share volume and foot baseline; the rear has no face painted onto it.
    r(4, 17, 3, 9, ink); r(5, 16 + (f === 2 ? 1 : 0), 3, 8, base)
    r(6, 24, 5, 3, dark); r(9, 17 + bob, 14, 11, ink)
    r(10, 18 + bob, 12, 9, base); r(11, 18 + bob, 5, 3, light)
    r(10, 23 + bob, 3, 3, dark)
    if (facing === 'down') r(14, 20 + bob, 7, 6, cream)
    else { r(15, 20 + bob, 2, 6, dark); r(12, 22 + bob, 8, 1, dark) }
    r(10, 26 - step, 5, 3, ink); r(11, 26 - step, 4, 2, cream)
    r(18, 26 - (state === 'walk' ? 1 - step : 0), 5, 3, ink)
    r(19, 26 - (state === 'walk' ? 1 - step : 0), 3, 2, cream)
    r(9, 8 + bob, 16, 11, ink); r(10, 9 + bob, 14, 9, base)
    r(11, 9 + bob, 11, 2, light)
    r(9, 4 + bob, 5, 6, ink); r(10, 5 + bob, 3, 4, light)
    r(20, 4 + bob, 5, 6, ink); r(21, 5 + bob, 3, 4, base)
    if (facing === 'down') {
      r(11, 7 + bob, 1, 2, pink); r(22, 7 + bob, 1, 2, pink)
      r(11, 14 + bob, 12, 3, cream)
      r(12, 12 + bob, 2, closed ? 1 : 2, ink); r(20, 12 + bob, 2, closed ? 1 : 2, ink)
      r(16, 14 + bob, 2, 1, pink); r(16, 15 + bob, 1, 1, ink)
      r(15, 9 + bob, 1, 2, dark); r(18, 9 + bob, 1, 2, dark)
    } else { r(14, 11 + bob, 2, 3, dark); r(19, 11 + bob, 2, 3, dark) }
    r(10, 18 + bob, 13, 3, scarf); r(11, 20 + bob, 11, 1, fold)
    r(facing === 'up' ? 15 : 18, 21 + bob, 3, 3, scarf)
    if (state === 'sit') { r(11, 23, 10, 4, base); r(12, 25, 4, 3, cream); r(18, 25, 4, 3, cream) }
  }
  if (state === 'happy') {
    r(27, 4 + f % 2, 1, 4, cream); r(26, 5 + f % 2, 3, 1, cream)
    r(4, 5 + (1 - f % 2), 1, 2, light)
  }
  return facing === 'left' ? pixels.map(p => ({ ...p, x: 32 - p.x - p.w })) : pixels
}

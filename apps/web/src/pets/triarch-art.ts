import type { Pixel } from '../character.ts'
import type { Direction } from '../world/room.ts'
import type { PetAnimationState } from './pet-model.ts'

// Original 48×36 asset. Two hind legs, wing arms, three watchful heads.
// Gold follows the leading edges; violet membranes stay inside the silhouette.
const c = { ink: '#15151e', shade: '#292a39', scale: '#444658', light: '#66687a', purple: '#713e88', membrane: '#a269b2', fold: '#482951', gold: '#cca35c', shine: '#f0d69a', bronze: '#84613c', eye: '#ffc775' }

export function triarchPixels(state: PetAnimationState, frame: number, facing: Direction): Pixel[] {
  const pixels: Pixel[] = []
  const r = (x: number, y: number, w: number, h: number, color: string) => {
    pixels.push({ x, y, w, h, color })
  }
  // Rasterize silhouettes on the native grid; no smoothing or subpixel vertices.
  const polygon = (points: number[][], color: string) => {
    for (let y = 0; y < 36; y++) {
      const row: number[] = []
      for (let x = 0; x < 48; x++) {
        let inside = false
        for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
          const [ax, ay] = points[i], [bx, by] = points[j]
          if ((ay > y + .5) !== (by > y + .5) && x + .5 < (bx - ax) * (y + .5 - ay) / (by - ay) + ax) inside = !inside
        }
        if (inside) row.push(x)
      }
      // A silhouette may have multiple spans at a scalloped edge.
      for (let i = 0; i < row.length;) {
        const start = row[i]
        let end = start
        while (++i < row.length && row[i] === end + 1) end = row[i]
        r(start, y, end - start + 1, 1, color)
      }
    }
  }
  const f = ((frame % 4) + 4) % 4
  const sleeping = state === 'sleep'
  const sitting = state === 'sit'
  const stride = state === 'walk' ? [0, 1, 0, -1][f] : 0
  const lift = state === 'happy' ? [0, -1, -2, -1][f] : 0
  const closed = sleeping || (state === 'idle' && f === 3)
  const side = facing === 'left' || facing === 'right'
  const rear = facing === 'up'

  if (sleeping) {
    // All three chins rest on the coil; folded wings replace the tall outline.
    r(9, 24, 30, 9, c.ink); r(12, 22, 22, 10, c.shade)
    r(14, 23, 18, 4, c.scale); r(14, 23, 10, 1, c.light)
    r(26, 20, 8, 10, c.ink); r(27, 21, 5, 8, c.fold)
    r(28, 22, 2, 5, c.purple); r(27, 21, 5, 1, c.gold)
    for (const [x, y] of [[7, 25], [17, 24], [27, 26]]) {
      r(x, y, 10, 6, c.ink); r(x + 1, y + 1, 8, 4, c.scale)
      r(x + 2, y - 2, 2, 3, c.gold); r(x + 3, y - 3, 2, 1, c.shine)
      r(x + 2, y + 3, 3, 1, c.ink); r(x + 6, y + 4, 3, 1, c.bronze)
    }
    r(32, 29, 10, 3, c.shade); r(35, 28, 8, 2, c.scale)
    r(41, 25, 3, 4, c.gold); r(42, 24, 2, 2, c.shine)
    r(16, 32, 23, 2, c.scale); r(14, 32, 9, 1, c.gold)
  } else if (side) {
    // Right-facing profile; three necks emerge at different heights, never one flat mask.
    r(2, 28, 13, 3, c.ink); r(5, 27, 11, 3, c.shade)
    r(1, 25, 3, 4, c.gold); r(7, 26, 2, 2, c.bronze)
    r(13, 23 + lift, 21, 8, c.ink); r(15, 24 + lift, 17, 6, c.shade)
    r(18, 24 + lift, 13, 3, c.scale); r(21, 25 + lift, 8, 1, c.light)
    // Far wing, swept back with a pointed elbow and scalloped trailing edge.
    const wing = sitting ? 3 : (state === 'happy' ? -2 : f === 2 ? -1 : 0)
    const sw = (points: number[][], color: string) => polygon(points.map(([x, y]) => [x, y + wing]), color)
    sw([[26,27],[21,22],[18,24],[16,21],[12,23],[11,19],[6,21],[10,13],[18,6],[21,14],[24,19]], c.ink)
    sw([[24,25],[20,20],[18,22],[16,19],[13,21],[12,17],[9,19],[12,14],[18,9],[20,15]], c.purple)
    sw([[12,14],[18,9],[17,15],[14,19],[13,16],[9,19]], c.membrane)
    sw([[18,9],[20,15],[24,25],[20,20],[18,22],[18,16]], c.fold)
    sw([[10,13],[18,6],[20,8],[12,14]], c.gold)
    r(17, 7 + wing, 2, 2, c.shine)
    sw([[18,9],[19,10],[18,21],[17,20]], c.bronze)
    r(16 + stride, 29, 4, 5, c.ink); r(17 + stride, 30, 3, 3, c.scale)
    r(16 + stride, 33, 6, 2, c.gold)
    r(28 - stride, 29, 4, 5, c.ink); r(29 - stride, 30, 3, 3, c.scale)
    r(28 - stride, 33, 6, 2, c.gold)
    for (const [i, x, y] of [[0, 28, 7], [1, 36, 12], [2, 36, 21]]) {
      const glance = state === 'idle' && f === i ? -1 : 0
      const yy = y + lift + glance
      polygon([[x,yy+3],[x+2,yy+5],[x-1,27],[x-7,28],[x-5,24],[x-4,yy+8],[x-3,yy+4]], c.ink)
      polygon([[x-1,yy+5],[x,yy+6],[x-3,25],[x-5,26],[x-3,yy+9]], c.scale)
      r(x - 1, yy, 8, 6, c.ink); r(x, yy + 1, 6, 4, c.scale)
      r(x + 4, yy + 3, 5, 2, c.ink); r(x + 4, yy + 3, 4, 1, c.shade)
      r(x - 2, yy - 2, 3, 3, c.gold); r(x - 3, yy - 3, 2, 2, c.shine)
      r(x + 2, yy + 2, 2, 1, closed ? c.ink : c.eye)
      r(x, yy + 1, 3, 1, c.light); r(x + 6, yy + 5, 2, 1, c.bronze)
    }
  } else {
    // Symmetric mass, asymmetric head glances. Rear view has dorsal plates, no eyes.
    const wing = sitting ? 3 : state === 'happy' ? -2 : f === 2 ? -1 : 0
    for (const mirror of [false, true]) {
      const w = (x: number, y: number, width: number, height: number, color: string) => r(mirror ? 48 - x - width : x, y + wing, width, height, color)
      const wp = (points: number[][], color: string) => polygon(points.map(([x, y]) => [mirror ? 48 - x : x, y + wing]), color)
      wp([[19,27],[15,27],[12,24],[9,26],[7,22],[1,24],[4,16],[9,8],[13,13],[14,19]], c.ink)
      wp([[16,25],[13,22],[10,23],[8,20],[4,21],[6,16],[9,11],[12,15],[13,20]], c.purple)
      wp([[4,21],[6,16],[9,11],[10,15],[8,20],[7,19]], c.membrane)
      wp([[10,14],[12,15],[13,20],[16,25],[13,22],[10,23]], c.fold)
      wp([[4,16],[9,8],[11,10],[6,17]], c.gold)
      w(8, 10, 2, 1, c.shine)
      wp([[9,12],[10,13],[10,22],[9,21]], c.bronze)
    }
    r(17, 21 + lift, 14, 11, c.ink); r(18, 22 + lift, 12, 9, c.shade)
    r(20, 23 + lift, 8, 7, rear ? c.scale : c.bronze)
    for (let y = 24; y < 30; y += 2) r(21, y + lift, 6, 1, rear ? c.light : c.gold)
    r(15 + stride, 29, 5, 5, c.ink); r(16 + stride, 30, 3, 3, c.scale)
    r(14 + stride, 33, 7, 2, c.gold)
    r(28 - stride, 29, 5, 5, c.ink); r(29 - stride, 30, 3, 3, c.scale)
    r(28 - stride, 33, 7, 2, c.gold)
    r(31, 28, 8, 4, c.ink); r(32, 28, 5, 3, c.shade)
    r(36, 26, 4, 4, c.scale); r(38, 24, 3, 3, c.gold)
    for (const [i, x, y] of [[0, 11, 11], [1, 20, 5], [2, 30, 12]]) {
      const yy = y + lift + (state === 'idle' && f === i ? -1 : 0) + (sitting ? 2 : 0)
      if (i === 1) {
        r(x + 2, yy + 5, 5, 23 - y, c.ink); r(x + 3, yy + 6, 3, 21 - y, c.scale)
        r(x + 4, yy + 7, 1, 18 - y, rear ? c.gold : c.bronze)
      } else {
        const nx = i === 0 ? x + 3 : x + 2
        const bend = i === 0 ? 5 : -5
        polygon([[nx,yy+4],[nx+4,yy+4],[nx+4,yy+8],[nx+4+bend,25],[nx+bend,27],[nx,yy+9]], c.ink)
        polygon([[nx+1,yy+5],[nx+3,yy+5],[nx+3,yy+8],[nx+3+bend,25],[nx+1+bend,25],[nx+1,yy+9]], c.scale)
      }
      r(x, yy, 9, 7, c.ink); r(x + 1, yy + 1, 7, 5, c.scale)
      r(x + 1, yy + 1, 5, 1, c.light)
      r(x, yy - 2, 2, 3, c.gold); r(x + 7, yy - 2, 2, 3, c.gold)
      r(x - 1, yy - 3, 2, 2, c.shine); r(x + 8, yy - 3, 2, 2, c.bronze)
      if (!rear) {
        r(x + 1, yy + 3, 2, 1, closed ? c.ink : c.eye)
        r(x + 6, yy + 3, 2, 1, closed ? c.ink : c.eye)
        r(x + 2, yy + 5, 5, 2, c.shade); r(x + 3, yy + 6, 3, 1, c.gold)
      } else r(x + 4, yy + 2, 1, 4, c.gold)
    }
  }
  if (state === 'happy') {
    // A contained ember greeting, not an ambient particle effect.
    for (const [x, y] of [[3, 6], [43, 7], [24, 1]]) {
      r(x, y + f % 2, 2, 2, c.purple); r(x, y + f % 2, 1, 1, c.shine)
    }
  }
  return facing === 'left' ? pixels.map(p => ({ ...p, x: 48 - p.x - p.w })) : pixels
}

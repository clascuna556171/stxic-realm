import type { Appearance } from '../appearance.ts'
import type { Pixel } from '../character.ts'
import { CHARACTER_WIDTH } from '../character.ts'
import { worldPalettes } from './palette.ts'
import type { Direction, RoomObject } from './room.ts'

export type AmbientMote = { x: number; y: number; size: number; color: string; alpha: number }

/**
 * Deterministic frame-stepped pixel animations that bring the 2D Home room to life:
 * steaming mugs, breathing/blinking pets, active monitors, bouncing equalizer bars,
 * flickering lantern flames, swaying foliage, and twinkling window skylines.
 */
export function roomAmbientPixels(
 mood: Appearance['mood'],
 objects: RoomObject[],
 tick: number,
 enabled: Record<string, boolean> = {},
): Pixel[] {
 const step = Math.max(0, Math.floor(tick))
 const p: Pixel[] = []
 const r = (x: number, y: number, w: number, h: number, color: string) => {
  const x0 = Math.max(0, Math.floor(x))
  const y0 = Math.max(0, Math.floor(y))
  const x1 = Math.min(512, Math.floor(x + w))
  const y1 = Math.min(384, Math.floor(y + h))
  if (x1 > x0 && y1 > y0) p.push({ x: x0, y: y0, w: x1 - x0, h: y1 - y0, color })
 }

 const mat = worldPalettes[mood]
 const cyan = mood === 'tech' ? '#77d8dc' : '#9bc2b5'
 const accent = mat.cloth[2]
 const trim = mat.trim
 const ink = '#19202b'
 const gold = '#f6cd7b'
 const goldBright = '#fff3c4'

 // 1. Window sky twinkle, drifting clouds & skyline window life
 const skyPhase = step % 8
 if (mood === 'cozy') {
  const driftA = (step >> 1) % 6
  const driftB = ((step + 3) >> 1) % 6
  r(201 + driftA, 24, 14, 3, '#dce8d8')
  r(205 + driftA, 22, 8, 2, '#eef5ec')
  r(248 + driftB, 29, 15, 3, '#dce8d8')
 } else {
  const stars = [
   [202, 22],
   [216, 25],
   [226, 20],
   [237, 27],
   [252, 24],
   [264, 21],
  ] as const
  stars.forEach(([sx, sy], i) => {
   const bright = (step + i * 3) % 5 === 0
   r(sx, sy, bright ? 2 : 1, bright ? 2 : 1, bright ? '#ffffff' : '#fff0b8')
  })
 }
 // Distant skyline windows softly winking across the panorama window
 for (let i = 0; i < 13; i++) {
  if ((i + skyPhase) % 4 === 0) {
   const bh = 6 + ((i * 9 + (mood === 'medieval' ? 5 : 2)) % 18)
   const bx = 193 + i * 8
   r(bx + 2, 49 - bh, 2, 2, (step + i) % 2 === 0 ? goldBright : gold)
  }
 }
 // Exterior bay water shimmer on far right (x: 490..508)
 for (let wy = 0; wy < 7; wy++) {
  const row = wy * 2 + (step % 2)
  const shift = (step + wy) % 3
  r(491 + shift, 136 + row * 9, 10, 1, wy % 2 === 0 ? mat.sky[2] : gold)
 }

 // 2. Back-wall shelf Lucky Cat paw wave, trophy glint & hanging vine breeze
 const pawUp = step % 4 < 2
 r(343, pawUp ? 22 : 25, 2, 3, '#f7f1e6')
 r(343, pawUp ? 21 : 24, 2, 1, '#e53e3e')
 if (step % 6 === 0) {
  r(331, 19, 2, 2, '#ffffff')
  r(51, 22, 2, 2, goldBright)
 } else if (step % 6 === 3) {
  r(68, 35, 2, 2, '#ffffff')
 }
 const vineSway = step % 4 === 1 ? 1 : step % 4 === 3 ? -1 : 0
 r(87 + vineSway, 38, 4, 8, '#68a37c')
 r(459 - vineSway, 36, 5, 8, '#68a37c')

 // 3. Twin entrance post lanterns warm flame flicker
 const postFlicker = step % 3
 for (const lx of [196, 304]) {
  r(lx + 3, 336 + (postFlicker === 1 ? 1 : 0), 6, 7, goldBright)
  r(lx + 4, 337, 4, postFlicker === 2 ? 5 : 4, '#ffffff')
 }

 // 4. Furniture-bound living details
 for (const item of objects) {
  const ox = item.x * 32
  const oy = item.y * 32
  const lightOn = enabled[item.id] !== false

  if (item.id === 'desk') {
   // Steaming mug on right corner of desk (3-frame curling steam)
   const steam = step % 4
   r(ox + 85, oy + 12, 4, 1, '#6e4736')
   if (steam === 0) {
    r(ox + 85, oy + 9, 1, 2, '#e6e2f0')
    r(ox + 88, oy + 7, 1, 3, '#cbc6dc')
   } else if (steam === 1) {
    r(ox + 86, oy + 7, 1, 3, '#e6e2f0')
    r(ox + 88, oy + 5, 1, 2, '#cbc6dc')
   } else if (steam === 2) {
    r(ox + 84, oy + 6, 1, 2, '#cbc6dc')
    r(ox + 87, oy + 8, 1, 3, '#e6e2f0')
   } else {
    r(ox + 85, oy + 5, 1, 2, '#cbc6dc')
    r(ox + 89, oy + 8, 1, 2, '#e6e2f0')
   }

   // Left IDE monitor: active code line + blinking cursor + PC tower pulse
   if (lightOn) {
    const activeLine = step % 5
    const cursorOn = step % 2 === 0
    r(ox + 27, oy + 2 + activeLine * 2, 25, 1, '#283147')
    r(ox + 28, oy + 2 + activeLine * 2, 4, 1, accent)
    r(ox + 34, oy + 2 + activeLine * 2, 8 + ((activeLine * 3) % 7), 1, cyan)
    if (cursorOn) r(ox + 49, oy + 2 + activeLine * 2, 2, 1, '#ffffff')
    // Right monitor mountain star glint
    r(ox + 61 + ((step * 3) % 10), oy + 2 + (step % 2), 1, 1, '#ffffff')
    // PC tower LED pulse
    r(ox + 82, oy + 33 + (step % 5) * 2, 2, 3, '#ffffff')
   }

   // Purple desk bunny ear twitch & blink
   const bunnyBlink = step % 9 === 0
   const earShift = step % 7 === 0 ? 1 : 0
   if (earShift) {
    r(ox + 24, oy + 8, 2, 2, accent)
    r(ox + 25, oy + 7, 2, 2, ink)
   }
   if (bunnyBlink) {
    r(ox + 21, oy + 14, 4, 1, trim)
   }
  }

  if (item.id === 'sofa') {
   // White pixel kitten on center cushion: blink, ear twitch & tail sway
   const catBlink = step % 8 === 0
   const tailPos = step % 4
   if (catBlink) {
    r(ox + 46, oy + 21, 2, 2, '#ffffff')
    r(ox + 50, oy + 21, 2, 2, '#ffffff')
    r(ox + 46, oy + 22, 2, 1, ink)
    r(ox + 50, oy + 22, 2, 1, ink)
   }
   // Animated little white tail curling beside the kitten
   const tx = ox + 55
   const ty = oy + (tailPos === 0 ? 22 : tailPos === 1 ? 21 : tailPos === 2 ? 22 : 23)
   r(tx, ty, 3, 3, ink)
   r(tx, ty + 1, 2, 1, '#ffffff')
  }

  if (item.id === 'bed') {
   // Sleeping tuxedo cat on quilt: chest breathing, tail-tip curl & floating 'z' motes
   const breath = step % 4 < 2 ? 0 : 1
   if (breath === 1) {
    r(ox + 15, oy + 43, 14, 1, '#2f2e3b')
   }
   // White tail tip gentle curl
   const tailLift = step % 3 === 0 ? -1 : 0
   r(ox + 31, oy + 48 + tailLift, 3, 2, '#f7f1e6')
   // Rising sleep 'z' pixels above the cat
   const zPhase = step % 4
   const zx = ox + 26 + zPhase * 2
   const zy = oy + 36 - zPhase * 3
   r(zx, zy, 3, 1, trim)
   r(zx + 1, zy + 1, 1, 1, trim)
   r(zx, zy + 2, 3, 1, trim)
  }

  if (item.id === 'coffee-table') {
   // Steaming ceramic mug on coffee table
   const steam = (step + 2) % 4
   if (steam === 0) {
    r(ox + 47, oy + 3, 1, 2, '#e6e2f0')
    r(ox + 50, oy + 1, 1, 3, '#cbc6dc')
   } else if (steam === 1) {
    r(ox + 48, oy + 1, 1, 3, '#e6e2f0')
    r(ox + 50, oy, 1, 2, '#cbc6dc')
   } else if (steam === 2) {
    r(ox + 46, oy + 1, 1, 2, '#cbc6dc')
    r(ox + 49, oy + 2, 1, 3, '#e6e2f0')
   } else {
    r(ox + 47, oy, 1, 2, '#cbc6dc')
    r(ox + 51, oy + 2, 1, 2, '#e6e2f0')
   }
   // Feather quill glint
   if (step % 5 === 0) r(ox + 22, oy + 8, 2, 1, goldBright)
  }

  if (item.id === 'lantern' && lightOn) {
   // Flickering lantern flame core & rising warm sparks
   const f = step % 4
   r(ox + 13, oy + 11 + (f === 1 ? 1 : 0), 6, 10, '#ffe699')
   r(ox + 14 + (f === 2 ? 1 : 0), oy + 12, 3, 7, '#ffffff')
   const sparkY = oy + 2 - (step % 3) * 2
   const sparkX = ox + 14 + ((step % 2) * 3 - 1)
   r(sparkX, sparkY, 2, 2, step % 2 === 0 ? goldBright : '#f6bc56')
  }

  if (item.id === 'floor-lamp' && lightOn) {
   // Warm lampshade filament pulse & floating mote
   const f = step % 3
   r(ox + 12, oy - 13 + (f === 1 ? 1 : 0), 8, 8, '#fff3c4')
   r(ox + 13, oy - 12, 6, f === 2 ? 8 : 6, '#ffffff')
   const moteY = oy - 18 - (step % 4)
   const moteX = ox + (step % 2 === 0 ? 7 : 22)
   r(moteX, moteY, 2, 2, goldBright)
  }

  if (item.id === 'console' && lightOn) {
   // Spinning vinyl groove highlight
   const groove = step % 4
   const gx = groove < 2 ? ox + 9 : ox + 15
   const gy = groove % 2 === 0 ? oy + 8 : oy + 11
   r(gx, gy, 2, 1, '#586380')
   // Live bouncing equalizer bars on front screen
   r(ox + 6, oy + 18, 20, 7, '#141c26')
   for (let i = 0; i < 6; i++) {
    const bh = 1 + ((step * 2 + i * 3) % 6)
    r(ox + 8 + i * 3, oy + 24 - bh, 2, bh, i % 2 === 0 ? cyan : accent)
   }
   // Rising floating music note
   const noteLift = (step % 3) * 2
   r(ox + 22 + (step % 2), oy - 2 - noteLift, 2, 2, trim)
  }

  if (item.id === 'plant') {
   // Gentle leaf-tip sway & orbiting firefly spark
   const sway = step % 4 === 1 ? 1 : step % 4 === 3 ? -1 : 0
   r(ox + 12 + sway, oy - 19, 8, 3, '#92cfa3')
   r(ox + 20 - sway, oy - 12, 6, 3, '#7ebc92')
   const orbit = [
    [25, -18],
    [27, -21],
    [22, -23],
    [19, -19],
   ][step % 4]
   r(ox + orbit[0], oy + orbit[1], 2, 2, goldBright)
   r(ox + orbit[0], oy + orbit[1], 1, 1, '#ffffff')
  }

  if (item.id === 'bookshelf') {
   // Top lantern warm flame flicker & right-side trailing ivy sway
   if (lightOn) {
    const f = (step + 1) % 3
    r(ox + 14, oy - 5, 3, 2, '#f6bc56')
    r(ox + 14 + (f === 2 ? 1 : 0), oy - 5 + (f === 1 ? 1 : 0), 2, 2, goldBright)
    r(ox + 15, oy - 4, 1, 1, '#ffffff')
   }
   const ivyShift = step % 4 < 2 ? 0 : 1
   r(ox + 48 + ivyShift, oy + 12, 3, 5, '#68a37c')
  }
 }

 return p
}

/**
 * Soft drifting dust motes in the window light shafts and rising warm motes near active lamps.
 */
export function roomDustMotes(
 mood: Appearance['mood'],
 objects: RoomObject[],
 tick: number,
 enabled: Record<string, boolean> = {},
): AmbientMote[] {
 const t = Math.max(0, tick)
 const warmColor = mood === 'tech' ? '#9be7f2' : '#ffe8a8'
 const motes: AmbientMote[] = []

 // Window light-shaft motes drifting diagonally across the upper floor
 for (let i = 0; i < 8; i++) {
  const phase = (t * 0.18 + i * 1.37) % 6
  const progress = phase / 6
  const x = Math.round(192 + ((i * 15) % 98) + progress * 18 + Math.sin(t * 0.4 + i) * 3)
  const y = Math.round(34 + ((i * 9) % 24) + progress * 54)
  const alpha = Math.round(Math.sin(progress * Math.PI) * 0.55 * 100) / 100
  if (alpha > 0.05) {
   motes.push({ x, y, size: i % 3 === 0 ? 3 : 2, color: warmColor, alpha })
  }
 }

 // Warm rising motes around lit furniture sources
 for (const item of objects) {
  if (enabled[item.id] === false) continue
  if (item.id === 'lantern' || item.id === 'floor-lamp' || item.id === 'bookshelf') {
   const baseX = item.id === 'bookshelf' ? item.x * 32 + 14 : item.x * 32 + 16
   const baseY = item.id === 'bookshelf' ? item.y * 32 - 8 : item.id === 'floor-lamp' ? item.y * 32 - 6 : item.y * 32 + 12
   for (let j = 0; j < 2; j++) {
    const cycle = (t * 0.22 + j * 1.9 + item.x * 0.3) % 4
    const ratio = cycle / 4
    const x = Math.round(baseX + Math.sin(t * 0.5 + j * 2 + item.y) * 9)
    const y = Math.round(baseY - ratio * 22)
    const alpha = Math.round(Math.sin(ratio * Math.PI) * 0.5 * 100) / 100
    if (alpha > 0.05 && x >= 24 && x <= 488 && y >= 12 && y <= 360) {
     motes.push({ x, y, size: 2, color: '#ffe699', alpha })
    }
   }
  }
 }
 return motes
}

/**
 * Gentle breathing scale & alpha modulation for room light pools.
 */
export function lightPulse(index: number, timeSeconds: number): { scale: number; alphaMultiplier: number } {
 const wave = Math.sin(timeSeconds * 2.2 + index * 1.35)
 return {
  scale: Math.round((1 + wave * 0.045) * 1000) / 1000,
  alphaMultiplier: Math.round((1 + wave * 0.14) * 1000) / 1000,
 }
}

/**
 * Natural periodic eye-blink overlay for idle characters. Drawn on a secondary
 * overlay graphics layer so the base character commandBuffer remains untouched.
 */
export function characterBlinkPixels(a: Appearance, direction: Direction, tick: number): Pixel[] {
 if (direction === 'up') return []
 const step = Math.max(0, Math.floor(tick))
 if (step % 11 !== 0) return []
 const ink = '#181520'
 const skin = a.skin
 if (direction === 'down') {
  return [
   { x: 15, y: 21, w: 4, h: 2, color: skin },
   { x: 29, y: 21, w: 4, h: 2, color: skin },
   { x: 15, y: 23, w: 4, h: 1, color: ink },
   { x: 29, y: 23, w: 4, h: 1, color: ink },
  ]
 }
 const ex = direction === 'left' ? CHARACTER_WIDTH - 29 - 3 : 29
 return [
  { x: ex, y: 21, w: 3, h: 3, color: skin },
  { x: ex, y: 24, w: 3, h: 1, color: ink },
 ]
}

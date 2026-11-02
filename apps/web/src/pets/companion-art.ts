import type { Pixel } from '../character.ts'
import type { Direction } from '../world/room.ts'
import type { PetAnimationState, PetSpeciesId } from './pet-model.ts'

// Original 32px companions. Each silhouette has front/rear/profile construction,
// upper-left clustered highlights, and a shared floor anchor at y=29.
function canvas(direction: Direction) {
  const pixels: Pixel[] = []
  const r = (x: number, y: number, w: number, h: number, color: string) => {
    pixels.push({ x: direction === 'left' ? 32 - x - w : x, y, w, h, color })
  }
  return { pixels, r }
}
type Brush = ReturnType<typeof canvas>['r']
const ink = '#24312f'
const cream = '#f1dfba'
const gold = '#cba15d'

function eyes(r: Brush, x: number, y: number, closed: boolean, color = ink) {
  r(x, y, 2, closed ? 1 : 3, color)
  if (!closed) r(x, y, 1, 1, cream)
}

function slime(state: PetAnimationState, f: number, direction: Direction): Pixel[] {
  const { pixels, r } = canvas(direction)
  const sleep = state === 'sleep', side = direction === 'right' || direction === 'left'
  const bounce = state === 'walk' ? [0, -2, 0, 1][f] : state === 'happy' ? [0, -3, -1, 0][f] : 0
  const y = (state === 'sit' ? 17 : 14) + bounce
  const deep = '#346b5c', body = '#63a982', mid = '#94c89a', shine = '#d3e5b2'
  if (sleep) {
    r(4,23,25,6,ink); r(7,21,19,7,deep); r(8,22,16,5,body)
    r(10,22,9,1,mid); r(10,25,3,1,ink); r(20,25,3,1,ink)
    r(16,19,2,4,deep); r(12,18,5,3,'#456d40'); r(18,17,4,3,mid)
    return pixels
  }
  r(5, y + 5, 23, 8, ink); r(8, y + 1, 17, 13, ink); r(12, y, 9, 3, ink)
  r(6, y + 6, 21, 6, deep); r(9, y + 2, 15, 10, body); r(12, y + 1, 9, 10, body)
  r(9, y + 4, 4, 5, mid); r(12, y + 2, 8, 2, mid); r(10, y + 4, 2, 2, shine)
  r(7, y + 10, 3, 1, mid); r(23, y + 8, 2, 3, mid)
  if (direction !== 'up') {
    eyes(r, side ? 21 : 12, y + 6, f === 3 && state === 'idle')
    if (!side) eyes(r, 20, y + 6, f === 3 && state === 'idle')
    r(side ? 24 : 17, y + 10, 2, state === 'happy' ? 2 : 1, deep)
  } else { r(12, y + 7, 2, 1, mid); r(21, y + 8, 1, 2, mid) }
  // A rooted two-leaf sprout, not an aura.
  r(16, y - 3, 2, 5, deep); r(11, y - 4, 6, 3, '#456d40'); r(12, y - 4, 4, 1, '#94b667')
  r(18, y - 6, 5, 3, '#456d40'); r(19, y - 6, 3, 1, '#b4cd82')
  if (state === 'happy') { r(4, 15 + f % 2, 2, 2, mid); r(27, 10 + f % 2, 1, 3, shine) }
  return pixels
}

function pup(state: PetAnimationState, f: number, direction: Direction): Pixel[] {
  const { pixels, r } = canvas(direction)
  const side = direction === 'right' || direction === 'left', rear = direction === 'up'
  const dark = '#59402f', fur = '#a97549', light = '#d5aa73', ear = '#71482f'
  const step = state === 'walk' ? f % 2 : 0, bob = state === 'happy' ? -(f % 2) : 0
  const closed = state === 'sleep' || (state === 'idle' && f === 3)
  if (state === 'sleep') {
    r(5, 20, 22, 9, ink); r(7, 19, 17, 8, fur); r(9, 20, 11, 2, light)
    r(5, 22, 10, 6, dark); r(7, 23, 9, 4, cream); r(6, 20, 4, 7, ear)
    r(11, 24, 3, 1, ink); r(15, 25, 2, 1, ink); r(20, 25, 7, 3, dark)
    r(18, 27, 8, 1, light); r(17, 26, 3, 2, cream)
    return pixels
  }
  const low = state === 'sit' ? 2 : 0
  if (side) {
    r(4, 17 - f % 2, 3, 7, ink); r(5, 16 - f % 2, 2, 7, fur)
    r(7, 17 + bob, 16, 10, ink); r(8, 18 + bob, 14, 8, fur); r(9, 18 + bob, 8, 2, light)
    r(17, 21 + bob, 5, 5, cream)
    r(9, 25 - step, 4, 4, dark); r(10, 27 - step, 3, 2, cream)
    r(20, 25 - (state === 'walk' ? 1 - step : 0), 4, 4, dark); r(21, 27 - step, 3, 2, cream)
    r(17, 9 + bob + low, 10, 12, ink); r(18, 10 + bob + low, 8, 10, fur)
    r(19, 10 + bob + low, 5, 2, light); r(24, 16 + bob + low, 6, 4, cream); r(28, 16 + bob + low, 2, 2, ink)
    r(16, 10 + bob + low, 5, 12, dark); r(17, 11 + bob + low, 3, 9, ear)
    eyes(r, 23, 13 + bob + low, closed)
    r(20, 21 + bob, 6, 2, '#49747a'); r(23, 23 + bob, 2, 2, gold)
  } else {
    r(23, 18 - f % 2, 4, 7, dark); r(24, 17 - f % 2, 2, 6, light)
    r(9, 17 + bob, 15, 11, ink); r(10, 18 + bob, 13, 9, fur); r(11, 19 + bob, 4, 4, light)
    if (!rear) r(14, 20 + bob, 7, 7, cream)
    r(10, 26 - step, 5, 3, dark); r(11, 27 - step, 4, 2, cream)
    r(19, 26 - (state === 'walk' ? 1 - step : 0), 5, 3, dark); r(20, 27 - step, 4, 2, cream)
    r(8, 7 + bob + low, 18, 13, ink); r(9, 8 + bob + low, 16, 11, fur); r(11, 8 + bob + low, 10, 2, light)
    r(6, 9 + bob + low, 5, 12, dark); r(7, 10 + bob + low, 3, 9, ear)
    r(23, 9 + bob + low, 5, 12, dark); r(24, 10 + bob + low, 3, 9, ear)
    if (!rear) {
      r(12, 15 + bob + low, 10, 4, cream); eyes(r, 12, 12 + bob + low, closed); eyes(r, 20, 12 + bob + low, closed)
      r(16, 15 + bob + low, 3, 2, ink)
      if (state === 'happy') r(17, 18 + bob + low, 2, 3, '#be7770')
    } else r(14, 11 + bob + low, 7, 4, ear)
    r(10, 20 + bob + low, 14, 2, '#49747a'); if (!rear) r(16, 22 + bob + low, 2, 2, gold)
  }
  return pixels
}

function fox(state: PetAnimationState, f: number, direction: Direction): Pixel[] {
  const { pixels, r } = canvas(direction)
  const side = direction === 'right' || direction === 'left', rear = direction === 'up'
  const dark = '#34473a', moss = '#5f7950', light = '#9ca76a', russet = '#a47248'
  const step = state === 'walk' ? f % 2 : 0, y = state === 'happy' ? -(f % 2) : 0
  if (state === 'sleep') {
    r(5, 19, 22, 10, ink); r(7, 18, 17, 9, moss); r(9, 19, 10, 2, light)
    r(6, 20, 8, 7, russet); r(6, 17, 3, 5, dark); r(8, 24, 4, 1, ink)
    r(15, 22, 13, 6, dark); r(13, 25, 14, 4, moss); r(10, 26, 8, 3, cream)
    r(17, 22, 6, 2, light); return pixels
  }
  // A broad leaf-shaped brush tail makes the fox readable beside the cat.
  r(2, 13 + f % 2, 8, 12, ink); r(3, 14 + f % 2, 6, 10, moss); r(3, 14 + f % 2, 4, 4, cream)
  r(5, 21, 8, 6, dark); r(7, 22, 7, 3, light)
  r(10, 18 + y, 13, 9, ink); r(11, 19 + y, 11, 7, moss); r(12, 19 + y, 6, 2, light)
  r(11, 25 - step, 3, 4, dark); r(20, 25 - (state === 'walk' ? 1 - step : 0), 3, 4, dark)
  if (state === 'sit') { r(12, 23, 9, 5, moss); r(18, 26, 4, 2, cream) }
  const hx = side ? 17 : 10, hy = 9 + y
  r(hx, hy, 13, 11, ink); r(hx + 1, hy + 1, 11, 9, russet); r(hx + 2, hy + 1, 7, 2, light)
  r(hx, hy - 5, 4, 7, ink); r(hx + 1, hy - 4, 2, 4, moss)
  r(hx + 9, hy - 4, 4, 6, ink); r(hx + 10, hy - 3, 2, 3, moss)
  if (!rear) {
    r(hx + 1, hy + 6, 11, 3, cream)
    eyes(r, hx + (side ? 8 : 2), hy + 4, f === 3 && state === 'idle')
    if (!side) eyes(r, hx + 9, hy + 4, f === 3 && state === 'idle')
    r(hx + (side ? 10 : 6), hy + 7, side ? 3 : 2, 2, ink)
  } else { r(hx + 2, hy + 3, 8, 5, moss); r(hx + 4, hy + 3, 3, 1, light) }
  r(hx + 2, hy + 10, 9, 2, dark); r(hx + 6, hy + 10, 3, 2, light)
  r(hx + 2, hy + 9, 1, 5, cream); r(hx, hy + 11, 5, 1, cream); r(hx + 2, hy + 11, 1, 1, gold)
  if (state === 'happy') { r(5, 7 + f % 2, 3, 2, light); r(6, 6 + f % 2, 1, 4, light) }
  return pixels
}

function wisp(state: PetAnimationState, f: number, direction: Direction): Pixel[] {
  const { pixels, r } = canvas(direction)
  const side = direction === 'left' || direction === 'right', rear = direction === 'up'
  const edge = '#45465f', deep = '#76749d', blue = '#afa9cc', pale = '#e5e5de'
  const y = state === 'sleep' ? 8 : state === 'sit' ? 6 : [3, 2, 3, 4][f]
  // A cut crystal suspended in two small, disconnected orbit fragments.
  r(15, y, 3, 3, edge); r(12, y + 3, 9, 4, edge); r(10, y + 7, 13, 7, edge)
  r(12, y + 14, 9, 4, edge); r(15, y + 18, 3, 3, edge)
  r(15, y + 2, 2, 4, pale); r(13, y + 5, 7, 3, blue); r(11, y + 8, 11, 5, blue)
  r(13, y + 13, 7, 4, deep); r(15, y + 17, 2, 2, deep)
  r(13, y + 7, 2, 6, pale); r(18, y + 5, 2, 3, deep); r(19, y + 9, 2, 6, deep)
  if (!rear) {
    eyes(r, side ? 19 : 13, y + 9, state === 'sleep' || (state === 'idle' && f === 3), edge)
    if (!side) eyes(r, 18, y + 9, state === 'sleep' || (state === 'idle' && f === 3), edge)
    if (state === 'happy') r(16, y + 13, 2, 2, pale)
  } else r(16, y + 7, 2, 9, pale)
  if (state !== 'sleep') {
    r(5, y + 9 + f % 2, 3, 4, edge); r(6, y + 9 + f % 2, 1, 2, pale)
    r(25, y + 5 - f % 2, 2, 4, blue); r(25, y + 5 - f % 2, 1, 2, pale)
    if (state === 'happy') { r(7, 4, 1, 5, pale); r(5, 6, 5, 1, pale) }
  }
  return pixels
}

function bat(state: PetAnimationState, f: number, direction: Direction): Pixel[] {
  const { pixels, r } = canvas(direction)
  const side = direction === 'left' || direction === 'right', rear = direction === 'up'
  const fur = '#696679', lit = '#9a8a9b', membrane = '#7f668b', edge = '#363342', warm = '#d5b69a'
  const rest = state === 'sleep' || state === 'sit', y = rest ? 6 : [1, 2, 1, 0][f]
  if (!rest) {
    const flap = [0, 3, 6, 3][f]
    // Scalloped wing membranes fold in profile and expand on the downstroke.
    const left = side ? 8 : 1, right = side ? 22 : 25
    r(left, 7 + flap + y, 6, 8, edge); r(left + 1, 8 + flap + y, 5, 5, membrane)
    r(left + 4, 12 + flap + y, 7, 7, edge); r(left + 5, 13 + flap + y, 5, 4, membrane)
    r(right - 2, 7 + flap + y, 7, 8, edge); r(right - 2, 8 + flap + y, 5, 5, membrane)
    r(21, 12 + flap + y, 5, 7, edge); r(21, 13 + flap + y, 4, 4, membrane)
    r(left, 7 + flap + y, 5, 1, lit); r(right - 2, 7 + flap + y, 5, 1, lit)
  }
  r(12, 10 + y, 9, 14, edge); r(13, 11 + y, 7, 12, fur); r(14, 12 + y, 2, 8, lit)
  r(11, 6 + y, 11, 9, edge); r(12, 7 + y, 9, 7, fur)
  r(11, 2 + y, 3, 6, edge); r(12, 3 + y, 1, 4, membrane)
  r(19, 2 + y, 3, 6, edge); r(20, 3 + y, 1, 4, membrane)
  if (!rear) {
    eyes(r, side ? 19 : 12, 10 + y, state === 'sleep' || (state === 'idle' && f === 3), edge)
    if (!side) eyes(r, 18, 10 + y, state === 'sleep' || (state === 'idle' && f === 3), edge)
    r(side ? 21 : 16, 13 + y, 2, 1, warm)
    if (state === 'happy') { r(14, 14 + y, 1, 2, cream); r(18, 14 + y, 1, 2, cream) }
  } else r(14, 7 + y, 5, 2, lit)
  if (rest) {
    // Grounded wing-wrap, ears still visible; no imaginary hanging branch.
    r(9, 17, 15, 11, edge); r(10, 18, 13, 9, membrane); r(11, 19, 2, 7, lit)
    r(14, 18, 2, 9, edge); r(19, 18, 1, 9, edge)
  } else { r(13, 24 + y, 2, 2, edge); r(18, 24 + y, 2, 2, edge) }
  return pixels
}

function owl(state: PetAnimationState, f: number, direction: Direction): Pixel[] {
  const { pixels, r } = canvas(direction)
  const side = direction === 'left' || direction === 'right', rear = direction === 'up'
  const edge = '#303c52', dark = '#59677f', feather = '#96a8b8', silver = '#dce1d4'
  const flying = state === 'walk' || state === 'happy', y = flying ? [0, -2, 0, 1][f] : 1
  if (state === 'sleep') {
    r(9, 15, 15, 14, edge); r(10, 16, 13, 12, feather); r(11, 18, 10, 9, silver)
    r(8, 14, 9, 9, dark); r(9, 15, 7, 6, feather); r(10, 18, 4, 1, edge)
    r(15, 21, 8, 7, dark); r(16, 22, 5, 1, feather); r(17, 25, 4, 1, feather)
    r(12, 28, 3, 1, gold); r(19, 28, 3, 1, gold); return pixels
  }
  if (flying) {
    const flap = [2, 0, 5, 7][f]
    r(side ? 7 : 3, 12 + flap + y, 9, 5, edge); r(side ? 8 : 4, 12 + flap + y, 8, 3, feather)
    r(21, 12 + flap + y, side ? 5 : 8, 5, edge); r(21, 12 + flap + y, side ? 4 : 7, 3, feather)
  }
  r(10, 15 + y, 13, 12, edge); r(11, 16 + y, 11, 10, feather)
  r(13, 17 + y, 7, 8, rear ? dark : silver); r(13, 26 + y, 7, 2, dark)
  if (!flying) { r(10, 17 + y, 3, 8, dark); r(21, 17 + y, 2, 8, dark) }
  for (const x of [14, 18]) { r(x, 20 + y, 1, 1, dark); r(x, 23 + y, 1, 1, dark) }
  const hx = side ? 13 : 9
  r(hx, 6 + y, 15, 11, edge); r(hx + 1, 7 + y, 13, 9, feather)
  r(hx, 3 + y, 4, 5, dark); r(hx + 11, 3 + y, 4, 5, dark)
  r(hx + 1, 4 + y, 2, 3, silver); r(hx + 12, 4 + y, 2, 3, feather)
  if (!rear) {
    r(hx + 1, 8 + y, 6, 6, silver); if (!side) r(hx + 8, 8 + y, 6, 6, silver)
    eyes(r, hx + (side ? 10 : 3), 10 + y, f === 3 && state === 'idle', edge)
    if (!side) eyes(r, hx + 10, 10 + y, f === 3 && state === 'idle', edge)
    r(hx + (side ? 13 : 7), 13 + y, 2, 3, gold)
    r(15, 17 + y, 3, 3, gold); r(16, 17 + y, 2, 2, silver)
  } else { r(hx + 3, 9 + y, 8, 3, dark); r(hx + 5, 9 + y, 3, 1, feather) }
  r(12, 27 + y, 3, 1, gold); r(19, 27 + y, 3, 1, gold)
  return pixels
}

export function companionPixels(species: Exclude<PetSpeciesId, 'cat' | 'triarch'>, state: PetAnimationState, frame: number, direction: Direction): Pixel[] {
  return ({ slime, pup, fox, wisp, bat, owl })[species](state, frame, direction)
}

/** Presentation only: every species still respects furniture and room bounds. */
export function petLocomotion(species: PetSpeciesId, state: PetAnimationState) {
  const airborne = species === 'wisp' || ((species === 'bat' || species === 'owl') && (state === 'walk' || state === 'happy' || (species === 'bat' && state === 'idle')))
  return { airborne, lift: airborne ? (species === 'wisp' && state === 'sleep' ? 2 : 5) : 0, shadowWidth: airborne ? 12 : species === 'triarch' ? 30 : 19, shadowAlpha: airborne ? 0.22 : 0.45 }
}

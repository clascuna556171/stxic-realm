import { triarchPixels } from './triarch-art.ts'
import { villageCatPixels } from './village-cat-art.ts'
import type { Direction } from '../world/room.ts'
import type { Pixel } from '../character.ts'
import type { PetAnimationState, PetSpeciesId } from './pet-model.ts'

export interface PetSpriteDimensions {
  width: number
  height: number
}

export function getPetSpriteDimensions(speciesId: PetSpeciesId): PetSpriteDimensions {
  if (speciesId === 'triarch') {
    return { width: 48, height: 36 }
  }
  return { width: 32, height: 32 }
}

function createCanvasBuilder(width: number, height: number) {
  const pixels: Pixel[] = []
  const rect = (x: number, y: number, w: number, h: number, color: string) => {
    const x0 = Math.max(0, Math.floor(x))
    const y0 = Math.max(0, Math.floor(y))
    const x1 = Math.min(width, Math.floor(x + w))
    const y1 = Math.min(height, Math.floor(y + h))
    if (x1 > x0 && y1 > y0) {
      pixels.push({ x: x0, y: y0, w: x1 - x0, h: y1 - y0, color })
    }
  }
  return { pixels, rect }
}

/**
 * Generates authentic, bounded pixel-art frames for all 8 STXIC Realm pet species
 * across 5 animation states (idle, walk, sit, sleep, happy) and 4 frame ticks (0..3).
 */
export function getPetPixels(
  speciesId: PetSpeciesId,
  state: PetAnimationState = 'idle',
  frame = 0,
  direction: Direction = 'down',
): Pixel[] {
  const f = ((frame % 4) + 4) % 4
  if (speciesId === 'cat') return villageCatPixels(state, f, direction)
  if (speciesId === 'triarch') return triarchPixels(state, f, direction)
  const pixels = getSpeciesPixels(speciesId, state, f)
  return direction === 'left' ? pixels.map(p => ({ ...p, x: getPetSpriteDimensions(speciesId).width - p.x - p.w })) : pixels
}

function getSpeciesPixels(speciesId: PetSpeciesId, state: PetAnimationState, f: number): Pixel[] {
  switch (speciesId) {
    case 'cat':
      return villageCatPixels(state, f, 'down')
    case 'slime':
      return drawTinySlime(state, f)
    case 'pup':
      return drawWoodlandPup(state, f)
    case 'fox':
      return drawMossFox(state, f)
    case 'wisp':
      return drawCrystalWisp(state, f)
    case 'bat':
      return drawCaveBat(state, f)
    case 'owl':
      return drawMoonOwl(state, f)
    case 'triarch':
      return triarchPixels(state, f, 'down')
  }
}

function drawTinySlime(state: PetAnimationState, f: number): Pixel[] {
  const { pixels, rect } = createCanvasBuilder(32, 32)
  const deepBlue = '#1d5696'
  const midBlue = '#3895e3'
  const skyBlue = '#66c7fa'
  const paleBlue = '#b3ebff'
  const white = '#f5fdff'
  const eye = '#172236'

  const hop = state === 'walk' || state === 'happy' ? (f % 2 === 0 ? -2 : 0) : 0
  const squash = state === 'sit' || state === 'sleep' ? 1 : f % 2 === 1 ? 1 : 0

  // Floating bubbles above head
  const bOff = f % 2
  rect(13, 6 - bOff + hop, 2, 2, skyBlue)
  rect(13, 6 - bOff + hop, 1, 1, white)
  rect(16, 4 - (1 - bOff) + hop, 3, 3, midBlue)
  rect(17, 5 - (1 - bOff) + hop, 2, 2, paleBlue)
  rect(17, 5 - (1 - bOff) + hop, 1, 1, white)
  rect(19, 8 - bOff + hop, 2, 2, skyBlue)

  // Outer slime silhouette
  const topY = 12 + hop + squash
  const h = 14 - squash
  rect(9, topY + 2, 14, h - 2, deepBlue)
  rect(8, topY + 4, 16, h - 5, deepBlue)
  rect(11, topY, 10, 3, deepBlue)

  // Inner translucent layers
  rect(11, topY + 1, 10, h - 2, midBlue)
  rect(9, topY + 4, 14, h - 6, midBlue)
  rect(10, topY + 2, 11, h - 4, skyBlue)
  rect(11, topY + 2, 8, 4, paleBlue)

  // Specular highlights
  rect(11, topY + 3, 3, 2, white)
  rect(10, topY + 5, 2, 2, white)
  rect(20, topY + 6, 2, 3, paleBlue)

  // Eyes
  if (state === 'sleep') {
    rect(12, topY + 8, 3, 1, eye)
    rect(17, topY + 8, 3, 1, eye)
  } else {
    rect(13, topY + 7, 2, 3, eye)
    rect(18, topY + 7, 2, 3, eye)
  }

  if (state === 'happy') {
    rect(7, 9 + (f % 2), 2, 2, white)
    rect(23, 8 - (f % 2), 2, 2, white)
  }

  return pixels
}

function drawWoodlandPup(state: PetAnimationState, f: number): Pixel[] {
  const { pixels, rect } = createCanvasBuilder(32, 32)
  const outline = '#241a14'
  const brown = '#7d5238'
  const brownDark = '#5c3a25'
  const cream = '#ebd6b7'
  const creamShade = '#cfb38c'
  const scarf = '#9e3b3b'
  const pack = '#634128'
  const gold = '#e0b956'

  const bob = state === 'walk' || state === 'happy' ? (f % 2 === 0 ? -1 : 0) : 0
  const sleepY = state === 'sleep' ? 2 : 0
  const by = bob + sleepY

  // Fluffy curled tail (right side)
  const wag = (state === 'idle' || state === 'happy' || state === 'walk') && f % 2 === 1 ? -1 : 0
  rect(21, 17 + by + wag, 4, 5, brownDark)
  rect(22, 16 + by + wag, 3, 4, cream)
  rect(23, 17 + by + wag, 2, 2, creamShade)

  // Body
  rect(9, 17 + by, 13, 9 - sleepY, outline)
  rect(10, 18 + by, 11, 7 - sleepY, brown)
  rect(10, 19 + by, 6, 6 - sleepY, cream)

  // Small backpack / pouch on back
  rect(16, 17 + by, 5, 5, pack)
  rect(18, 19 + by, 1, 2, gold)

  // Red bandana
  rect(10, 16 + by, 9, 3, scarf)
  rect(11, 18 + by, 5, 2, scarf)

  // Paws
  const step = state === 'walk' && f % 2 === 1 ? -1 : 0
  rect(10, 25 + step, 3, 3, cream)
  rect(14, 25 - step, 3, 3, cream)
  rect(18, 25 + step, 3, 3, brownDark)

  // Head
  rect(8, 7 + by, 13, 10, outline)
  rect(9, 8 + by, 11, 8, brown)
  rect(10, 11 + by, 8, 5, cream)
  rect(13, 9 + by, 2, 3, cream)

  // Floppy ears
  const earBounce = f % 2 === 0 ? 0 : 1
  rect(7, 8 + by + earBounce, 3, 5, brownDark)
  rect(18, 7 + by, 4, 5, cream)
  rect(19, 8 + by, 2, 3, creamShade)

  // Eyes & Nose
  if (state === 'sleep') {
    rect(11, 12 + by, 2, 1, outline)
    rect(16, 12 + by, 2, 1, outline)
  } else {
    rect(11, 11 + by, 2, 2, outline)
    rect(16, 11 + by, 2, 2, outline)
  }
  rect(13, 13 + by, 2, 1, outline)

  if (state === 'happy') {
    rect(14, 2 + (f % 2), 4, 3, '#f43f5e')
  }

  return pixels
}

function drawMossFox(state: PetAnimationState, f: number): Pixel[] {
  const { pixels, rect } = createCanvasBuilder(32, 32)
  const outline = '#1e2918'
  const moss = '#7fa162'
  const mossDark = '#56733e'
  const forest = '#364a26'
  const cream = '#f2ede0'
  const flowerWhite = '#ffffff'
  const flowerGold = '#eab308'

  const bob = state === 'walk' || state === 'happy' ? (f % 2 === 0 ? -1 : 0) : 0
  const by = bob + (state === 'sleep' ? 2 : 0)

  // Large bushy moss & cream tail (right side)
  const tailSway = f % 2 === 0 ? 0 : -1
  rect(20, 14 + by + tailSway, 8, 9, outline)
  rect(21, 15 + by + tailSway, 6, 7, moss)
  rect(21, 18 + by + tailSway, 5, 4, mossDark)
  rect(23, 14 + by + tailSway, 4, 4, cream)

  // Body
  rect(9, 17 + by, 12, 7, outline)
  rect(10, 18 + by, 10, 5, moss)
  rect(14, 19 + by, 6, 4, mossDark)
  rect(9, 18 + by, 5, 5, cream)

  // White wildflower on back
  rect(16, 16 + by, 3, 3, flowerWhite)
  rect(17, 17 + by, 1, 1, flowerGold)

  // Legs / Paws
  const step = state === 'walk' && f % 2 === 1 ? -1 : 0
  rect(10, 24 + step, 2, 4, forest)
  rect(13, 24 - step, 2, 4, forest)
  rect(17, 24 + step, 2, 4, forest)
  rect(19, 24 - step, 2, 4, forest)

  // Fox Head (facing left-forward)
  rect(6, 9 + by, 11, 9, outline)
  rect(7, 10 + by, 9, 7, moss)
  rect(6, 14 + by, 7, 3, cream)

  // Pointed Fox Ears
  rect(7, 6 + by, 3, 4, forest)
  rect(8, 7 + by, 2, 3, moss)
  rect(13, 6 + by, 3, 4, forest)
  rect(13, 7 + by, 2, 3, moss)

  // Eyes & Nose
  if (state === 'sleep') {
    rect(9, 13 + by, 2, 1, outline)
    rect(13, 13 + by, 2, 1, outline)
  } else {
    rect(9, 12 + by, 2, 2, outline)
    rect(13, 12 + by, 2, 2, outline)
  }
  rect(6, 14 + by, 1, 1, outline)

  if (state === 'happy') {
    rect(14, 4 + (f % 2), 2, 2, '#a3e635')
    rect(17, 3 - (f % 2), 2, 2, flowerGold)
  }

  return pixels
}

function drawCrystalWisp(state: PetAnimationState, f: number): Pixel[] {
  const { pixels, rect } = createCanvasBuilder(32, 32)
  const deepViolet = '#3e1f7a'
  const midViolet = '#6e3fc7'
  const brightViolet = '#9d72f7'
  const paleLilac = '#dfceff'
  const coreWhite = '#ffffff'

  const floatY = f === 0 ? 0 : f === 1 ? -1 : f === 2 ? -2 : -1

  // Central diamond crystal
  rect(14, 6 + floatY, 4, 20, deepViolet)
  rect(12, 9 + floatY, 8, 14, deepViolet)
  rect(10, 12 + floatY, 12, 8, deepViolet)

  // Faceted inner crystal planes
  rect(15, 7 + floatY, 2, 18, midViolet)
  rect(13, 10 + floatY, 6, 12, midViolet)
  rect(11, 13 + floatY, 10, 6, brightViolet)
  rect(13, 11 + floatY, 6, 10, brightViolet)

  // Glowing star core
  rect(15, 11 + floatY, 2, 10, paleLilac)
  rect(12, 15 + floatY, 8, 2, paleLilac)
  rect(14, 14 + floatY, 4, 4, coreWhite)

  // Orbital starlight ring
  const ringPhase = f % 2
  rect(7, 17 + floatY + ringPhase, 4, 2, paleLilac)
  rect(11, 18 + floatY, 10, 2, coreWhite)
  rect(21, 14 + floatY - ringPhase, 4, 2, paleLilac)
  rect(8, 15 + floatY, 3, 1, brightViolet)
  rect(21, 12 + floatY, 3, 1, brightViolet)

  // Orbiting star sparkles
  const sOff = f % 2 === 0 ? 0 : 1
  rect(8, 7 + sOff, 2, 2, paleLilac)
  rect(22, 6 - sOff, 2, 2, coreWhite)
  rect(9, 23 - sOff, 2, 2, brightViolet)
  rect(21, 22 + sOff, 2, 2, paleLilac)

  if (state === 'happy') {
    rect(15, 2, 2, 3, coreWhite)
    rect(14, 3, 4, 1, coreWhite)
  }

  return pixels
}

function drawCaveBat(state: PetAnimationState, f: number): Pixel[] {
  const { pixels, rect } = createCanvasBuilder(32, 32)
  const charcoal = '#1e1926'
  const darkSlate = '#322b40'
  const wingPurple = '#723c94'
  const wingLight = '#9456ba'
  const wingDeep = '#4c2566'
  const eyeGlow = '#f0abfc'
  const fang = '#f8fafc'

  const flap = state === 'sleep' || state === 'sit' ? 2 : f % 2 === 0 ? -2 : 1
  const hoverY = state === 'walk' || state === 'idle' ? (f % 2 === 0 ? -1 : 1) : 0

  if (state === 'sleep') {
    // Wings folded around body
    rect(10, 12, 12, 12, charcoal)
    rect(11, 13, 10, 10, wingDeep)
    rect(13, 14, 6, 8, darkSlate)
    rect(12, 9, 2, 3, charcoal)
    rect(18, 9, 2, 3, charcoal)
    rect(13, 15, 2, 1, eyeGlow)
    rect(17, 15, 2, 1, eyeGlow)
    return pixels
  }

  // Left Wing
  rect(2, 11 + hoverY + flap, 10, 2, charcoal)
  rect(3, 13 + hoverY + flap, 9, 6, wingPurple)
  rect(4, 13 + hoverY + flap, 4, 4, wingLight)
  rect(3, 17 + hoverY + flap, 3, 2, wingDeep)
  rect(7, 17 + hoverY + flap, 3, 2, wingDeep)

  // Right Wing
  rect(20, 11 + hoverY + flap, 10, 2, charcoal)
  rect(20, 13 + hoverY + flap, 9, 6, wingPurple)
  rect(24, 13 + hoverY + flap, 4, 4, wingLight)
  rect(22, 17 + hoverY + flap, 3, 2, wingDeep)
  rect(26, 17 + hoverY + flap, 3, 2, wingDeep)

  // Central Bat Body & Head
  rect(12, 11 + hoverY, 8, 12, charcoal)
  rect(13, 12 + hoverY, 6, 10, darkSlate)

  // Pointed Ears
  rect(12, 8 + hoverY, 2, 4, charcoal)
  rect(13, 9 + hoverY, 1, 2, wingPurple)
  rect(18, 8 + hoverY, 2, 4, charcoal)
  rect(18, 9 + hoverY, 1, 2, wingPurple)

  // Glowing Eyes & Fangs
  rect(13, 14 + hoverY, 2, 2, eyeGlow)
  rect(17, 14 + hoverY, 2, 2, eyeGlow)
  rect(14, 17 + hoverY, 1, 1, fang)
  rect(17, 17 + hoverY, 1, 1, fang)

  // Feet
  rect(13, 23 + hoverY, 2, 2, charcoal)
  rect(17, 23 + hoverY, 2, 2, charcoal)

  return pixels
}

function drawMoonOwl(state: PetAnimationState, f: number): Pixel[] {
  const { pixels, rect } = createCanvasBuilder(32, 32)
  const outline = '#1e2433'
  const silver = '#e2e8f0'
  const slateBlue = '#94a3b8'
  const deepBlue = '#64748b'
  const moonGold = '#facc15'
  const moonGlow = '#fef08a'
  const branch = '#5c4028'
  const leaf = '#658c48'

  const bob = state === 'walk' || state === 'happy' ? (f % 2 === 0 ? -1 : 0) : 0

  // Glowing Crescent Moon Arc behind Owl (top-left)
  rect(8, 4, 5, 2, moonGlow)
  rect(6, 6, 3, 6, moonGlow)
  rect(8, 12, 4, 2, moonGold)

  // Leafy Oak Branch at base
  rect(5, 25, 22, 2, branch)
  rect(8, 27, 16, 1, outline)
  rect(4, 23, 4, 2, leaf)
  rect(24, 23, 4, 2, leaf)
  rect(26, 26, 3, 2, leaf)

  // Owl Body
  rect(11, 13 + bob, 11, 12, outline)
  rect(12, 14 + bob, 9, 10, silver)
  rect(11, 15 + bob, 3, 8, slateBlue)
  rect(19, 15 + bob, 3, 8, slateBlue)
  rect(14, 23 + bob, 5, 3, deepBlue)

  // Golden Crescent Emblem on Chest
  rect(15, 17 + bob, 4, 3, moonGold)
  rect(16, 17 + bob, 2, 2, silver)

  // Owl Head & Ear Tufts
  rect(11, 7 + bob, 11, 7, outline)
  rect(12, 8 + bob, 9, 6, silver)
  rect(10, 6 + bob, 3, 3, slateBlue)
  rect(20, 6 + bob, 3, 3, slateBlue)

  // Eyes & Beak
  if (state === 'sleep') {
    rect(13, 11 + bob, 2, 1, outline)
    rect(18, 11 + bob, 2, 1, outline)
  } else {
    rect(13, 10 + bob, 2, 2, outline)
    rect(18, 10 + bob, 2, 2, outline)
  }
  rect(16, 12 + bob, 1, 2, moonGold)

  // Talons on branch
  rect(13, 24, 2, 2, moonGold)
  rect(18, 24, 2, 2, moonGold)

  if (state === 'happy') {
    rect(23, 6 + (f % 2), 2, 2, moonGlow)
    rect(5, 15 - (f % 2), 2, 2, moonGlow)
  }

  return pixels
}

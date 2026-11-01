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
): Pixel[] {
  const f = ((frame % 4) + 4) % 4
  switch (speciesId) {
    case 'cat':
      return drawVillageCat(state, f)
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
      return drawTriarchWyrm(state, f)
  }
}

function drawVillageCat(state: PetAnimationState, f: number): Pixel[] {
  const { pixels, rect } = createCanvasBuilder(32, 32)
  const outline = '#241c19'
  const furBase = '#8f7765'
  const furShade = '#6e5849'
  const furStripe = '#47372d'
  const cream = '#ebd7bd'
  const pink = '#d98a82'
  const scarf = '#9e3b3b'
  const scarfShade = '#732626'

  const bob = state === 'walk' ? (f % 2 === 0 ? -1 : 0) : state === 'happy' ? (f % 2 === 0 ? -2 : 0) : 0
  const sleepY = state === 'sleep' ? 3 : 0
  const by = bob + sleepY

  // Tail (left side)
  const tailLift = state === 'idle' || state === 'happy' ? (f % 2 === 0 ? 0 : -1) : 0
  rect(5, 19 + by + tailLift, 3, 6, furShade)
  rect(4, 16 + by + tailLift, 3, 4, furBase)
  rect(4, 17 + by + tailLift, 3, 1, furStripe)
  rect(5, 15 + by + tailLift, 2, 1, furStripe)

  // Body
  rect(9, 17 + by, 13, 9 - sleepY, outline)
  rect(10, 18 + by, 11, 7 - Math.min(2, sleepY), furBase)
  rect(10, 19 + by, 4, 5 - Math.min(2, sleepY), furShade)
  rect(11, 20 + by, 3, 1, furStripe)
  rect(11, 22 + by, 3, 1, furStripe)
  rect(14, 19 + by, 6, 5 - Math.min(2, sleepY), cream)

  // Paws
  const stepL = state === 'walk' && f % 2 === 0 ? -1 : 0
  const stepR = state === 'walk' && f % 2 === 1 ? -1 : 0
  rect(10, 25 + stepL, 3, 3, cream)
  rect(14, 25 + stepR, 3, 3, cream)
  rect(18, 25 + stepL, 3, 3, cream)
  rect(10, 27 + stepL, 3, 1, outline)
  rect(14, 27 + stepR, 3, 1, outline)
  rect(18, 27 + stepL, 3, 1, outline)

  // Red Bandana / Scarf
  rect(10, 16 + by, 12, 3, scarf)
  rect(11, 18 + by, 10, 1, scarfShade)
  rect(15, 19 + by, 4, 2, scarf)
  rect(16, 20 + by, 2, 1, scarfShade)

  // Head
  rect(10, 8 + by, 13, 9, outline)
  rect(11, 9 + by, 11, 7, furBase)
  rect(12, 13 + by, 9, 3, cream)

  // Tabby forehead stripes
  rect(15, 9 + by, 1, 2, furStripe)
  rect(17, 9 + by, 1, 2, furStripe)
  rect(16, 10 + by, 1, 2, furStripe)

  // Ears
  const earTwitch = state === 'idle' && f === 2 ? 1 : 0
  rect(10, 5 + by + earTwitch, 4, 4, outline)
  rect(11, 6 + by + earTwitch, 2, 3, furBase)
  rect(12, 7 + by + earTwitch, 1, 2, pink)

  rect(19, 5 + by, 4, 4, outline)
  rect(20, 6 + by, 2, 3, furBase)
  rect(20, 7 + by, 1, 2, pink)

  // Eyes & Nose
  if (state === 'sleep' || (state === 'idle' && f === 3)) {
    rect(13, 12 + by, 2, 1, outline)
    rect(18, 12 + by, 2, 1, outline)
  } else {
    rect(13, 11 + by, 2, 2, outline)
    rect(18, 11 + by, 2, 2, outline)
  }
  rect(16, 13 + by, 1, 1, pink)

  // Sleep or Happy indicators
  if (state === 'sleep') {
    rect(23, 6 - (f % 2), 3, 1, '#c4b5fd')
    rect(24, 7 - (f % 2), 1, 1, '#c4b5fd')
    rect(23, 8 - (f % 2), 3, 1, '#c4b5fd')
  } else if (state === 'happy') {
    rect(15, 2 + (f % 2), 2, 2, '#f43f5e')
    rect(17, 2 + (f % 2), 2, 2, '#f43f5e')
    rect(16, 4 + (f % 2), 2, 2, '#f43f5e')
  }

  return pixels
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

/**
 * Triarch — The First Wyrm (48x36 Founder Exclusive)
 * Features 3 distinct dragon heads with independent idle glancing,
 * sequential sleeping, object inspection, and sovereign gold/purple breath.
 */
function drawTriarchWyrm(state: PetAnimationState, f: number): Pixel[] {
  const { pixels, rect } = createCanvasBuilder(48, 36)
  const obsidian = '#14121c'
  const charcoal = '#252232'
  const scaleLight = '#3c3750'
  const royalPurple = '#6d3b8e'
  const purpleLight = '#9458b8'
  const purpleDeep = '#46225e'
  const gold = '#d9b152'
  const goldBright = '#f5d986'
  const goldDark = '#99752c'
  const eyeEmber = '#f59e0b'

  const walkStep = state === 'walk' ? (f % 2 === 0 ? -1 : 1) : 0
  const wingLift = state === 'walk' || state === 'happy' ? (f % 2 === 0 ? -2 : 1) : f === 2 ? -1 : 0

  // Left Dragon Wing
  rect(1, 14 + wingLift, 13, 2, obsidian)
  rect(2, 13 + wingLift, 11, 2, gold)
  rect(2, 16 + wingLift, 12, 11, royalPurple)
  rect(3, 17 + wingLift, 4, 8, purpleLight)
  rect(8, 17 + wingLift, 4, 8, purpleDeep)
  rect(2, 26 + wingLift, 3, 2, obsidian)
  rect(7, 26 + wingLift, 3, 2, obsidian)

  // Right Dragon Wing
  rect(34, 14 + wingLift, 13, 2, obsidian)
  rect(35, 13 + wingLift, 11, 2, gold)
  rect(34, 16 + wingLift, 12, 11, royalPurple)
  rect(41, 17 + wingLift, 4, 8, purpleLight)
  rect(36, 17 + wingLift, 4, 8, purpleDeep)
  rect(38, 26 + wingLift, 3, 2, obsidian)
  rect(43, 26 + wingLift, 3, 2, obsidian)

  // Coiled Spiked Tail (lower right)
  rect(32, 26, 9, 6, obsidian)
  rect(33, 27, 7, 4, charcoal)
  rect(38, 24, 3, 3, gold)

  // Sovereign Armored Body & Chest
  rect(14, 18, 20, 13, obsidian)
  rect(15, 19, 18, 11, charcoal)
  rect(17, 20, 14, 9, scaleLight)

  // Antique Gold Chest Chevrons & Royal Purple Core
  rect(17, 20, 4, 3, gold)
  rect(27, 20, 4, 3, gold)
  rect(21, 21, 6, 7, royalPurple)
  rect(22, 22, 4, 5, goldDark)

  // Dragon Legs & Gold Claws
  rect(14, 29 + walkStep, 4, 5, charcoal)
  rect(14, 33 + walkStep, 4, 2, gold)
  rect(19, 30 - walkStep, 4, 5, charcoal)
  rect(19, 34 - walkStep, 4, 2, gold)
  rect(25, 30 + walkStep, 4, 5, charcoal)
  rect(25, 34 + walkStep, 4, 2, gold)
  rect(30, 29 - walkStep, 4, 5, charcoal)
  rect(30, 33 - walkStep, 4, 2, gold)

  // Calculate independent offsets for the 3 Dragon Heads
  // Left Head: inspects when state === 'sit', sleeps first in 'sleep'
  const leftOffY =
    state === 'sleep' ? 5 : state === 'sit' ? 4 : state === 'happy' ? -2 : f === 0 || f === 3 ? -1 : 0
  const leftOffX = state === 'idle' && f === 1 ? 1 : 0

  // Center Sovereign Head: tallest, sleeps last in 'sleep'
  const centerOffY =
    state === 'sleep' && f >= 2 ? 4 : state === 'happy' ? -2 : f === 1 ? -1 : 0
  const centerOffX = state === 'idle' && f === 2 ? -1 : state === 'idle' && f === 3 ? 1 : 0

  // Right Head: sleeps second in 'sleep'
  const rightOffY =
    state === 'sleep' && f >= 1 ? 5 : state === 'happy' ? -2 : f === 2 ? -1 : 0
  const rightOffX = state === 'idle' && f === 0 ? 1 : 0

  // --- LEFT NECK & HEAD ---
  rect(14, 11 + leftOffY, 5, 9, charcoal)
  rect(15, 12 + leftOffY, 2, 7, royalPurple)
  rect(8 + leftOffX, 7 + leftOffY, 9, 6, obsidian)
  rect(9 + leftOffX, 8 + leftOffY, 7, 4, charcoal)
  // Left Head Gold Horns
  rect(13 + leftOffX, 5 + leftOffY, 5, 2, gold)
  rect(15 + leftOffX, 4 + leftOffY, 3, 1, goldBright)
  // Left Head Eye
  if (state !== 'sleep') {
    rect(11 + leftOffX, 9 + leftOffY, 2, 1, eyeEmber)
  }

  // --- CENTER SOVEREIGN NECK & HEAD ---
  rect(21, 7 + centerOffY, 6, 13, obsidian)
  rect(22, 8 + centerOffY, 4, 11, charcoal)
  rect(23, 9 + centerOffY, 2, 9, goldDark)
  rect(19 + centerOffX, 2 + centerOffY, 10, 7, obsidian)
  rect(20 + centerOffX, 3 + centerOffY, 8, 5, charcoal)
  // Center Crown Horns
  rect(18 + centerOffX, 1 + centerOffY, 4, 2, gold)
  rect(26 + centerOffX, 1 + centerOffY, 4, 2, gold)
  rect(23 + centerOffX, 0 + centerOffY, 2, 2, goldBright)
  // Center Eye
  if (!(state === 'sleep' && f >= 2)) {
    rect(22 + centerOffX, 5 + centerOffY, 2, 1, eyeEmber)
    rect(25 + centerOffX, 5 + centerOffY, 1, 1, eyeEmber)
  }

  // --- RIGHT NECK & HEAD ---
  rect(29, 11 + rightOffY, 5, 9, charcoal)
  rect(31, 12 + rightOffY, 2, 7, royalPurple)
  rect(31 + rightOffX, 7 + rightOffY, 9, 6, obsidian)
  rect(32 + rightOffX, 8 + rightOffY, 7, 4, charcoal)
  // Right Head Gold Horns
  rect(30 + rightOffX, 5 + rightOffY, 5, 2, gold)
  rect(30 + rightOffX, 4 + rightOffY, 3, 1, goldBright)
  // Right Head Eye
  if (!(state === 'sleep' && f >= 1)) {
    rect(35 + rightOffX, 9 + rightOffY, 2, 1, eyeEmber)
  }

  // Rare / Greeting Breath Effect (Gold & Royal Purple Arcane Flame)
  if (state === 'happy') {
    rect(5, 5 + (f % 2), 3, 2, purpleLight)
    rect(6, 4 + (f % 2), 2, 1, goldBright)
    rect(23, 0, 2, 2, goldBright)
    rect(22, 1, 4, 1, purpleLight)
    rect(40, 5 + (f % 2), 3, 2, purpleLight)
    rect(40, 4 + (f % 2), 2, 1, goldBright)
  }

  return pixels
}

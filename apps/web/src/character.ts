import { eyeColors, outfits, type Appearance } from './appearance.ts'

export type Pixel = { x: number; y: number; w: number; h: number; color: string }
export const CHARACTER_WIDTH = 48
export const CHARACTER_HEIGHT = 64

/** Mix two 6-digit hex colors deterministically without mutating saved palette values. */
function mix(a: string, b: string, ratio: number): string {
 const channel = (at: number) =>
  Math.max(0, Math.min(255, Math.round(parseInt(a.slice(at, at + 2), 16) * (1 - ratio) + parseInt(b.slice(at, at + 2), 16) * ratio)))
   .toString(16)
   .padStart(2, '0')
 return `#${channel(1)}${channel(3)}${channel(5)}`
}

/**
 * High-detail 48x64 pixel-art RPG character sprite, shared by SVG portraits,
 * the Appearance Studio stage, and the Phaser room renderer.
 */
export function characterPixels(a: Appearance): Pixel[] {
 const p: Pixel[] = []
 const block = (x: number, y: number, w: number, h: number, color: string) => {
  const x0 = Math.max(0, Math.floor(x))
  const y0 = Math.max(0, Math.floor(y))
  const x1 = Math.min(CHARACTER_WIDTH, Math.floor(x + w))
  const y1 = Math.min(CHARACTER_HEIGHT, Math.floor(y + h))
  if (x1 > x0 && y1 > y0) p.push({ x: x0, y: y0, w: x1 - x0, h: y1 - y0, color })
 }
 const sym = (x: number, y: number, w: number, h: number, color: string) => {
  block(x, y, w, h, color)
  const mirrorX = CHARACTER_WIDTH - x - w
  if (mirrorX !== x) block(mirrorX, y, w, h, color)
 }

 const ink = '#181520'
 const outlineSoft = '#292433'
 const skin = a.skin
 const skinLight = mix(skin, '#fff4df', 0.26)
 const skinShadow = mix(skin, '#613931', 0.28)
 const skinDeep = mix(skin, '#3d211e', 0.46)
 const blush = mix(skin, '#9b654e', 0.16)

 const hair = a.hair
 const hairDeep = mix(hair, '#100e18', 0.52)
 const hairShade = mix(hair, '#181422', 0.32)
 const hairLight = mix(hair, '#f5dec2', 0.28)
 const hairShine = mix(hair, '#fff6e8', 0.46)

 const clothing = outfits[a.outfit]
 const clothDeep = mix(clothing, '#12151f', 0.5)
 const clothShade = mix(clothing, '#191d28', 0.32)
 const clothLight = mix(clothing, '#e8e4f2', 0.25)
 const clothAccent = mix(clothing, '#ffffff', 0.4)

 const eyeBase = eyeColors[a.eyes]
 const eyeDeep = mix(eyeBase, '#10121c', 0.45)
 const eyeLight = mix(eyeBase, '#b8f2ee', 0.38)

 const gold = '#e5c168'
 const goldShade = '#9e7836'
 const goldLight = '#fff0b8'
 const cyan = '#5ce6dc'
 const cyanLight = '#b8faf5'
 const paper = '#f2ead8'

 // 1. BACK LAYER: Flowing capes, collars, and back hair silhouettes
 if (a.outfit === 'medieval') {
  // Flowing hooded adventurer cloak behind shoulders & torso
  sym(6, 35, 36, 1, ink)
  sym(5, 36, 38, 18, ink)
  sym(4, 42, 40, 14, ink)
  block(7, 36, 34, 18, '#344238')
  block(6, 42, 36, 13, '#29352d')
  sym(6, 37, 4, 17, '#495c4e')
  sym(8, 39, 2, 14, '#627866')
  // Burgundy inner cloak lining glimpse
  sym(10, 48, 3, 7, '#6b2d3b')
  block(10, 54, 28, 2, ink)
 } else if (a.outfit === 'tech') {
  // High cyber-collar & back pack fins
  block(13, 31, 22, 6, ink)
  block(14, 32, 20, 5, '#202b38')
  sym(15, 32, 3, 4, '#36495e')
  sym(16, 33, 1, 2, cyan)
 }

 if (a.hairStyle === 'long') {
  // Cascading long hair behind shoulders down to waist
  sym(7, 13, 6, 32, ink)
  sym(6, 18, 6, 25, ink)
  block(10, 12, 28, 33, ink)
  block(9, 14, 30, 29, hairDeep)
  sym(8, 16, 5, 27, hairShade)
  sym(7, 19, 4, 22, hair)
  sym(8, 22, 2, 15, hairLight)
  // Stepped strand tips at bottom
  sym(7, 43, 3, 3, ink)
  sym(8, 42, 2, 3, hairShade)
  sym(11, 44, 3, 2, hairDeep)
 } else if (a.hairStyle === 'curly') {
  // Voluminous curly cloud clusters framing head & neck
  sym(6, 12, 7, 22, ink)
  sym(5, 16, 6, 15, ink)
  block(9, 11, 30, 24, hairDeep)
  sym(7, 13, 6, 19, hairShade)
  sym(6, 17, 5, 12, hair)
  sym(7, 19, 2, 4, hairLight)
  sym(8, 26, 2, 4, hairLight)
 }

 // 2. LEGS, TROUSERS & BOOTS (y: 49..63)
 // Left & right leg outlines
 sym(13, 50, 9, 12, ink)
 sym(11, 58, 11, 5, ink)

 if (a.outfit === 'everyday') {
  // Cuffed dark denim jeans & two-tone street sneakers
  sym(14, 50, 7, 7, '#31374d')
  sym(15, 50, 3, 6, '#404863')
  sym(14, 56, 7, 2, '#7d849c') // Denim cuff
  // Sneakers
  sym(12, 58, 9, 4, '#ded7c8')
  sym(13, 58, 5, 2, '#f5efe2')
  sym(16, 58, 3, 1, clothing) // Tongue/lace accent
  sym(12, 61, 9, 1, '#b0a695') // Sole
 } else if (a.outfit === 'medieval') {
  // Wool breeches & buckled leather riding boots
  sym(14, 50, 7, 4, '#453b37')
  sym(15, 50, 3, 4, '#594d48')
  // Folded boot cuffs
  sym(13, 54, 9, 2, ink)
  sym(14, 54, 7, 2, '#875e42')
  sym(12, 56, 9, 6, '#63422d')
  sym(14, 56, 4, 5, '#7a533a')
  sym(15, 57, 2, 2, gold) // Boot buckle
  sym(12, 61, 9, 1, '#3b2619')
 } else {
  // Cyber-armored tactical trousers & neon-trimmed boots
  sym(14, 50, 7, 5, '#25303d')
  sym(15, 51, 4, 3, '#384759')
  sym(13, 55, 9, 2, ink)
  sym(14, 55, 7, 2, '#4d6178') // Knee/shin guard
  sym(12, 57, 9, 5, '#1d2630')
  sym(14, 57, 5, 4, '#2f3d4c')
  sym(14, 59, 4, 1, cyan) // Glowing boot strip
  sym(12, 61, 9, 1, '#121820')
 }

 // 3. TORSO, ARMS, HANDS & OUTFIT DETAILS (y: 33..52)
 // Neck & collar shadow
 block(19, 32, 10, 6, ink)
 block(20, 33, 8, 4, skinDeep)
 block(21, 33, 6, 3, skinShadow)

 // Outer torso & sleeves silhouette
 block(11, 36, 26, 15, ink)
 sym(8, 38, 5, 11, ink)
 sym(7, 40, 5, 9, ink)

 // Hands
 sym(7, 47, 5, 5, ink)
 sym(8, 47, 4, 4, skinShadow)
 sym(9, 47, 3, 3, skin)
 sym(9, 47, 2, 1, skinLight)

 // Base jacket/tunic fill
 block(12, 37, 24, 13, clothShade)
 block(13, 37, 22, 12, clothing)
 sym(8, 39, 4, 8, clothShade)
 sym(9, 39, 3, 7, clothing)
 sym(9, 40, 1, 5, clothLight)

 if (a.outfit === 'everyday') {
  // Cream inner tee with subtle pixel motif + open layered hoodie/jacket
  block(19, 37, 10, 12, paper)
  block(20, 37, 8, 2, '#dfd4be')
  block(21, 40, 6, 3, '#d48a76') // Shirt graphic stripe
  block(22, 41, 4, 1, '#f7efe0')
  // Jacket lapels & zipper edges
  sym(16, 37, 3, 12, clothLight)
  sym(18, 38, 1, 11, ink)
  // Hoodie drawstrings
  sym(19, 38, 1, 5, '#ffffff')
  // Pockets & ribbed hem
  sym(13, 44, 4, 4, clothDeep)
  sym(13, 44, 4, 1, clothLight)
  block(12, 49, 24, 2, clothDeep)
  block(21, 49, 6, 2, '#424658')
  // Sleeve cuffs
  sym(8, 46, 4, 1, paper)
 } else if (a.outfit === 'medieval') {
  // Sculpted pauldrons (shoulder armor)
  sym(7, 35, 8, 6, ink)
  sym(8, 36, 6, 4, goldShade)
  sym(9, 36, 5, 3, gold)
  sym(10, 36, 3, 1, goldLight)
  // Tunic embroidery & chest baldric strap
  block(14, 38, 20, 11, clothing)
  sym(14, 38, 3, 10, clothShade)
  block(19, 37, 10, 3, gold)
  block(21, 38, 6, 2, '#7d2e3d') // Cloak gem at throat
  block(22, 38, 2, 1, '#ff9aa8')
  // Diagonal leather baldric
  block(15, 39, 4, 3, '#6e4930')
  block(18, 41, 5, 3, '#6e4930')
  block(22, 43, 5, 3, '#6e4930')
  block(26, 45, 5, 3, '#6e4930')
  block(21, 42, 4, 3, gold)
  // Royal waist belt & buckle
  block(12, 47, 24, 3, '#422c1d')
  block(21, 47, 6, 3, gold)
  block(22, 48, 4, 1, '#5e3f28')
  // Wrist bracers
  sym(8, 44, 4, 3, '#6e4930')
  sym(9, 45, 2, 1, gold)
 } else if (a.outfit === 'tech') {
  // Angular titanium shoulder guards
  sym(7, 36, 8, 5, ink)
  sym(8, 37, 6, 3, '#7b91a8')
  sym(9, 37, 4, 1, '#c7d8e8')
  sym(9, 39, 3, 1, cyan)
  // Cyber jacket panels & neon conduits
  block(14, 37, 20, 12, '#273545')
  sym(14, 38, 4, 10, clothing)
  sym(17, 38, 1, 10, cyan)
  sym(18, 38, 1, 10, ink)
  // Central holo-core chest piece
  block(20, 39, 8, 5, '#16202b')
  block(21, 40, 6, 3, cyan)
  block(22, 40, 4, 1, cyanLight)
  // Sleeve neon stripe
  sym(9, 43, 3, 1, cyan)
  // Utility belt with glowing cells
  block(12, 48, 24, 2, '#1a222c')
  sym(15, 48, 3, 2, cyan)
  block(22, 48, 4, 2, '#9faec0')
 }

 // 4. HEAD, EARS & EXPRESSIVE RPG FACE (y: 8..34)
 // Stepped rounded head outline
 block(15, 8, 18, 27, ink)
 block(13, 9, 22, 25, ink)
 block(11, 11, 26, 21, ink)
 block(10, 13, 28, 17, ink)

 // Ears
 sym(8, 19, 3, 7, ink)
 sym(9, 20, 2, 5, skinShadow)
 sym(9, 20, 1, 3, skin)

 // Face skin fill with 3D contour shading
 block(15, 10, 18, 23, skinShadow)
 block(13, 11, 22, 21, skinShadow)
 block(11, 13, 26, 17, skinShadow)
 block(12, 12, 24, 18, skin)
 block(14, 11, 20, 20, skin)
 block(16, 31, 16, 1, skin)

 // Forehead & cheek highlights
 block(14, 16, 4, 7, skinLight)
 block(21, 15, 6, 4, skinLight)
 // Warm cheek blush
 sym(12, 25, 4, 2, blush)

 // Eyebrows
 sym(14, 18, 6, 1, hairDeep)
 sym(15, 17, 4, 1, hairShade)

 // Compact RPG eyes: restrained highlights and brow shading, rather than oversized anime eyes.
 sym(14, 20, 5, 1, skinDeep)
 sym(15, 21, 4, 3, eyeDeep)
 sym(16, 21, 3, 3, eyeBase)
 sym(17, 21, 2, 2, ink)
 sym(16, 21, 1, 1, '#f2ead8')
 sym(17, 23, 1, 1, eyeLight)

 // Nose & gentle smile
 block(23, 25, 2, 2, skinShadow)
 block(23, 24, 1, 1, skinLight)
 block(21, 29, 6, 1, skinDeep)
 block(22, 29, 4, 1, outlineSoft)
 block(22, 30, 4, 1, skinShadow)

 // 5. FRONT & CROWN HAIRSTYLES (short, long, curly, swept)
 if (a.hairStyle === 'short') {
  // Tousled RPG hero hair with layered spikes & crown halo highlight
  block(14, 4, 20, 4, ink)
  block(11, 6, 26, 5, ink)
  block(9, 8, 30, 8, ink)
  block(8, 11, 32, 6, ink)
  // Spiky crown tufts
  block(18, 3, 6, 2, ink)
  block(26, 4, 5, 2, ink)
  block(10, 7, 4, 2, ink)
  block(35, 8, 4, 2, ink)
  // Hair fill
  block(14, 5, 20, 5, hairShade)
  block(11, 7, 26, 7, hair)
  block(10, 10, 28, 6, hair)
  block(19, 4, 4, 2, hair)
  block(26, 5, 4, 2, hair)
  // Sideburns framing temples
  sym(9, 14, 3, 7, ink)
  sym(10, 14, 3, 6, hairShade)
  sym(10, 14, 2, 5, hair)
  // Forehead bangs (stepped, not boxy!)
  block(12, 15, 24, 1, skinShadow) // Soft shadow under bangs
  block(12, 13, 5, 4, hair)
  block(14, 17, 2, 1, hairShade)
  block(18, 13, 6, 3, hair)
  block(20, 16, 3, 2, hair)
  block(25, 13, 6, 4, hairShade)
  block(26, 13, 4, 3, hair)
  block(31, 13, 5, 3, hair)
  // Halo crown highlights
  block(14, 8, 7, 2, hairLight)
  block(16, 8, 3, 1, hairShine)
  block(25, 8, 8, 2, hairLight)
  block(27, 8, 4, 1, hairShine)
 } else if (a.hairStyle === 'long') {
  // Sleek parted crown with cheek-framing side locks
  block(13, 5, 22, 4, ink)
  block(10, 7, 28, 6, ink)
  block(8, 10, 32, 7, ink)
  block(13, 6, 22, 5, hairShade)
  block(10, 8, 28, 7, hair)
  // Cheek-framing front locks cascading past jawline
  sym(8, 14, 4, 18, ink)
  sym(9, 14, 3, 17, hair)
  sym(9, 24, 2, 7, hairShade)
  sym(10, 16, 1, 7, hairLight)
  // Soft parted bangs
  block(13, 15, 22, 1, skinShadow)
  block(12, 12, 8, 4, hair)
  block(13, 16, 4, 2, hair)
  block(21, 12, 6, 3, hairShade)
  block(28, 12, 8, 4, hair)
  block(31, 16, 4, 2, hair)
  // Crown specular band
  block(13, 9, 9, 2, hairLight)
  block(15, 9, 4, 1, hairShine)
  block(26, 9, 9, 2, hairLight)
  block(28, 9, 4, 1, hairShine)
 } else if (a.hairStyle === 'curly') {
  // Fluffy, cloud-like curl puffs across the crown & brow
  block(15, 3, 18, 4, ink)
  block(10, 5, 28, 6, ink)
  block(7, 8, 34, 9, ink)
  // Individual curl puffs
  block(16, 4, 7, 6, hair)
  block(24, 4, 8, 6, hair)
  block(11, 6, 7, 7, hair)
  block(30, 6, 7, 7, hair)
  block(8, 10, 6, 8, hairShade)
  block(34, 10, 6, 8, hairShade)
  block(10, 10, 28, 5, hair)
  // Ringlet bangs over brow
  block(13, 15, 22, 1, skinShadow)
  block(12, 13, 5, 4, hair)
  block(14, 17, 2, 1, ink)
  block(19, 13, 5, 3, hairShade)
  block(20, 13, 3, 3, hair)
  block(26, 13, 5, 4, hair)
  block(28, 17, 2, 1, ink)
  block(32, 14, 4, 5, hair)
  // Curly specular highlights
  block(13, 8, 3, 2, hairLight)
  block(18, 5, 4, 2, hairLight)
  block(19, 5, 2, 1, hairShine)
  block(26, 6, 4, 2, hairLight)
  block(27, 6, 2, 1, hairShine)
  block(32, 9, 3, 2, hairLight)
 } else if (a.hairStyle === 'swept') {
  // Dynamic wind-swept diagonal fringe & asymmetrical volume
  block(13, 5, 23, 4, ink)
  block(10, 7, 29, 6, ink)
  block(7, 10, 32, 7, ink)
  block(6, 13, 8, 4, ink) // Swept outer wing on left
  block(13, 6, 22, 5, hairShade)
  block(10, 8, 27, 7, hair)
  block(8, 12, 18, 5, hair)
  block(7, 13, 6, 3, hairLight)
  // Diagonal swept bangs across forehead
  block(13, 15, 21, 1, skinShadow)
  block(10, 14, 12, 3, hair)
  block(11, 17, 7, 2, hair)
  block(12, 19, 3, 1, hairShade)
  block(23, 13, 8, 3, hairShade)
  block(24, 13, 6, 2, hair)
  block(33, 14, 5, 6, ink)
  block(33, 14, 4, 5, hairShade)
  block(33, 14, 3, 4, hair)
  // Sweeping highlight ribbons
  block(12, 8, 12, 2, hairLight)
  block(14, 8, 6, 1, hairShine)
  block(22, 11, 10, 2, hairLight)
 }

 // 6. FOREGROUND ACCESSORIES (glasses, headphones, crown)
 if (a.accessory === 'glasses') {
  // Crisp pixel eyewear with gold bridge & sky-blue lens glint
  sym(13, 19, 8, 1, ink)
  sym(13, 25, 8, 1, ink)
  sym(13, 19, 1, 7, ink)
  sym(20, 19, 1, 7, ink)
  sym(11, 20, 2, 1, ink) // Temple arms
  block(21, 21, 6, 1, gold) // Gold nose bridge
  // Diagonal lens reflections
  sym(14, 20, 2, 1, '#d8f6ff')
  sym(15, 21, 1, 1, '#d8f6ff')
 } else if (a.accessory === 'headphones') {
  // Studio/cyber over-ear headset with padded arch & glowing rings
  block(13, 4, 22, 3, ink)
  block(10, 6, 4, 4, ink)
  block(34, 6, 4, 4, ink)
  block(14, 5, 20, 2, '#3a4154')
  block(18, 5, 12, 1, '#7c859e')
  // Earcups
  sym(6, 16, 5, 10, ink)
  sym(8, 10, 3, 6, ink)
  sym(9, 10, 1, 6, '#6e768f')
  sym(7, 17, 3, 8, '#3b4254')
  sym(8, 18, 2, 6, '#8d99bc')
  sym(8, 19, 1, 4, cyanLight)
 } else if (a.accessory === 'crown') {
  // Ornate 5-point royal gold crown with inset ruby & sapphire gems
  block(13, 1, 22, 7, ink)
  block(14, 5, 20, 2, goldShade)
  block(14, 4, 20, 2, gold)
  // Five spires
  block(14, 2, 3, 3, gold)
  block(18, 3, 3, 2, gold)
  block(22, 1, 4, 4, gold)
  block(27, 3, 3, 2, gold)
  block(31, 2, 3, 3, gold)
  // Specular gold tips
  block(15, 2, 1, 1, goldLight)
  block(23, 1, 2, 1, goldLight)
  block(32, 2, 1, 1, goldLight)
  // Crown jewels (sapphire, central ruby, sapphire)
  block(17, 5, 2, 1, '#4ca8e8')
  block(23, 4, 2, 2, '#e0485c')
  block(29, 5, 2, 1, '#4ca8e8')
 }

 return p
}

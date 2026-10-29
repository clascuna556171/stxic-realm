import type { Appearance } from '../appearance'
import type { Pixel } from '../character'
import type { RoomObject } from './room'
import { worldPalettes } from './palette.ts'
import { libraryShelfPixels } from './sprite-art.ts'

// Original, deterministic high-detail pixel artwork inspired by the STXIC Realm v3 & room concepts.
const ink = '#191722'
const woodDark = '#523829'
const wood = '#7d563c'
const woodMid = '#9c6d4c'
const woodLight = '#c49166'
const woodHighlight = '#e3b587'
const gold = '#e5c168'
const goldDark = '#9e7836'
const goldLight = '#fff0b8'
const cyan = '#5ce6dc'
const violet = '#a78bfa'

export function furniturePixels(id: string, mood: Appearance['mood'] = 'cozy'): Pixel[] {
 if (id === 'bookshelf') return libraryShelfPixels(mood)
 const p: Pixel[] = []
 const r = (x: number, y: number, w: number, h: number, color: string) => {
  const rx = Math.floor(x)
  const ry = Math.floor(y)
  const rw = Math.floor(w)
  const rh = Math.floor(h)
  if (rw > 0 && rh > 0) p.push({ x: rx, y: ry, w: rw, h: rh, color })
 }

 if (id === 'desk') {
  // Floor shadow & warm under-desk glow
  r(2, 50, 92, 11, '#241e29')
  r(6, 26, 8, 31, ink)
  r(82, 26, 8, 31, ink)
  // Desk apron & side drawer cabinet (left) + PC tower (right)
  r(5, 25, 86, 8, woodDark)
  r(6, 28, 24, 26, ink)
  r(8, 29, 20, 23, '#4a3a33')
  r(10, 31, 16, 6, '#695349')
  r(10, 39, 16, 6, '#695349')
  r(10, 47, 16, 4, '#695349')
  r(16, 33, 4, 2, gold)
  r(16, 41, 4, 2, gold)
  r(16, 48, 4, 1, gold)
  // Right PC / studio sub-unit with neon LED strip
  r(68, 28, 20, 26, ink)
  r(70, 29, 16, 23, '#282a38')
  r(72, 32, 12, 18, '#1d1f2b')
  r(82, 33, 2, 15, cyan)
  r(74, 34, 5, 2, violet)
  // Desktop surface (beveled oak top)
  r(0, 17, 96, 10, ink)
  r(2, 18, 92, 7, wood)
  r(3, 18, 90, 5, woodMid)
  r(4, 18, 88, 2, woodLight)
  r(6, 18, 84, 1, woodHighlight)
  // Desk mat, mechanical keyboard & mouse
  r(28, 20, 42, 5, '#252634')
  r(31, 21, 24, 3, '#d9d2c5')
  for (let i = 0; i < 7; i++) r(32 + i * 3, 21, 2, 2, i === 0 ? '#e06c75' : i === 6 ? cyan : '#4a4d5e')
  r(59, 21, 5, 3, '#cfc8b8')
  r(61, 21, 1, 2, violet)
  // Left Monitor: Code Editor IDE
  r(24, -4, 32, 21, ink)
  r(26, -2, 28, 17, '#1d2230')
  r(26, -2, 28, 2, '#323a4f')
  r(28, -1, 2, 1, '#f56565')
  r(31, -1, 2, 1, '#ecc94b')
  r(34, -1, 2, 1, '#48bb78')
  for (let i = 0; i < 5; i++) {
   r(28, 2 + i * 2, 4, 1, '#b794f4')
   r(34, 2 + i * 2, 7 + ((i * 5) % 11), 1, i % 2 === 0 ? cyan : '#fbd38d')
   if (i % 2 === 1) r(44, 2 + i * 2, 6, 1, '#68d391')
  }
  r(37, 17, 6, 3, ink)
  r(33, 19, 14, 2, '#414558')
  // Right Monitor: Twilight Mountain & Moon Wallpaper
  r(56, -2, 26, 19, ink)
  r(58, 0, 22, 15, '#2b2347')
  r(58, 0, 22, 5, '#1e1836')
  r(73, 2, 4, 4, '#fff0b8') // Moon on monitor
  r(58, 8, 10, 7, '#463669') // Left peak
  r(62, 6, 6, 2, '#6b539c')
  r(66, 7, 14, 8, '#382b57') // Right peak
  r(70, 5, 6, 2, '#805ad5')
  r(58, 13, 22, 2, '#ed8936') // Sunset horizon line
  r(66, 17, 6, 3, ink)
  r(63, 19, 12, 2, '#414558')
  // Warm Globe Desk Lamp (left corner)
  r(7, 6, 12, 12, ink)
  r(8, 7, 10, 10, '#f6cd7b')
  r(10, 8, 6, 7, '#fff3c4')
  r(9, 17, 8, 3, goldDark)
  // Purple Pixel Bunny Companion on Desk
  r(19, 10, 8, 9, ink)
  r(20, 7, 2, 4, ink)
  r(24, 7, 2, 4, ink)
  r(20, 8, 2, 3, violet)
  r(24, 8, 2, 3, violet)
  r(20, 11, 6, 7, '#9f7aea')
  r(21, 12, 4, 4, '#b794f4')
  r(21, 14, 1, 1, ink)
  r(24, 14, 1, 1, ink)
  // Steaming Coffee Mug (right corner)
  r(83, 12, 8, 8, ink)
  r(84, 13, 6, 6, '#f4efe2')
  r(90, 14, 2, 4, '#dfd5c3')
  r(85, 13, 4, 1, '#5c3d2e')
  r(85, 9, 1, 2, '#d8d4e6')
  r(88, 8, 1, 3, '#d8d4e6')
  // Ergonomic Gaming/Studio Chair in front of desk
  r(33, 26, 30, 34, ink)
  r(35, 24, 26, 6, ink)
  r(35, 27, 26, 25, '#2b2938')
  r(37, 25, 22, 24, '#39364a')
  r(39, 27, 18, 19, '#242230')
  // Purple plus/stitch emblem on chair backrest
  r(47, 33, 2, 8, violet)
  r(44, 36, 8, 2, violet)
  // Chair armrests & caster wheels
  r(31, 36, 4, 12, ink)
  r(32, 37, 2, 10, '#4a475e')
  r(61, 36, 4, 12, ink)
  r(62, 37, 2, 10, '#4a475e')
  r(46, 52, 4, 6, ink)
  r(38, 57, 20, 3, '#4a475e')
  r(37, 59, 3, 3, ink)
  r(47, 59, 2, 3, ink)
  r(56, 59, 3, 3, ink)
 }

 if (id === 'sofa') {
  // Deep plush 3-seat charcoal/indigo sofa with throw pillows & kitten
  r(2, 49, 92, 10, '#221c26')
  r(8, 54, 7, 6, ink)
  r(81, 54, 7, 6, ink)
  r(9, 55, 5, 4, wood)
  r(82, 55, 5, 4, wood)
  // Main frame & tufted backrest
  r(4, 2, 88, 48, ink)
  r(6, 4, 84, 26, '#303446')
  r(8, 5, 80, 22, '#3f455c')
  r(10, 6, 76, 3, '#59617d')
  // Backrest cushion seams & tuft buttons
  r(34, 5, 2, 22, '#292d3d')
  r(60, 5, 2, 22, '#292d3d')
  r(21, 14, 2, 2, '#252836')
  r(47, 14, 2, 2, '#252836')
  r(73, 14, 2, 2, '#252836')
  // Three plush seat cushions
  for (let i = 0; i < 3; i++) {
   const cx = 10 + i * 26
   r(cx, 26, 24, 22, '#353a4d')
   r(cx + 1, 27, 22, 18, '#464d63')
   r(cx + 2, 27, 20, 2, '#636b87')
   r(cx + 1, 43, 22, 4, '#292d3d')
  }
  // Bolstered armrests
  r(0, 15, 11, 37, ink)
  r(2, 17, 8, 33, '#4b5269')
  r(3, 17, 6, 3, '#6c7491')
  r(85, 15, 11, 37, ink)
  r(86, 17, 8, 33, '#4b5269')
  r(87, 17, 6, 3, '#6c7491')
  // Left Warm Ochre Throw Pillow
  r(12, 10, 18, 17, ink)
  r(14, 12, 14, 13, '#c98859')
  r(15, 13, 12, 10, '#e0a475')
  r(19, 14, 2, 8, '#a66a40')
  r(16, 17, 8, 2, '#a66a40')
  // Right Checkered Violet/Slate Throw Pillow
  r(66, 10, 18, 17, ink)
  r(68, 12, 14, 13, '#7b7399')
  for (let py = 0; py < 3; py++) {
   for (let px = 0; px < 3; px++) {
    if ((px + py) % 2 === 0) r(69 + px * 4, 13 + py * 4, 4, 3, '#b8b0d4')
   }
  }
  // Small White Pixel Kitten sitting on middle cushion
  r(43, 17, 12, 11, ink)
  r(44, 15, 3, 3, ink)
  r(51, 15, 3, 3, ink)
  r(45, 16, 2, 2, '#f5d0da')
  r(51, 16, 2, 2, '#f5d0da')
  r(44, 18, 10, 9, '#f5efe6')
  r(45, 19, 8, 7, '#ffffff')
  r(46, 21, 2, 2, ink)
  r(50, 21, 2, 2, ink)
  r(48, 23, 2, 1, '#f687b3')
 }

 if (id === 'lantern') {
  // Warm wrought-iron & brass medieval lantern with glowing amber aura
  r(3, 25, 26, 6, '#3a2d29')
  r(6, 26, 20, 4, woodDark)
  r(8, 6, 16, 21, ink)
  r(9, 6, 14, 3, goldDark)
  r(10, 7, 12, 1, gold)
  r(9, 24, 14, 3, goldDark)
  r(10, 25, 12, 1, gold)
  // Glowing glass & flame core
  r(10, 9, 12, 15, '#c98838')
  r(12, 10, 8, 13, '#f6bc56')
  r(13, 11, 6, 11, '#ffe699')
  r(15, 13, 2, 7, '#ffffff')
  // Iron cage bars & top ring
  r(15, 9, 2, 15, '#3b2e2a')
  r(10, 16, 12, 2, '#3b2e2a')
  r(11, 3, 10, 3, ink)
  r(13, 4, 6, 2, gold)
  r(14, 0, 4, 4, gold)
 }

 if (id === 'banner') {
  // Medieval Royal Tapestry Banner with Crossed Broadswords behind it
  // Crossed swords blades & gold hilts
  r(1, 2, 6, 6, gold)
  r(25, 2, 6, 6, gold)
  r(4, 5, 6, 5, '#cbd5e0')
  r(22, 5, 6, 5, '#cbd5e0')
  r(2, 24, 5, 5, '#a0aec0')
  r(25, 24, 5, 5, '#a0aec0')
  // Top wooden/gold crossbar
  r(1, 0, 30, 4, ink)
  r(2, 1, 28, 2, woodLight)
  r(2, 1, 4, 2, gold)
  r(26, 1, 4, 2, gold)
  // Weathered wine-red cloth and antique brass, shared with the hall heraldry.
  r(5, 3, 22, 25, ink)
  r(6, 4, 20, 22, '#4d2930')
  r(8, 4, 16, 20, '#693740')
  r(10, 4, 12, 18, '#82464a')
  r(7, 5, 18, 1, '#c5a374')
  // Gold fringe bottom & tassels
  r(6, 26, 20, 3, goldDark)
  for (let i = 0; i < 5; i++) r(7 + i * 4, 27, 2, 4, gold)
  // Heraldic Gold Star & Sword Crest
  r(15, 7, 2, 14, gold)
  r(11, 12, 10, 2, gold)
  r(13, 10, 6, 6, gold)
  r(14, 11, 4, 4, goldLight)
  r(15, 12, 2, 2, '#ffffff')
 }

 if (id === 'console') {
  // Hybrid Vinyl Turntable + Neon Cyber Telemetry Console
  r(2, 3, 28, 27, ink)
  r(4, 4, 24, 24, '#272c3a')
  r(5, 5, 22, 10, '#394154')
  // Spinning Vinyl Record LP on top deck
  r(7, 6, 13, 8, ink)
  r(8, 7, 11, 6, '#181a24')
  r(12, 9, 3, 2, '#e53e3e') // Red vinyl center label
  r(13, 9, 1, 1, gold)
  r(21, 6, 2, 7, '#cbd5e0') // Silver tonearm
  r(20, 11, 2, 2, gold)
  // Front Cyber Telemetry Screen & Equalizer Bars
  r(6, 16, 20, 10, '#141c26')
  r(7, 17, 18, 1, cyan)
  for (let i = 0; i < 6; i++) {
   const bh = 2 + ((i * 3) % 5)
   r(8 + i * 3, 24 - bh, 2, bh, i % 2 === 0 ? cyan : violet)
  }
  // Floating pixel music note above turntable
  r(24, -4, 5, 2, violet)
  r(24, -4, 2, 6, violet)
  r(28, -4, 2, 5, violet)
  r(22, 0, 3, 2, '#d6bcfa')
  r(26, -1, 3, 2, '#d6bcfa')
 }

 if (id === 'plant') {
  // Lush Tropical Monstera in Sculpted Terracotta Pot
  r(6, 22, 20, 8, '#2b2224')
  r(5, 10, 22, 5, ink)
  r(7, 14, 18, 13, ink)
  r(6, 11, 20, 3, '#d9936c')
  r(8, 14, 16, 12, '#b86f4c')
  r(10, 15, 3, 10, '#d9936c')
  r(20, 15, 2, 10, '#8a4e33')
  // Stem & layered broad pixel leaves
  r(14, -8, 4, 20, '#2a4736')
  r(3, -10, 12, 8, ink)
  r(4, -9, 10, 6, '#3b6e52')
  r(5, -8, 6, 3, '#68a37c')
  r(17, -14, 12, 9, ink)
  r(18, -13, 10, 7, '#467d5e')
  r(20, -12, 6, 4, '#7ebc92')
  r(9, -21, 14, 10, ink)
  r(10, -20, 12, 8, '#528f6b')
  r(12, -19, 8, 4, '#92cfa3')
  r(1, -2, 12, 8, ink)
  r(2, -1, 10, 6, '#2f5942')
  r(4, 0, 6, 3, '#589471')
  r(19, -4, 12, 8, ink)
  r(20, -3, 10, 6, '#3b6e52')
  r(22, -2, 6, 3, '#7ebc92')
  // Glowing firefly spark
  r(25, -18, 2, 2, goldLight)
 }

 if (id === 'bed') {
  // Cozy Carved Timber Bed with Quilted Blanket & Sleeping Pixel Cat
  r(1, 0, 62, 92, ink)
  // Carved wooden headboard
  r(3, -4, 58, 18, ink)
  r(4, -3, 56, 16, woodDark)
  r(6, -1, 52, 12, wood)
  r(5, -2, 54, 2, woodLight)
  r(7, -1, 50, 1, woodHighlight)
  r(4, -5, 6, 4, gold) // Left finial
  r(54, -5, 6, 4, gold) // Right finial
  // Mattress & crisp cream sheets
  r(4, 12, 56, 74, '#cfc2b0')
  r(6, 13, 52, 70, '#ebe0ce')
  // Two plush pillows with soft shading
  r(8, 14, 22, 15, ink)
  r(9, 15, 20, 13, '#dfd3c0')
  r(10, 16, 18, 10, '#f7efe2')
  r(12, 17, 14, 3, '#ffffff')
  r(34, 14, 22, 15, ink)
  r(35, 15, 20, 13, '#dfd3c0')
  r(36, 16, 18, 10, '#f7efe2')
  r(38, 17, 14, 3, '#ffffff')
  // Folded top sheet
  r(5, 31, 54, 7, '#f5ece0')
  r(5, 37, 54, 2, '#bfb19e')
  // Quilted Indigo/Violet Blanket
  r(5, 39, 54, 44, '#35384f')
  r(7, 40, 50, 40, '#484c6b')
  r(8, 40, 48, 3, '#666b91')
  for (let row = 0; row < 4; row++) {
   for (let col = 0; col < 5; col++) {
    r(11 + col * 9, 46 + row * 8, 5, 1, '#63688f')
    r(13 + col * 9, 44 + row * 8, 1, 5, '#63688f')
   }
  }
  // Wooden footboard & posts
  r(4, 83, 56, 7, wood)
  r(5, 83, 54, 2, woodLight)
  r(4, 89, 7, 5, ink)
  r(53, 89, 7, 5, ink)
  // Sleeping Black-and-White Tuxedo Pixel Cat curled up on the bed!
  r(12, 42, 22, 16, ink)
  r(14, 40, 4, 4, ink) // Left ear
  r(22, 40, 4, 4, ink) // Right ear
  r(15, 41, 2, 2, '#f687b3')
  r(23, 41, 2, 2, '#f687b3')
  r(13, 43, 20, 13, '#22212b') // Cat body
  r(15, 44, 14, 10, '#2f2e3b')
  r(15, 49, 10, 6, '#f7f1e6') // White muzzle & paws
  r(16, 47, 3, 1, ink) // Closed sleeping eye
  r(21, 47, 3, 1, ink) // Closed sleeping eye
  r(19, 49, 2, 1, '#f687b3') // Pink nose
  r(30, 48, 5, 7, ink) // Curled tail
  r(31, 49, 3, 5, '#22212b')
  r(31, 48, 3, 2, '#f7f1e6') // White tail tip
 }

 if (id === 'coffee-table') {
  // Warm Oak Coffee Table with Open Guestbook, Quill, Plant & Mug
  r(2, 24, 60, 6, '#2b2122')
  r(6, 19, 6, 11, ink)
  r(52, 19, 6, 11, ink)
  r(1, 3, 62, 19, ink)
  r(3, 4, 58, 16, wood)
  r(4, 4, 56, 13, woodMid)
  r(5, 4, 54, 2, woodLight)
  r(7, 4, 50, 1, woodHighlight)
  // Open Guestbook Journal & Feather Quill (left)
  r(7, 6, 22, 12, ink)
  r(8, 7, 20, 10, '#593a28')
  r(9, 7, 9, 9, '#f7efe0')
  r(18, 7, 1, 9, '#b09e86')
  r(19, 7, 8, 9, '#efe4d0')
  for (let i = 0; i < 3; i++) {
   r(10, 9 + i * 2, 6, 1, '#8c7d6b')
   r(20, 9 + i * 2, 5, 1, '#8c7d6b')
  }
  // Purple feather quill resting on Guestbook
  r(24, 4, 6, 2, violet)
  r(23, 6, 4, 2, '#d6bcfa')
  r(22, 8, 2, 2, gold)
  // Small Potted Tabletop Plant (center)
  r(31, 6, 10, 10, ink)
  r(32, 10, 8, 5, '#b87352')
  r(31, 5, 10, 5, '#3b6e52')
  r(33, 3, 6, 5, '#68a37c')
  // Steaming Ceramic Mug & Retro Controller (right)
  r(44, 6, 10, 10, ink)
  r(45, 7, 7, 8, '#f5efe2')
  r(52, 9, 2, 4, '#d9cfc0')
  r(46, 7, 5, 2, '#634232')
  r(47, 3, 1, 2, '#e2e0ec')
  r(50, 2, 1, 3, '#e2e0ec')
 }

 if (id === 'floor-lamp') {
  // Warm Pleated-Shade Standing Reading Lamp
  r(5, 25, 22, 6, '#2b2224')
  r(9, 23, 14, 4, ink)
  r(10, 24, 12, 2, woodLight)
  r(14, -2, 4, 26, ink)
  r(15, -2, 2, 26, gold)
  // Glowing pleated lampshade
  r(4, -17, 24, 17, ink)
  r(6, -16, 20, 15, '#d69e49')
  r(8, -15, 16, 13, '#f6cd7b')
  r(11, -14, 10, 11, '#fff3c4')
  r(13, -12, 6, 7, '#ffffff')
  // Pleat lines & gold finial
  r(10, -15, 1, 13, '#c78c38')
  r(21, -15, 1, 13, '#c78c38')
  r(6, -2, 20, 2, gold)
  r(14, -20, 4, 3, gold)
 }

 const c = worldPalettes[mood]
 const colors: Record<string,string> = {
  '#191722':'#19202b', '#523829':c.timber[0], '#7d563c':c.timber[1], '#9c6d4c':c.timber[1], '#c49166':c.timber[2], '#e3b587':mood==='tech'?'#9fb8c8':'#e8bb87',
  '#303446':c.cloth[0], '#3f455c':c.cloth[1], '#59617d':c.cloth[2], '#353a4d':c.cloth[0], '#464d63':c.cloth[1], '#636b87':c.cloth[2], '#4b5269':c.cloth[1], '#6c7491':c.cloth[2],
  '#292d3d':c.cloth[0], '#35384f':c.cloth[0], '#484c6b':c.cloth[1], '#666b91':c.cloth[2], '#63688f':c.cloth[2],
  '#7b7399':mood==='tech'?'#668ba3':'#c0b398', '#b8b0d4':mood==='tech'?'#a3cad3':'#efe2c5', '#5ce6dc':mood==='tech'?'#77d8dc':'#9bc2b5', '#a78bfa':mood==='tech'?'#a0b8d8':'#a3b699'
 }
 return p.map(pixel=>({...pixel,color:colors[pixel.color]??pixel.color}))
}

export function roomPixels(mood: Appearance['mood']): Pixel[] {
 const p: Pixel[] = []
 const r = (x: number, y: number, w: number, h: number, color: string) => {
  const x0 = Math.max(0, Math.floor(x))
  const y0 = Math.max(0, Math.floor(y))
  const x1 = Math.min(512, Math.floor(x + w))
  const y1 = Math.min(384, Math.floor(y + h))
  if (x1 > x0 && y1 > y0) p.push({ x: x0, y: y0, w: x1 - x0, h: y1 - y0, color })
 }

 const palettes = {
  cozy: {
   outer: '#11121c',
   foliage: ['#19282c', '#243b3e', '#345452', '#4c756c'],
   wallOuter: '#252330',
   wallTop: '#4c465c',
   wall: '#cbb99a',
   wallPanel: '#b19a7e',
   trim: '#ead8b8',
   baseboard: '#4f3d32',
   floor: ['#ad7850', '#bb865a', '#c99668', '#d2a475', '#a36d49'],
   seam: '#523727',
   ray: '#b38962',
   sky: '#1e2640',
   rugMain: '#425c4a',
   rugInner: '#708b6d',
   rugBorder: '#d9c9a9',
  },
  medieval: {
   outer: '#121018',
   foliage: ['#1b2422', '#283631', '#3b4f44', '#546b58'],
   wallOuter: '#242029',
   wallTop: '#524954',
   wall: '#6e645b',
   wallPanel: '#574e47',
   trim: '#b8a282',
   baseboard: '#3d332d',
   floor: ['#5e4535', '#694d3b', '#735541', '#7d5d47', '#523b2d'],
   seam: '#3d2b20',
   ray: '#96714e',
   sky: '#1b2036',
   rugMain: '#753b42',
   rugInner: '#965056',
   rugBorder: '#dbb98f',
  },
  tech: {
   outer: '#0d121c',
   foliage: ['#13242e', '#1c3745', '#285061', '#3b7082'],
   wallOuter: '#1c2433',
   wallTop: '#3e4f69',
   wall: '#4a576b',
   wallPanel: '#394454',
   trim: '#94a8c2',
   baseboard: '#26303d',
   floor: ['#3e4352', '#454b5c', '#4c5366', '#545c70', '#353a47'],
   seam: '#262a36',
   ray: '#5c6b85',
   sky: '#131d33',
   rugMain: '#384661',
   rugInner: '#4c5f80',
   rugBorder: '#82c4cc',
  },
 }
 const material = worldPalettes[mood]
 const c = { ...palettes[mood], wall: material.wall[0], wallPanel: material.wall[1], trim: material.trim,
  wallOuter: material.stone[0], wallTop: material.stone[2], baseboard: material.timber[0],
  floor: [...material.floor, material.floor[0]], seam: material.seam, sky: material.sky[0],
  rugMain: material.cloth[0], rugInner: material.cloth[1] }

 // 1. EXTERIOR TWILIGHT SKY, DISTANT BAY & LUSH PERIMETER FOLIAGE
 r(0, 0, 512, 384, c.outer)
 // Distant city skyline & water shimmer on the far right (x: 488..512)
 r(488, 90, 24, 190, '#161829')
 for (let i = 0; i < 4; i++) {
  const bx = 490 + i * 5
  const bh = 22 + ((i * 7) % 18)
  r(bx, 128 - bh, 4, bh, '#232740')
  r(bx + 1, 130 - bh, 1, 2, '#f6cd7b')
 }
 r(488, 130, 24, 140, '#1b1d33')
 for (let wy = 0; wy < 14; wy++) {
  r(490 + (wy % 3) * 2, 136 + wy * 9, 16 - (wy % 4) * 2, 2, wy % 2 === 0 ? '#5c4d8a' : '#8066b8')
 }
 // Exterior bushes & leaf clusters framing bottom and sides
 const bushSpots = [
  [4, 240, 22, 130],
  [12, 342, 188, 38],
  [312, 342, 188, 38],
  [486, 260, 22, 110],
 ]
 for (const [bx, by, bw, bh] of bushSpots) {
  r(bx, by, bw, bh, c.foliage[0])
  for (let lx = bx + 4; lx < bx + bw - 8; lx += 14) {
   for (let ly = by + 4; ly < by + bh - 6; ly += 12) {
    r(lx, ly, 10, 8, c.foliage[1])
    r(lx + 2, ly + 1, 6, 5, c.foliage[2])
    if ((lx + ly) % 3 === 0) r(lx + 3, ly + 2, 3, 2, c.foliage[3])
   }
  }
 }
 // Twinkling exterior fireflies & blossoms
 for (const [fx, fy, col] of [
  [14, 290, '#b794f4'],
  [36, 368, '#ffe699'],
  [94, 374, '#b794f4'],
  [168, 364, cyan],
  [348, 366, '#b794f4'],
  [422, 372, '#ffe699'],
  [496, 310, cyan],
 ] as const) {
  r(fx, fy, 3, 3, col)
  r(fx + 1, fy + 1, 1, 1, '#ffffff')
 }

 // 2. OUTER CUTAWAY ARCHITECTURAL SHELL
 r(18, 8, 476, 354, ink)
 r(20, 10, 472, 350, c.wallOuter)
 r(22, 10, 468, 4, c.wallTop)
 r(28, 34, 456, 320, '#2a242b')

 // 3. STAGGERED FLOORBOARDS WITH GRAIN, SEAMS & NAIL HEADS
 for (let row = 0; row < 22; row++) {
  const y = 40 + row * 14
  for (let col = -1; col < 7; col++) {
   const x = 32 + col * 80 + (row % 2) * 40
   const left = Math.max(32, x)
   const right = Math.min(480, x + 80)
   if (right <= left) continue
   const shade = c.floor[(row * 5 + col + 10) % c.floor.length]
   r(left, y, right - left, 13, shade)
   r(left, y + 13, right - left, 1, c.seam)
   if (x >= 32 && x < 480) {
    r(x, y, 1, 14, c.seam)
    r(x + 3, y + 3, 1, 1, woodLight)
    r(x + 3, y + 10, 1, 1, woodLight)
   }
   if (right - left > 24) {
    r(left + 8, y + 4, Math.min(36, right - left - 12), 1, c.floor[(row + col + 7) % c.floor.length])
    r(left + 16, y + 9, Math.min(22, right - left - 18), 1, c.floor[(row + col + 9) % c.floor.length])
   }
  }
 }
 // Top & side floor cast shadows for 3D depth
 r(32, 48, 448, 8, '#382a26')
 r(32, 56, 8, 292, '#3d2e29')

 // 4. INTERIOR BACK WALL, TRIM & BASEBOARD
 r(24, 12, 464, 40, ink)
 r(26, 13, 460, 36, c.wall)
 // Wainscot panels along back wall
 for (let px = 34; px < 470; px += 28) {
  r(px, 18, 22, 24, c.wallPanel)
  r(px + 2, 20, 18, 20, c.wall)
 }
 // Castle masonry, carved timber uprights and staggered mortar. The structural
 // shell changes with the mood; furniture coordinates and collision stay intact.
 if (mood === 'medieval') {
  for (let row = 0; row < 4; row++) {
   const y = 15 + row * 8
   for (let col = 0; col < 17; col++) {
    const x = 28 + col * 28 - (row % 2) * 14
    r(x, y, 27, 7, ['#6c685c', '#777164', '#625f54'][(row + col) % 3])
    r(x + 2, y, 23, 1, '#938671')
    if ((row + col) % 4 === 0) r(x + 5, y + 4, 7, 1, '#58554c')
   }
  }
  for (const x of [32, 174, 306, 468]) {
   r(x, 14, 6, 35, '#352d25')
   r(x + 1, 14, 2, 34, '#8a6b47')
   r(x - 2, 41, 10, 5, '#3e352a')
   r(x, 42, 6, 1, goldDark)
  }
 }
 r(24, 11, 464, 4, c.trim)
 r(26, 46, 460, 4, c.baseboard)
 if (mood === 'tech') r(28, 45, 456, 1, cyan)
 // Left & right interior cutaway walls
 r(22, 12, 10, 344, c.wallOuter)
 r(23, 12, 4, 344, c.wallTop)
 r(480, 12, 10, 344, c.wallOuter)
 r(485, 12, 4, 344, c.wallTop)
 // Bottom cutaway wall & grand entrance threshold
 r(22, 348, 192, 10, c.wallTop)
 r(298, 348, 192, 10, c.wallTop)
 r(22, 356, 192, 6, c.wallOuter)
 r(298, 356, 192, 6, c.wallOuter)

 // 5. PANORAMA NIGHT WINDOW (x: 184..304, y: 12..54) & MOONBEAM RAYS
 r(184, 12, 120, 43, ink)
 r(186, 13, 116, 40, c.trim)
 r(190, 16, 108, 33, ink)
 r(192, 18, 104, 29, c.sky)
 // Daylight in the conservatory; quiet moonlight in the evening settings.
 r(274, 21, 9, 9, '#fff0b8')
 if (mood !== 'cozy') {
  r(272, 20, 6, 6, c.sky)
  r(202, 22, 2, 2, '#ffffff')
  r(226, 20, 1, 1, '#fff0b8')
  r(252, 24, 2, 2, '#ffffff')
 } else {
  r(201, 24, 15, 3, '#dce8d8'); r(205, 22, 8, 3, '#dce8d8')
  r(249, 29, 16, 3, '#dce8d8')
 }
 // Skyline / Castle spires inside window
 for (let i = 0; i < 13; i++) {
  const bh = 6 + ((i * 9 + (mood === 'medieval' ? 5 : 2)) % 18)
  const bx = 193 + i * 8
  r(bx, 47 - bh, 7, bh, i % 2 === 0 ? '#27314a' : '#323f5e')
  if (mood === 'medieval' && i % 3 === 0) r(bx + 2, 44 - bh, 3, 3, '#27314a') // Spire tip
  if (i % 2 === 0) r(bx + 2, 49 - bh, 2, 2, '#f6cd7b')
  if (i % 3 === 1) r(bx + 4, 53 - bh, 1, 2, mood === 'tech' ? cyan : '#f6cd7b')
 }
 // Window mullions & sill
 r(243, 16, 3, 33, c.trim)
 r(190, 32, 108, 2, c.trim)
 r(184, 49, 120, 4, woodLight)
 r(186, 53, 116, 3, woodDark)
 // Diagonal warm window light rays across floor
 r(194, 58, 42, 12, c.ray)
 r(248, 58, 42, 12, c.ray)
 r(200, 72, 38, 10, c.ray)
 r(254, 72, 38, 10, c.ray)

 // 6. BACK-WALL GALLERY, HANGING IVY & DISPLAY SHELVES
 // Left Framed Cosmic Ringed-Planet Poster (x: 42..78, y: 15..45)
 r(42, 15, 36, 30, ink)
 r(44, 17, 32, 26, '#39324a')
 r(46, 19, 28, 22, '#1b182c')
 r(55, 25, 10, 10, '#9f7aea')
 r(57, 26, 6, 6, '#d6bcfa')
 r(49, 30, 22, 2, '#f6e05e') // Planet ring
 r(51, 22, 2, 2, '#ffffff')
 r(68, 35, 2, 2, cyan)
 // Cascading green wall ivy vine (x: 82..98, y: 10..48)
 r(84, 10, 12, 36, '#274534')
 r(86, 12, 8, 30, '#3d6b50')
 r(88, 15, 4, 22, '#68a37c')
 // Two small gallery frames & sticky notes (x: 102..172)
 for (let i = 0; i < 2; i++) {
  const fx = 104 + i * 26
  r(fx, 17, 22, 24, ink)
  r(fx + 2, 19, 18, 20, woodLight)
  r(fx + 4, 21, 14, 16, i === 0 ? '#384d5e' : '#5e4247')
  r(fx + 6, 25, 10, 8, '#f0e6d2')
 }
 r(158, 20, 8, 8, '#f6e05e')
 r(168, 24, 8, 8, '#fbd38d')
 r(160, 31, 8, 8, '#b794f4')

 // Right Wall Trophy Shelf & Mountain Painting (x: 318..472)
 r(320, 32, 64, 4, woodLight)
 r(320, 36, 64, 2, woodDark)
 // Golden Trophy on shelf
 r(328, 18, 10, 14, ink)
 r(329, 19, 8, 8, gold)
 r(331, 20, 3, 5, goldLight)
 r(331, 27, 4, 5, goldDark)
 // Lucky Cat figure on shelf
 r(344, 21, 10, 11, ink)
 r(345, 22, 8, 9, '#f7f1e6')
 r(346, 25, 2, 1, ink)
 r(350, 25, 2, 1, ink)
 r(347, 28, 4, 2, '#e53e3e')
 // Shelf books
 for (let i = 0; i < 4; i++) {
  r(358 + i * 5, 20 + (i % 2) * 2, 4, 12 - (i % 2) * 2, ['#9f7aea', '#4fd1c5', '#f6ad55', '#fc8181'][i])
 }
 // Large Framed Twilight Mountain Landscape Painting (x: 390..452, y: 15..45)
 r(390, 15, 62, 30, ink)
 r(392, 17, 58, 26, woodLight)
 r(394, 19, 54, 22, '#2d2447')
 r(394, 19, 54, 7, '#46386b')
 r(434, 21, 5, 5, '#fff0b8')
 r(396, 30, 24, 11, '#554380')
 r(402, 26, 12, 4, '#7f67b5')
 r(416, 28, 30, 13, '#3b2e5e')
 r(424, 24, 14, 4, '#9f7aea')
 // Trailing right-wall pothos vine
 r(456, 12, 14, 34, '#274534')
 r(458, 14, 10, 28, '#3d6b50')
 r(460, 16, 6, 20, '#68a37c')

 // 7. RUGS, GLOWING ORBITAL PORTAL PAD & ENTRANCE STEP
 // Checkered accent runner rug (x: 336..382, y: 134..224)
 r(336, 134, 46, 90, ink)
 r(338, 136, 42, 86, '#343246')
 for (let ry = 0; ry < 7; ry++) {
  for (let rx = 0; rx < 3; rx++) {
   if ((rx + ry) % 2 === 0) r(340 + rx * 13, 138 + ry * 12, 12, 11, '#47445e')
  }
 }
 // Plush Woven Living-Room Rug under Sofa & Coffee Table (x: 74..226, y: 182..294)
 r(74, 182, 152, 112, '#3d3138')
 r(76, 184, 148, 108, c.rugBorder)
 r(80, 188, 140, 100, c.rugMain)
 r(86, 194, 128, 88, c.rugBorder)
 r(89, 197, 122, 82, c.rugInner)
 // Ornamental rug fringe tassels (top & bottom)
 for (let i = 0; i < 36; i++) {
  r(78 + i * 4, 179, 2, 3, c.rugBorder)
  r(78 + i * 4, 294, 2, 3, c.rugBorder)
 }
 // Rug border diamond motifs
 for (let i = 0; i < 14; i++) {
  r(92 + i * 8, 190, 4, 2, gold)
  r(92 + i * 8, 282, 4, 2, gold)
 }

 // A little woven floor medallion, with colors from the selected room materials.
 r(272, 244, 48, 32, material.timber[0])
 r(269, 249, 54, 22, c.rugBorder)
 r(274, 246, 44, 28, c.rugBorder)
 r(275, 250, 42, 20, material.cloth[0])
 r(281, 253, 30, 14, material.cloth[1])
 r(290, 256, 12, 8, c.rugBorder)
 r(294, 253, 4, 14, c.rugBorder)

 // Grand Entrance Welcome Mat, Twin Lantern Pillars & Stone Steps (x: 194..318, y: 310..382)
 r(222, 310, 68, 36, ink)
 r(224, 312, 64, 32, material.timber[0])
 r(226, 314, 60, 28, material.timber[1])
 r(228, 314, 56, 2, material.timber[2])
 // Home rune icon on entrance mat
 r(252, 322, 8, 4, material.trim)
 r(250, 326, 12, 8, material.trim)
 r(254, 329, 4, 5, material.timber[1])
 // Stone entrance stairs
 r(214, 348, 84, 10, '#454154')
 r(218, 350, 76, 4, '#635e78')
 r(210, 358, 92, 10, '#363342')
 r(214, 360, 84, 4, '#524d63')
 r(206, 368, 100, 12, '#282533')
 // Twin glowing entrance post lanterns
 for (const lx of [196, 304]) {
  r(lx, 332, 12, 24, ink)
  r(lx + 2, 334, 8, 12, '#f6bc56')
  r(lx + 3, 336, 6, 8, '#fff3c4')
  r(lx + 1, 346, 10, 8, woodDark)
 }

 const details: Record<string,string> = {
  '#b794f4':material.cloth[2], '#9f7aea':material.cloth[1], '#d6bcfa':material.trim,
  '#343246':material.cloth[0], '#47445e':material.cloth[1], '#39324a':material.timber[0],
  '#1b182c':material.sky[0], '#2d2447':material.sky[0], '#46386b':material.sky[1],
  '#554380':material.cloth[1], '#7f67b5':material.stone[2], '#3b2e5e':material.cloth[0],
  '#5c4d8a':material.sky[1], '#8066b8':material.sky[2], '#635e78':material.stone[2],
  '#454154':material.stone[1], '#363342':material.stone[0], '#524d63':material.stone[1], '#282533':'#19202b',
 }
 return p.map(pixel=>({...pixel,color:details[pixel.color]??pixel.color}))
}

export function composedRoomPixels(mood: Appearance['mood'], objects: RoomObject[]): Pixel[] {
 return [
  ...roomPixels(mood),
  ...[...objects]
   .sort((a, b) => a.y - b.y)
   .flatMap(o => furniturePixels(o.id, mood).map(p => ({ ...p, x: p.x + o.x * 32, y: p.y + o.y * 32 }))),
 ]
}

import type { Appearance } from '../appearance'
import type { Pixel } from '../character'
import type { RoomObject } from './room'
import { worldPalettes } from './palette.ts'
import { petCornerPixels } from './pet-corner.ts'
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
  // Three-seat upholstered sofa with a clear sitting cushion and folded throw.
  r(2, 49, 92, 10, '#221c26')
  r(8, 54, 7, 6, ink)
  r(81, 54, 7, 6, ink)
  r(9, 55, 5, 4, wood)
  r(82, 55, 5, 4, wood)
  // Stepped shoulders, inset upholstered back and a load-bearing timber frame.
  r(4, 2, 88, 48, ink)
  r(6, 4, 84, 26, '#303446')
  r(8, 5, 80, 22, '#3f455c')
  r(10, 6, 76, 3, '#59617d')
  r(4, 2, 4, 3, woodDark)
  r(88, 2, 4, 3, woodDark)
  r(6, 48, 84, 5, woodDark)
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
  // Folded linen throw leaves the resident's seat clear; pets are real actors.
  r(67, 26, 15, 20, '#ded0b4')
  r(69, 27, 11, 17, '#efe2c5')
  r(71, 28, 2, 14, '#b8aa8e')
  r(67, 44, 15, 2, '#b8aa8e')
  for (let x=68;x<82;x+=3) r(x,46,1,3,'#ded0b4')
  // Visible timber lower rail and recessed feet, below the upholstered seat.
  r(11, 50, 74, 3, woodDark)
  r(13, 50, 70, 1, woodLight)

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
  // Physical control labels, a lever and feet make the turntable inspectable.
  r(6, 27, 4, 2, goldDark); r(21, 27, 4, 2, goldDark)
  r(23, 17, 2, 2, '#e7d7bb'); r(23, 21, 2, 3, gold)

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
  // Leaf notches and a low pebble rim keep the plant a grounded habitat.
  r(13, -17, 2, 4, '#2a4736'); r(19, -9, 3, 2, '#2a4736')
  r(7, 12, 18, 1, '#e2b28c'); r(11, 25, 11, 1, '#8a4e33')

 }

 if (id === 'bed') {
  // Carved bed, inset headboard, linen pillows and a folded foot blanket.
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
  for (const x of [23, 41]) r(x,44,1,20,'#35384f')
  r(9, 57, 46, 1, '#35384f')
  // Wooden footboard & posts
  r(4, 83, 56, 7, wood)
  r(5, 83, 54, 2, woodLight)
  r(4, 89, 7, 5, ink)
  r(53, 89, 7, 5, ink)
  // Folded blanket at the foot; the pillow and quilt remain usable by a resident.
  r(8, 66, 48, 12, '#ded0b4')
  r(9, 67, 46, 8, '#efe2c5')
  r(10, 68, 44, 1, '#f7efe2')
  r(9, 75, 46, 2, '#b8aa8e')
  r(13, 67, 2, 8, '#b8aa8e')
  r(49, 67, 2, 8, '#b8aa8e')
  // Raised panel joinery, bed rails and planted square posts.
  r(9, 2, 46, 8, woodDark)
  r(11, 3, 42, 6, woodMid)
  r(3, 14, 2, 68, woodLight)
  r(59, 14, 2, 68, woodDark)

 }

 if (id === 'coffee-table') {
  // Mortised low table, recessed shelf, journal and a ceramic mug.
  r(2, 24, 60, 6, '#2b2122')
  r(10, 23, 44, 4, woodDark)
  r(12, 23, 40, 1, woodLight)
  r(18, 21, 16, 2, '#ded0b4')
  r(20, 19, 14, 2, '#854454')
  r(6, 19, 6, 11, ink)
  r(52, 19, 6, 11, ink)
  r(1, 3, 62, 19, ink)
  r(3, 4, 58, 16, wood)
  r(4, 4, 56, 13, woodMid)
  r(5, 4, 54, 2, woodLight)
  r(7, 4, 50, 1, woodHighlight)
  r(4, 20, 56, 2, woodDark)
  r(6, 21, 4, 8, woodMid)
  r(54, 21, 4, 8, woodDark)
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

 // Construction changes across moods, not just a recolor of identical surfaces.
 const finish = worldPalettes[mood]
 if (id === 'desk') {
  // Framed drawer fronts, recessed pulls, a sturdy apron and purposeful chair upholstery.
  for (const y of [31,39,47]) {
   r(9,y,18,5,finish.timber[0]); r(10,y,16,1,finish.timber[2])
   r(17,y+2,4,1,mood==='tech'?finish.trim:goldDark)
  }
  r(36,27,24,22,finish.cloth[0]); r(38,28,20,18,finish.cloth[1])
  r(39,29,18,1,finish.cloth[2]); r(38,47,20,2,finish.cloth[0])
  r(46,52,4,5,finish.timber[2])
  if(mood==='medieval') {
   r(70,29,16,23,finish.timber[0]); r(72,31,12,19,finish.timber[1])
   r(72,32,12,2,goldDark); r(72,46,12,2,goldDark); r(77,38,3,3,gold)
  } else if(mood==='tech') {
   r(3,24,90,3,finish.stone[0]); r(4,24,88,1,finish.trim)
   r(8,29,20,23,finish.stone[0])
   for(const y of [31,39,47]) {r(10,y,16,5,finish.stone[1]);r(20,y+2,4,1,finish.trim)}
  }
 }
 if(id==='sofa' && mood==='medieval') {
  // Leather panels with hand-set brass corner studs and a timber base.
  for(const x of [12,38,64]) {r(x,28,20,1,'#bf9670');r(x+1,42,18,1,'#512e3e')}
  for(const x of [3,88]) for(const y of [22,42]) r(x,y,2,2,goldDark)
 } else if(id==='sofa' && mood==='tech') {
  r(2,48,8,4,finish.stone[1]);r(86,48,8,4,finish.stone[1])
  r(12,51,72,2,finish.trim);r(14,51,68,1,finish.stone[0])
 }
 if(id==='bed' && mood==='tech') {
  r(4,-3,56,15,finish.stone[0]);r(7,0,50,9,finish.stone[1])
  r(9,1,46,1,finish.trim);r(30,1,2,8,finish.stone[0])
  r(4,83,56,7,finish.stone[0]);r(6,84,52,2,finish.trim)
 } else if(id==='bed' && mood==='medieval') {
  for(const x of [5,55]) {r(x,-3,4,14,finish.timber[0]);r(x,1,4,2,goldDark)}
 }

 // Material details use the selected mood without changing object footprints.
 const material = worldPalettes[mood]
 if (id === 'desk') {
  r(8, 23, 18, 1, material.timber[0]); r(9, 20, 12, 1, material.timber[2])
  r(9, 15, 10, 5, '#ded0b4'); r(10, 16, 6, 1, '#9e8a6b') // folded project note
  r(86, 29, 1, 18, material.timber[2])
 }
 if (id === 'bed') {
  // Woven seam and hem distinguish linen from timber and metal.
  for(let x=9;x<56;x+=4) r(x,79,2,1,material.cloth[2])
  r(58,39,1,42,material.cloth[0]); r(5,38,54,1,'#f5ece0')
 }
 if (id === 'coffee-table') {
  r(8,19,48,1,material.timber[0]); r(35,13,4,1,material.timber[2])
  r(45,15,8,1,material.timber[0]) // mug contact, not a glow
 }
 if (id === 'lantern' && mood === 'tech') {
  r(10,9,12,15,material.stone[0]); r(12,11,8,11,material.sky[1])
  r(14,12,2,9,material.sky[2]); r(18,12,2,9,material.sky[2])
  r(10,23,12,1,material.trim)
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

/** Original cutaway architecture. The 16×12 movement grid is unchanged. */
export function roomPixels(mood: Appearance['mood']): Pixel[] {
 const p: Pixel[]=[]
 const c=worldPalettes[mood]
 const r=(x:number,y:number,w:number,h:number,color:string)=>{p.push({x,y,w,h,color})}
 // Quiet planted exterior and a continuous stone foundation.
 r(0,0,512,384,'#111820')
 r(18,12,476,352,c.stone[0]);r(22,10,468,4,c.stone[2])
 r(28,48,456,302,c.seam)
 // Long oak boards, hewn pavers, or inset slate panels. Sparse material marks
 // leave the central circulation lane calmer than the furniture silhouettes.
 const rowHeight=mood==='cozy'?20:28
 for(let y=50,row=0;y<348;y+=rowHeight,row++) {
  const width=mood==='cozy'?112:56
  for(let x=32-(row%2)*width/2,col=0;x<480;x+=width,col++) {
   const left=Math.max(32,x),right=Math.min(480,x+width),bottom=Math.min(348,y+rowHeight)
   r(left,y,right-left-1,bottom-y-1,c.floor[(row+col)%4])
   if(mood==='cozy'&&(row+col)%3===0&&right-left>50) r(left+12,y+6,28,1,c.floor[(row+col+1)%4])
   if(mood==='medieval'&&right-left>20) {r(left+2,y+1,right-left-5,1,c.stone[1]);if((row+col)%5===0)r(left+3,bottom-3,8,1,c.seam)}
   if(mood==='tech'&&right-left>20) {r(left+2,y+1,right-left-5,1,c.stone[1]);if((row+col)%4===0)r(right-4,bottom-5,1,2,c.trim)}
  }
 }
 // Back plaster / hewn stone / metal wall, with real thickness and a lower dado.
 r(24,12,464,40,c.timber[0]);r(30,16,452,28,c.wall[0])
 if(mood==='cozy') {
  r(30,16,452,3,c.wall[2])
  for(const x of [34,108,314,392,468]) {r(x,17,4,27,c.timber[1]);r(x,17,1,27,c.timber[2])}
 } else if(mood==='medieval') {
  for(let row=0;row<3;row++) for(let x=30-(row%2)*14;x<480;x+=28) {
   const left=Math.max(30,x),right=Math.min(482,x+27)
   r(left,16+row*9,right-left,8,c.wall[(row+x/14)%3===0?1:0])
   r(left+1,16+row*9,Math.max(1,right-left-2),1,c.stone[2])
  }
 } else {
  for(const x of [34,110,314,394]) {r(x,18,68,23,c.stone[0]);r(x+2,19,64,20,c.wall[0]);r(x+4,20,60,1,c.stone[1])}
 }
 r(26,44,460,3,c.timber[2]);r(26,47,460,5,c.timber[0])
 r(32,52,448,3,c.seam)
 // Cutaway side walls: an inner face, top cap and low skirting (no new blockers).
 for(const x of [22,480]) {
  r(x,12,10,344,c.wall[1]);r(x,12,4,344,c.wall[2]);r(x+4,12,2,344,c.trim)
  r(x+7,52,3,296,c.timber[0])
  if(mood==='medieval') for(let y=64;y<344;y+=28) r(x+6,y,4,2,c.stone[0])
  if(mood==='tech') for(let y=68;y<340;y+=56) {r(x+7,y,2,20,c.stone[0]);r(x+7,y,1,6,c.trim)}
 }
 // Deep window reveal and broad sill; view is shared with the existing ambient layer.
 r(180,12,128,44,c.timber[0]);r(183,14,122,38,c.trim)
 r(188,17,112,32,c.stone[0]);r(192,18,104,29,c.sky[0])
 r(274,21,9,9,'#fff0b8')
 if(mood!=='cozy') {r(272,20,6,6,c.sky[0]);r(202,22,2,2,c.trim);r(226,20,1,1,c.trim);r(252,24,2,2,c.trim)}
 else {r(201,24,15,3,'#dce8d8');r(205,22,8,3,'#dce8d8');r(249,29,16,3,'#dce8d8')}
 for(let i=0;i<13;i++) {
  const bh=6+((i*9+(mood==='medieval'?5:2))%18),x=193+i*8
  r(x,47-bh,7,bh,c.sky[1]);if(i%2===0)r(x+2,49-bh,2,2,c.sky[2])
 }
 r(243,16,3,33,c.trim);r(190,32,108,2,c.trim)
 r(180,49,128,4,c.timber[2]);r(182,53,124,3,c.timber[0]);r(186,56,116,2,c.seam)
 // Linen curtains, heavy hanging leather, or a rigid observatory shutter.
 for(const x of [174,306]) {
  r(x,14,7,33,c.cloth[0]);r(x+1,15,3,27,c.cloth[1]);r(x+4,16,1,29,c.cloth[2])
  r(x,35,7,2,mood==='tech'?c.trim:goldDark)
 }
 // A restrained gallery and useful shelf above the work/rest zones.
 r(42,19,36,25,c.timber[0]);r(44,21,32,21,c.trim);r(46,23,28,17,c.sky[0])
 r(48,34,24,6,c.cloth[0]);r(52,29,12,9,c.cloth[1]);r(64,25,4,4,c.sky[2])
 for(const x of [106,134]) {r(x,21,20,21,c.timber[0]);r(x+2,23,16,17,c.trim);r(x+5,26,10,11,c.cloth[1]);r(x+7,28,6,7,c.cloth[2])}
 r(320,32,64,4,c.timber[2]);r(320,36,64,2,c.timber[0])
 r(324,38,3,5,c.timber[0]);r(377,38,3,5,c.timber[0])
 r(328,18,10,14,c.timber[0]);r(329,19,8,8,goldDark);r(331,20,3,5,gold);r(331,27,4,5,goldDark)
 r(344,21,10,11,c.timber[0]);r(345,22,8,9,'#f7f1e6');r(346,25,2,1,ink);r(350,25,2,1,ink);r(347,28,4,2,'#82464a')
 for(let i=0;i<4;i++) {r(358+i*5,20+i%2*2,4,12-i%2*2,[c.cloth[0],c.cloth[1],c.timber[1],c.trim][i]);r(359+i*5,23+i%2*2,2,1,c.trim)}
 r(398,19,62,25,c.timber[0]);r(400,21,58,21,c.trim);r(402,23,54,17,c.sky[0]);r(404,32,22,8,c.stone[1]);r(412,28,12,4,c.stone[2]);r(426,31,28,9,c.cloth[0]);r(436,25,5,5,c.sky[2])
 // A continuous entrance frame and inset woven mat, grounded in stone steps.
 for(const [x,w] of [[22,192],[298,192]]) {r(x,348,w,8,c.trim);r(x,356,w,6,c.stone[0]);r(x+2,349,w-4,2,c.wall[2])}
 r(222,314,68,30,c.timber[0]);r(224,316,64,26,c.trim);r(226,318,60,22,c.cloth[0])
 for(let y=320;y<338;y+=4)r(230,y,52,1,c.cloth[1])
 r(214,348,84,10,c.stone[1]);r(218,349,76,3,c.stone[2]);r(210,358,92,10,c.stone[0]);r(214,359,84,3,c.stone[1]);r(206,368,100,8,c.stone[0])
 for(const x of [196,304]) {r(x,332,12,24,c.timber[0]);r(x+2,334,8,12,goldDark);r(x+3,336,6,8,'#ffe6ad');r(x+1,346,10,8,c.timber[1])}
 // Sparse planting is outside the navigable room, rather than repeated sparkle noise.
 for(const x of [28,66,104,350,390,434,474]) {r(x,366,12,9,'#243b38');r(x+2,364,7,7,'#34564a')}
 return p
}

/** Furniture-attached floor textiles. No catalog, collision or saved-layout data. */
export function roomTextilePixels(mood: Appearance['mood'], objects: RoomObject[]): Pixel[] {
 const c=worldPalettes[mood],p:Pixel[]=[]
 const r=(x:number,y:number,w:number,h:number,color:string)=>{
  const left=Math.max(32,x),top=Math.max(56,y),right=Math.min(480,x+w),bottom=Math.min(348,y+h)
  if(right>left&&bottom>top)p.push({x:left,y:top,w:right-left,h:bottom-top,color})
 }
 const sofa=objects.find(o=>o.id==='sofa')
 if(sofa) {
  const x=sofa.x*32-12,y=sofa.y*32-4,w=120,h=100
  r(x,y,w,h,c.timber[0]);r(x+2,y+2,w-4,h-4,c.trim);r(x+5,y+5,w-10,h-10,c.cloth[0]);r(x+9,y+9,w-18,h-18,c.cloth[1])
  for(const yy of [y+7,y+h-8])r(x+7,yy,w-14,1,c.cloth[2])
  for(let xx=x+4;xx<x+w-4;xx+=4){r(xx,y-2,2,2,c.trim);r(xx,y+h,2,2,c.trim)}
 }
 const bed=objects.find(o=>o.id==='bed')
 if(bed) {
  const x=bed.x*32-22,y=bed.y*32+12
  r(x,y,18,76,c.timber[0]);r(x+1,y+1,16,74,c.trim);r(x+3,y+3,12,70,c.cloth[0]);r(x+5,y+7,8,62,c.cloth[1])
 }
 return p
}

export function composedRoomPixels(mood: Appearance['mood'], objects: RoomObject[]): Pixel[] {
 return [
  ...roomPixels(mood),
  ...roomTextilePixels(mood, objects),
  ...petCornerPixels(objects, mood),
  ...[...objects]
   .sort((a, b) => a.y - b.y)
   .flatMap(o => furniturePixels(o.id, mood).map(p => ({ ...p, x: p.x + o.x * 32, y: p.y + o.y * 32 }))),
 ]
}

/** Reuse the real furniture pixels for occlusion instead of painting a second chair/quilt. */
export function furnitureActionForeground(id:string,mood:Appearance['mood'],skin:string):Pixel[]{
 const pixels=furniturePixels(id,mood)
 if(id==='desk')return [
  {x:34,y:21,w:5,h:3,color:skin},{x:55,y:21,w:5,h:3,color:skin},
  ...pixels.filter(p=>p.x>=31&&p.x+p.w<=65&&p.y>=24)]
 if(id==='sofa')return pixels.filter(p=>p.y>=43)
 if(id==='bed')return pixels.filter(p=>p.y>=31)
 return []
}

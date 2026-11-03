import { eyeColors, outfits, type Appearance } from './appearance.ts'
import type { Direction } from './world/room.ts'

export type Pixel = { x: number; y: number; w: number; h: number; color: string }
export const CHARACTER_WIDTH = 48
export const CHARACTER_HEIGHT = 64
type Pose = 'stand' | 'sit' | 'rest'
type Point = readonly [number, number]
type Run = Omit<Pixel, 'color'>
const INK = '#202029', LINEN = '#eee0bd', GOLD = '#cba568', GOLD_LIGHT = '#f1d497', STEEL = '#8295a4', CYAN = '#9ed9d8'

/** Material ramps never change the owner's saved palette. */
function mix(a: string, b: string, ratio: number): string {
 const channel = (at: number) => Math.round(parseInt(a.slice(at, at + 2), 16) * (1 - ratio) + parseInt(b.slice(at, at + 2), 16) * ratio).toString(16).padStart(2, '0')
 return `#${channel(1)}${channel(3)}${channel(5)}`
}

// Rasterize authored contours once on pixel centers. Four-neighbor insetting
// gives the stepped garments consistent one-pixel outlines. Merge equal runs
// vertically so SVG and Phaser still consume a small list of rectangles.
const contours = new Map<string, { edge: Run[]; fill: Run[] }>()
function contour(points: readonly Point[]) {
 const key = points.map(p => p.join(',')).join(' '), cached = contours.get(key)
 if (cached) return cached
 const x0 = Math.min(...points.map(p => p[0])), x1 = Math.max(...points.map(p => p[0]))
 const y0 = Math.min(...points.map(p => p[1])), y1 = Math.max(...points.map(p => p[1]))
 const mask = new Set<string>()
 for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
  let inside = false
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
   const [ax, ay] = points[i], [bx, by] = points[j]
   if ((ay > y + .5) !== (by > y + .5) && x + .5 < (bx - ax) * (y + .5 - ay) / (by - ay) + ax) inside = !inside
  }
  if (inside) mask.add(`${x},${y}`)
 }
 const runs = (inset: boolean): Run[] => {
  const result: Run[] = [], previous = new Map<string, Run>()
  for (let y = y0; y < y1; y++) {
   const has = (x: number) => mask.has(`${x},${y}`) && (!inset || [[x-1,y],[x+1,y],[x,y-1],[x,y+1]].every(p => mask.has(p.join(','))))
   for (let x = x0; x < x1; x++) if (has(x)) {
    const start = x
    while (x + 1 < x1 && has(x + 1)) x++
    const w = x - start + 1, id = `${start},${w}`, above = previous.get(id)
    if (above && above.y + above.h === y) above.h++
    else { const run = { x: start, y, w, h: 1 }; result.push(run); previous.set(id, run) }
   }
  }
  return result
 }
 const value = { edge: runs(false), fill: runs(true) }; contours.set(key, value)
 return value
}

/** Original Realm art: expressive heads, compact bodies, shaped garments.
 * One source for portraits/Halls/Phaser. Canvas/pivot: 48×64/(24,64).
 * The support sole ends at y63, preserving existing world/furniture alignment.
 */
function resident(a: Appearance, direction: Direction, frame: number, pose: Pose, blink = false, inhale = false): Pixel[] {
 const pixels: Pixel[] = []
 const side = direction === 'left' || direction === 'right', rear = direction === 'up', left = direction === 'left'
 const seated = pose === 'sit', resting = pose === 'rest', phase = frame === 1 ? 1 : frame === 2 ? -1 : 0
 const skin = a.skin, skinShade = mix(skin, '#683e38', .3), skinLight = mix(skin, '#ffebc5', .17)
 const hair = a.hair, hairShade = mix(hair, '#1b1c2b', .38), hairLight = mix(hair, '#f0d8aa', .25)
 const cloth = outfits[a.outfit], clothShade = mix(cloth, '#202331', .32), clothLight = mix(cloth, '#f1dec0', .24)
 const pants = a.outfit === 'everyday' ? '#44495c' : a.outfit === 'medieval' ? '#514337' : '#314452'
 const boot = a.outfit === 'everyday' ? LINEN : a.outfit === 'medieval' ? '#855b3e' : '#516879'
 const bodyY = inhale ? -1 : 0
 const r = (x: number, y: number, w: number, h: number, color: string) => {
  if (left) x = CHARACTER_WIDTH - x - w
  pixels.push({ x, y, w, h, color })
 }
 const shape = (points: readonly Point[], color: string, dx = 0, dy = 0, outlined = true) => {
  const art = contour(points)
  for (const p of art.edge) r(p.x + dx, p.y + dy, p.w, p.h, outlined ? INK : color)
  if (outlined) for (const p of art.fill) r(p.x + dx, p.y + dy, p.w, p.h, color)
 }
 const patch = (points: readonly Point[], color: string, dx = 0, dy = 0) => shape(points, color, dx, dy, false)

 // Scout mantle: flared hem, two broad folds and a burgundy lining.
 if (a.outfit === 'medieval') {
  if (side) {
   shape([[17,34],[25,35],[26,43],[23,51],[20,57],[7,57],[11,51],[13,41]], '#486252')
   patch([[16,38],[19,38],[17,48],[12,55],[10,55],[14,46]], '#718774')
   patch([[21,40],[24,39],[23,49],[20,55],[16,55]], '#30493f');r(9,55,11,1,'#884952')
  } else {
   shape([[16,34],[31,34],[35,39],[37,48],[43,57],[32,58],[24,56],[15,58],[5,57],[10,48],[12,39]], '#486252')
   patch([[14,38],[18,37],[15,49],[11,55],[8,55],[12,47]], '#718774')
   patch([[29,37],[33,39],[35,50],[39,55],[34,55],[30,47]], '#30493f')
   patch([[8,55],[15,56],[24,54],[32,56],[40,55],[40,56],[32,57],[24,55],[15,57],[8,56]], '#884952')
   if (rear) { patch([[22,37],[26,37],[29,54],[25,53]], '#30493f'); r(18,38,2,10,'#80917b') }
  }
 }
 const leg = (x: number, far: boolean, swing: number) => {
  const dx = side ? swing * 3 : swing, lift = swing > 0 ? 2 : 0, y = seated ? 51 : 49
  shape([[0,y],[8,y],[8,58-lift],[7,61-lift],[0,61-lift]], far ? mix(pants, INK, .16) : pants, x + dx)
  r(x+dx+1,y+1,2,6-lift,mix(pants,LINEN,.19))
  const by = (seated ? 57 : 58) - lift
  shape([[0,0],[7,0],[7,2],[9,3],[9,5],[-1,5],[-1,2]], boot, x+dx, by)
  r(x+dx,by+3,8,1,a.outfit==='everyday'?'#c2bba5':'#4d3b35')
  r(x+dx+1,by+1,4,1,a.outfit==='medieval'?'#bd8a54':a.outfit==='tech'?CYAN:'#fff0d3')
  if(a.outfit==='medieval'){r(x+dx,by-2,7,2,'#855b3e');r(x+dx+4,by-1,2,1,GOLD)}
 }
 if (resting) {
  for (const x of [17,25]) {shape([[0,0],[6,0],[7,9],[6,13],[0,13],[-1,10]],pants,x,49);r(x,59,6,3,boot);r(x+1,59,3,1,mix(boot,LINEN,.28))}
 } else {
  if(side){leg(19,true,-phase);leg(25,false,phase)}else {leg(14,false,phase);leg(26,true,-phase)}
  if(seated){
   shape(side?[[18,48],[28,47],[36,51],[36,56],[28,57],[19,54]]:[[13,48],[33,48],[35,52],[32,56],[26,55],[23,53],[19,56],[12,54]],pants)
   r(side?25:14,50,side?9:7,2,mix(pants,LINEN,.2));if(!side)r(27,50,6,2,mix(pants,LINEN,.2))
  }
 }
 // Tapered shoulder/waist contour beneath the head.
 r(20,32,9,7,INK);r(21,33,7,5,skinShade);r(21,33,4,3,skin)
 shape(side?[[19,35],[28,35],[33,40],[32,46],[31,52],[17,52],[16,42]]:[[16,35],[31,35],[35,40],[32,46],[32,52],[15,52],[13,41]],cloth,0,bodyY)
 patch(side?[[19,37],[23,36],[22,47],[19,49],[18,43]]:[[17,37],[21,36],[20,48],[17,49],[15,41]],clothLight,0,bodyY)
 patch(side?[[28,37],[31,41],[30,50],[26,50]]:[[29,37],[33,41],[30,49],[26,50]],clothShade,0,bodyY)
 const arm = (x: number, far: boolean, swing: number) => {
  const dx = side ? swing * 2 : swing, handY = resting ? 44 : seated ? 47 : 50 + (swing < 0 ? -1 : 0)
  shape([[0,0],[5,-1],[8,3],[7,7],[6,handY-37],[0,handY-37],[-1,7],[-2,4]],far?clothShade:cloth,x+dx,37+bodyY)
  r(x+dx,39+bodyY,2,5,far?cloth:clothLight)
  r(x+dx,handY-2,6,2,a.outfit==='everyday'?LINEN:a.outfit==='medieval'?'#855b3e':STEEL)
  shape([[0,0],[5,0],[6,2],[5,5],[1,5],[-1,3]],skin,x+dx,handY)
  r(x+dx+1,handY+1,2,2,skinLight);r(x+dx+4,handY+2,1,2,skinShade)
  if(a.outfit!=='everyday'){
   shape([[-2,0],[4,-1],[8,2],[7,5],[0,5],[-3,3]],a.outfit==='medieval'?GOLD:STEEL,x+dx,37+bodyY)
   r(x+dx-1,38+bodyY,4,1,a.outfit==='medieval'?GOLD_LIGHT:'#bdcbd0')
  }
 }
 if(side)arm(27,true,phase);else {arm(9,false,-phase);arm(32,true,phase)}
 if(a.outfit==='everyday'){
  // Open chore jacket, folded lapels, linen shirt and deep hem pockets.
  if(rear){shape([[17,36],[30,36],[29,40],[18,40]],clothShade,0,bodyY);r(18,44,11,1,clothLight)}
  else if(side){patch([[27,37],[30,40],[29,48],[27,49]],LINEN,0,bodyY);r(26,45,4,3,clothShade)}
  else{
   patch([[21,36],[26,36],[28,49],[20,49]],LINEN,0,bodyY)
   patch([[17,36],[21,37],[23,42],[20,41]],clothLight,0,bodyY);patch([[28,36],[31,38],[27,42],[25,41]],clothShade,0,bodyY)
   r(22,42+bodyY,4,2,'#af7261');r(16,46+bodyY,4,3,clothShade);r(29,46+bodyY,3,3,clothShade);r(16,46+bodyY,4,1,clothLight)
  }
  r(16,50,15,2,clothShade)
 }else if(a.outfit==='medieval'){
  // Brass gorget, leather jerkin, diagonal baldric and substantial belt.
  if(!rear){
   shape(side?[[22,35],[29,36],[30,39],[25,40],[21,38]]:[[17,35],[30,35],[29,38],[25,40],[21,40],[17,38]],GOLD,0,bodyY)
   if(!side){r(22,36+bodyY,4,2,GOLD_LIGHT);r(23,38+bodyY,2,2,'#944f58')}
   patch(side?[[27,40],[30,40],[24,48],[21,48]]:[[17,39],[20,39],[29,47],[26,49]],'#a0764b',0,bodyY)
   r(side?18:16,49,side?13:16,3,'#583e32');r(side?27:23,49,4,3,GOLD);r(side?28:24,50,2,1,INK)
  }else{shape([[16,35],[31,35],[29,39],[18,39]],'#314a40',0,bodyY);r(21,40,2,10,'#718774');r(26,42,2,9,'#314a40')}
 }else{
  // Cropped utility shell with chamfered panels and restrained cyan hardware.
  shape(side?[[19,36],[28,36],[31,40],[28,42],[19,39]]:[[16,36],[31,36],[32,39],[27,42],[20,42],[15,39]],'#2c3e4d',0,bodyY)
  if(rear){shape([[18,40],[29,40],[31,43],[29,49],[18,49],[16,44]],STEEL,0,bodyY);r(20,42+bodyY,8,2,'#435d71');r(22,46+bodyY,4,1,CYAN)}
  else if(side){r(27,41+bodyY,3,7,clothShade);r(28,42+bodyY,1,3,CYAN)}
  else {patch([[17,41],[21,42],[20,48],[16,47]],STEEL,0,bodyY);r(23,40+bodyY,2,9,INK);r(18,42+bodyY,2,2,CYAN);r(28,46+bodyY,3,1,CYAN)}
  r(17,50,14,2,'#263845');r(side?27:23,50,3,2,STEEL)
 }
 if(side)arm(19,false,-phase)
 // Long locks sit behind the face, with a scalloped shoulder silhouette.
 if(a.hairStyle==='long'){
  shape(side?[[12,17],[23,15],[24,29],[22,38],[17,44],[11,42],[13,35],[11,28]]:[[12,18],[35,18],[37,32],[35,42],[30,44],[28,39],[19,39],[16,44],[10,42],[12,33]],hairShade)
  patch(side?[[14,21],[17,21],[17,35],[14,40],[13,39]]:[[13,23],[16,23],[16,37],[13,41],[12,39]],hair);if(!side)r(32,27,2,11,hair)
 }
 // Broad cheeks, stepped chin, small ears and a readable brow/eye separation.
 if(side){
  shape([[17,13],[29,13],[34,17],[34,23],[38,25],[37,28],[34,29],[33,33],[28,36],[20,35],[15,30],[13,22]],skin)
  patch([[32,19],[33,23],[36,26],[33,28],[32,32],[27,34],[21,33],[27,35],[32,34],[34,31],[35,28],[37,27],[37,26],[33,24]],skinShade)
  r(28,19,3,2,skinLight);r(29,23,4,1,hairShade)
  if(blink||resting)r(30,26,3,1,INK);else {r(30,25,3,4,INK);r(30,25,2,3,eyeColors[a.eyes]);r(30,25,1,1,LINEN)}
  r(33,29,2,1,skinShade);r(30,32,3,1,mix(skin,INK,.48))
 }else{
  shape([[17,12],[30,12],[35,16],[36,24],[35,31],[31,35],[27,37],[20,37],[15,34],[12,29],[11,21],[13,16]],skin)
  if(!rear){
   patch([[32,18],[34,20],[34,28],[32,32],[28,35],[20,35],[17,33],[21,36],[27,36],[32,34],[35,30],[35,22]],skinShade)
   shape([[11,23],[14,23],[15,27],[13,30],[10,28],[9,25]],skin);shape([[34,23],[37,23],[39,25],[38,28],[35,30],[33,27]],skinShade)
   r(11,25,2,2,skinLight);r(16,20,3,2,skinLight);r(21,19,7,2,skinLight);r(16,23,5,1,hairShade);r(28,23,5,1,hairShade)
   for(const x of [17,29]){if(blink||resting)r(x,27,3,1,INK);else {r(x,25,3,4,INK);r(x,25,2,3,eyeColors[a.eyes]);r(x,25,1,1,LINEN)}}
   r(24,28,1,2,skinShade);r(15,30,3,1,skinShade);r(31,30,2,1,skinShade);r(23,33,4,1,mix(skin,INK,.48));r(24,34,2,1,skinLight)
  }
 }
 // Continuous hairstyle contours, broad light clusters and carved shadow locks.
 if(a.hairStyle==='curly'){
  shape([[16,7],[21,7],[23,8],[28,7],[32,9],[33,12],[37,13],[38,18],[36,21],[37,25],[34,29],[31,27],[31,21],[27,22],[24,20],[20,22],[17,20],[15,24],[15,30],[11,29],[9,25],[10,21],[8,18],[10,13],[14,12]],hair)
  patch([[14,13],[15,10],[20,9],[22,11],[20,14],[17,14],[16,17],[12,18],[11,16]],hairLight)
  patch([[25,10],[29,9],[32,12],[30,14],[26,14]],hairLight);patch([[33,15],[36,16],[35,20],[32,21],[33,25],[31,26],[29,22],[30,18]],hairShade)
  r(20,16,4,2,hairShade);r(12,23,2,3,hairShade)
  if(rear){shape([[13,18],[34,18],[35,26],[32,33],[27,35],[23,33],[19,35],[14,32],[11,26]],hair);patch([[14,20],[18,21],[17,27],[20,30],[16,31],[13,27]],hairLight);patch([[28,21],[33,20],[32,28],[28,32],[23,31],[25,27]],hairShade)}
  else if(side){shape([[12,19],[21,19],[21,26],[18,31],[14,31],[12,27]],hairShade);r(15,22,3,4,hair)}
 }else{
  const swept=a.hairStyle==='swept',long=a.hairStyle==='long'
  shape(swept?[[16,8],[28,7],[33,10],[34,14],[37,17],[35,21],[31,22],[27,20],[21,23],[14,24],[10,21],[8,17],[12,16],[12,11]]:long?[[17,8],[29,8],[34,12],[36,17],[35,24],[32,23],[29,19],[24,17],[21,19],[17,22],[13,25],[10,21],[11,15],[13,11]]:[[16,8],[23,7],[26,9],[31,9],[34,12],[34,16],[37,19],[34,23],[30,22],[27,19],[24,22],[20,20],[17,22],[13,23],[10,20],[11,14],[13,12]],hair)
  patch(swept?[[14,12],[19,10],[28,9],[30,11],[23,12],[18,16],[12,19],[11,17],[14,15]]:[[14,14],[17,10],[23,9],[28,11],[22,12],[20,15],[15,17],[12,18]],hairLight)
  patch(swept?[[29,14],[33,14],[35,18],[33,20],[28,19],[23,21],[20,21],[25,18]]:[[30,14],[33,15],[34,19],[32,21],[29,19],[26,18],[27,16]],hairShade)
  if(rear){
   shape(long?[[12,17],[35,17],[36,30],[34,41],[30,43],[27,40],[23,42],[19,40],[15,43],[11,40]]:[[12,17],[35,17],[35,27],[32,32],[28,34],[25,32],[21,34],[16,32],[12,28]],hair)
   patch(long?[[14,20],[18,19],[18,32],[15,39],[13,40],[14,32]]:[[14,20],[18,19],[18,27],[21,30],[17,30],[14,27]],hairLight)
   patch(long?[[30,19],[33,20],[33,34],[30,40],[26,38],[28,30]]:[[30,20],[33,21],[32,28],[28,32],[24,30],[28,27]],hairShade)
   if(swept)patch([[17,19],[22,19],[26,23],[24,25],[20,22]],hairShade)
  }else if(side){
   shape(long?[[12,18],[21,18],[21,31],[19,40],[15,43],[11,40]]:[[12,18],[21,18],[22,24],[20,28],[17,32],[13,30],[11,26]],hairShade)
   patch(long?[[14,21],[17,20],[17,35],[14,39],[13,39]]:[[14,20],[17,20],[17,27],[14,29],[13,25]],hair)
   if(swept)patch([[26,16],[33,15],[35,18],[32,21],[27,23],[28,20]],hair)
  }else{shape([[11,19],[15,18],[16,23],[15,long?36:28],[12,long?40:31],[10,long?37:27]],hair);shape([[33,19],[36,20],[37,long?36:27],[34,long?40:31],[32,long?35:27]],hairShade)}
 }
 if(side){shape([[21,25],[24,24],[27,26],[26,30],[23,31],[21,29]],skin);r(23,26,2,2,skinShade)}
 if(a.accessory==='glasses'){
  if(rear){r(10,25,3,1,INK);r(35,25,3,1,INK)}
  else{for(const x of side?[28]:[15,27]){r(x,24,8,1,INK);r(x,29,8,1,INK);r(x,25,1,4,INK);r(x+7,25,1,4,INK);r(x+1,25,2,1,'#b9dada')}r(side?24:23,25,4,1,GOLD);if(!side){r(12,25,3,1,INK);r(35,25,2,1,INK)}}
 }else if(a.accessory==='headphones'){
  if(side){shape([[20,6],[24,6],[26,12],[25,25],[21,25],[22,12]],STEEL);shape([[19,23],[25,22],[28,25],[28,30],[25,33],[19,31]],'#455766');r(21,25,3,5,STEEL);r(22,26,1,3,CYAN)}
  else{shape([[12,17],[12,11],[16,6],[31,6],[36,11],[36,20],[33,20],[33,12],[30,9],[17,9],[15,12],[15,17]],STEEL);for(const x of [8,35]){shape([[0,0],[4,-1],[6,2],[6,9],[4,11],[0,10]],'#455766',x,22);r(x+1,24,2,6,STEEL);r(x+2,25,1,3,CYAN)}}
 }else if(a.accessory==='crown'){
  shape([[12,5],[16,8],[22,7],[24,2],[27,7],[32,8],[36,5],[34,16],[14,16]],GOLD);r(15,12,18,2,GOLD_LIGHT);r(15,15,18,1,'#8a633c')
  if(!rear){r(side?29:23,11,3,3,'#944f58');r(side?30:24,11,1,1,'#e3a08b')}
 }
 return pixels
}

export function characterPixels(a: Appearance, direction: Direction = 'down', frame = 0): Pixel[] { return resident(a, direction, frame, 'stand') }
export function seatedCharacterPixels(a: Appearance, direction: Direction = 'down'): Pixel[] { return resident(a, direction, 0, 'sit') }
export function restingCharacterPixels(a: Appearance, direction: Direction = 'down'): Pixel[] { return resident(a, direction, 0, 'rest', true) }
/** Four-second phrase: 250ms blink and one-pixel chest inhale; fixed skull/soles. */
export function idleCharacterPixels(a: Appearance, direction: Direction = 'down', tick = 1, pose: Pose = 'stand'): Pixel[] {
 const step = Math.max(0, Math.floor(tick)) % 16
 return resident(a, direction, 0, pose, step === 0, step >= 3 && step <= 7 && pose !== 'rest')
}
/** Legacy room-life overlay using the same closed-eye clusters. */
export function characterEyeBlinkPixels(a: Appearance, direction: Direction, tick: number): Pixel[] {
 if(direction==='up'||Math.max(0,Math.floor(tick))%16!==0)return []
 const eyes=direction==='down'?[17,29]:[direction==='left'?15:30], pixels: Pixel[]=[]
 for(const x of eyes)pixels.push({x,y:25,w:3,h:4,color:a.skin},{x,y:direction==='down'?27:26,w:3,h:1,color:INK})
 if(a.accessory==='glasses')for(const x of direction==='down'?[16,28]:[direction==='left'?17:29])pixels.push({x,y:25,w:2,h:1,color:'#b9dada'})
 return pixels
}

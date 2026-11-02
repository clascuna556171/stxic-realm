import { eyeColors, outfits, type Appearance } from './appearance.ts'
import type { Direction } from './world/room.ts'

export type Pixel = { x: number; y: number; w: number; h: number; color: string }
export const CHARACTER_WIDTH = 48
export const CHARACTER_HEIGHT = 64

/** Derived material ramps never change the owner's saved palette. */
function mix(a: string, b: string, ratio: number): string {
 const channel = (at: number) => Math.round(parseInt(a.slice(at, at + 2), 16) * (1 - ratio) + parseInt(b.slice(at, at + 2), 16) * ratio).toString(16).padStart(2, '0')
 return `#${channel(1)}${channel(3)}${channel(5)}`
}

type Pose = 'stand' | 'sit' | 'rest'
/**
 * Original, layered 48×64 residents. Body parts are authored together, never
 * animated by moving arbitrary rectangles. The bottom-center pivot stays (24,64).
 * Face: y17–31; shoulders: y34; hips: y49; soles: y63. Lighting is upper-left.
 */
function resident(a: Appearance, direction: Direction, frame: number, pose: Pose, blink = false, inhale = false): Pixel[] {
 const pixels: Pixel[] = []
 const side = direction === 'left' || direction === 'right', rear = direction === 'up'
 // Left profiles use the same anatomy, but retain world-space upper-left lighting.
 const left = direction === 'left'
 const r = (x: number, y: number, w: number, h: number, color: string) => {
  if (left) x = 48 - x - w
  const x0 = Math.max(0, x), y0 = Math.max(0, y), x1 = Math.min(48, x + w), y1 = Math.min(64, y + h)
  if (x1 > x0 && y1 > y0) pixels.push({ x: x0, y: y0, w: x1 - x0, h: y1 - y0, color })
 }
 const ink = '#202029', seam = '#34333b', skin = a.skin, skinShade = mix(skin, '#502d28', .28), skinLight = mix(skin, '#ffead0', .18)
 const hair = a.hair, hairDark = mix(hair, '#151722', .4), hairLight = mix(hair, '#ecd5b5', .24)
 const cloth = outfits[a.outfit], clothShade = mix(cloth, '#1b2330', .34), clothLight = mix(cloth, '#ece5d5', .23)
 const pants = a.outfit === 'everyday' ? '#414858' : a.outfit === 'medieval' ? '#51443a' : '#303f4e'
 const pantsLight = mix(pants, '#b4b5b4', .2), leather = '#745038', leatherLight = '#a37850'
 const gold = '#c7a35f', goldLight = '#f2d99a', metal = '#738795', cyan = '#8bd7d5', linen = '#e8deca'
 const phase = frame === 1 ? 1 : frame === 2 ? -1 : 0
 const seated = pose === 'sit', resting = pose === 'rest'
 const shoulderY = 34 - (inhale ? 1 : 0)

 // Cloak sits behind the limbs. Its folded hem never replaces either leg.
 if (a.outfit === 'medieval') {
  if (side) {
   r(13,35,10,20,ink);r(14,36,8,18,'#3b5046');r(left?19:15,37,2,15,'#627669');r(14,52,7,2,'#713f46')
  } else {
   r(11,35,26,19,ink);r(10,42,28,12,ink);r(12,36,24,17,'#3b5046');r(11,43,26,10,'#35463d')
   r(13,37,3,15,'#627669');r(33,39,2,14,'#293c35');r(12,52,24,2,'#713f46')
  }
 }
 const leg = (x: number, far: boolean, step: number) => {
  // A support sole stays on y63; only the swing leg lifts. Thigh and shoe move as a unit.
  const lift = step > 0 ? 2 : 0, dx = side ? step * 3 : step
  const lx = x + dx, y = seated ? 49 : 48
  r(lx,y,7,14-lift,ink);r(lx+1,y,5,12-lift,far?mix(pants,ink,.15):pants)
  r(lx+(left?4:1),y+2,2,7-lift,pantsLight)
  const bootY = (seated ? 56 : 58) - lift
  const boot = a.outfit==='everyday'?linen:a.outfit==='medieval'?leather:'#283744'
  r(lx-1,bootY,9,5,ink);r(lx,bootY,7,4,boot)
  r(lx,bootY+3,8,1,a.outfit==='everyday'?'#a7a294':'#202630')
  r(lx+(left?4:1),bootY+1,3,1,a.outfit==='medieval'?leatherLight:a.outfit==='tech'?metal:'#fff2da')
  if(a.outfit==='medieval'){r(lx,bootY-3,6,3,leather);r(lx+3,bootY-2,2,1,gold)}
  if(a.outfit==='tech'){r(lx+1,bootY-3,4,3,metal);r(lx+2,bootY+1,3,1,cyan)}
 }
 if(!resting){
  if(side){leg(18,true,-phase);leg(24,false,phase)}
  else {leg(15,false,phase);leg(26,true,-phase)}
  if(seated){
   if(side){r(20,48,15,7,ink);r(21,49,13,5,pants);r(23,49,10,1,pantsLight)}
   else {r(14,48,20,6,ink);r(15,49,18,4,pants);r(16,49,6,1,pantsLight);r(27,49,5,1,pantsLight)}
  }
 }

 // Neck and tailored torso. Wider shoulders taper to the waist rather than a box.
 r(side?21:21,29,6,8,ink);r(22,30,4,6,skinShade);r(22,30,2,4,skin)
 const tx=side?17:15,tw=side?15:18
 r(tx,shoulderY,tw,17+(inhale?1:0),ink);r(tx+1,shoulderY+1,tw-2,15,clothShade)
 r(tx+2,shoulderY+1,tw-5,14,cloth);r(left?tx+tw-4:tx+2,shoulderY+2,2,11,clothLight)
 const arm=(x:number,far:boolean,swing:number)=>{
  // Continuous shoulder, elbow, cuff and hand; counter-swings the corresponding leg.
  const y=shoulderY+2,dx=side?swing*2:0,handY=resting?42:seated?44:48+(swing<0?-1:0)
  r(x,y,6,7,ink);r(x+dx,y+5,6,handY-y-2,ink)
  r(x+1,y+1,4,6,far?clothShade:cloth);r(x+dx+1,y+6,4,handY-y-3,far?clothShade:cloth)
  r(x+dx+(left?4:1),y+1,1,6,clothLight)
  r(x+dx,handY-2,6,3,ink);r(x+dx+1,handY-2,4,2,a.outfit==='everyday'?linen:a.outfit==='medieval'?leather:metal)
  r(x+dx+1,handY,4,4,ink);r(x+dx+1,handY,3,3,skinShade);r(x+dx+1,handY,2,2,skin);r(x+dx+1,handY,1,1,skinLight)
  if(a.outfit==='medieval'||a.outfit==='tech'){
   r(x-1,y-1,8,5,ink);r(x,y-1,6,4,a.outfit==='medieval'?gold:metal);r(x+1,y-1,3,1,a.outfit==='medieval'?goldLight:'#c3ced0')
  }
 }
 if(!side){arm(10,false,-phase);arm(32,true,phase)}
 if(a.outfit==='everyday'){
  if(rear){r(19,34,10,4,ink);r(20,34,8,3,clothShade);r(19,40,10,1,clothLight);r(18,46,12,1,clothShade)}
  else if(side){r(29,36,2,12,linen);r(28,35,2,5,clothLight);r(28,43,3,3,clothShade)}
  else {
   r(21,35,6,13,linen);r(22,36,4,2,'#c6baa6');r(22,41,4,2,'#ad7160')
   r(19,35,2,13,clothLight);r(27,35,2,13,clothShade);r(20,37,1,5,linen);r(27,37,1,5,linen)
   r(16,44,4,3,clothShade);r(29,44,3,3,clothShade);r(16,44,4,1,clothLight)
  }
  r(tx+1,49,tw-2,2,clothShade)
 }else if(a.outfit==='medieval'){
  if(rear){r(16,35,16,16,'#3b5046');r(17,36,3,14,'#627669');r(23,36,2,15,'#2d4037');r(29,37,2,13,'#293c35')}
  else {
   r(side?28:19,35,side?3:10,2,gold);r(side?28:23,36,2,2,'#8c4d4d')
   for(let n=0;n<4;n++)r((side?27:17)+n,38+n*2,3,3,leather)
   r(tx+1,47,tw-2,3,leather);r(side?28:23,47,3,3,gold);r(side?29:24,48,1,1,ink)
   if(!side){r(16,38,1,8,clothLight);r(30,38,1,7,clothShade)}
  }
 }else{
  r(tx+1,35,tw-2,3,'#293c49')
  if(rear){r(19,38,10,10,ink);r(20,39,8,8,'#536a7a');r(21,40,6,1,'#8d9fa7');r(22,43,4,1,cyan);r(21,46,6,1,'#2b3c49')}
  else if(side){r(28,38,3,9,'#283b48');r(29,39,1,4,cyan);r(28,46,3,2,metal)}
  else {r(18,38,4,9,clothLight);r(26,38,4,9,clothShade);r(22,38,4,10,'#253540');r(23,39,1,5,metal);r(19,39,2,3,cyan);r(27,44,2,1,cyan)}
  r(tx+1,48,tw-2,3,'#25323d');r(side?28:23,48,3,2,metal)
 }
 if(side)arm(20,false,-phase)
 // Long hair is behind the head, but falls over the shoulder/back clothing.
 if(a.hairStyle==='long'){
  if(side){r(12,15,10,28,ink);r(13,16,8,26,hairDark);r(left?18:14,18,2,22,hair);r(14,41,4,3,hairDark)}
  else {for(const x of [12,32]){r(x,15,4,26,ink);r(x+1,16,2,24,hairDark)}r(14,18,2,21,hair);r(32,19,2,20,hair);r(13,39,3,3,hairDark);r(32,39,3,3,hairDark)}
 }
 // Head volume and face are shared across every pose and walk frame.
 if(side){
  r(16,10,15,20,ink);r(14,14,19,13,ink);r(18,12,12,18,skinShade);r(21,14,11,14,skin)
  r(30,22,5,4,ink);r(30,22,4,3,skin);r(30,27,2,3,skinShade);r(left?28:22,17,2,4,skinLight)
  r(28,21,3,1,hairDark)
  if(blink||resting)r(29,24,3,1,ink)
  else {r(29,23,3,3,ink);r(29,23,2,2,eyeColors[a.eyes]);r(29,23,1,1,linen)}
  r(29,28,2,1,seam)
 }else{
  r(16,10,16,21,ink);r(14,14,20,14,ink);r(15,12,18,17,ink)
  if(!rear){
   r(16,14,16,14,skinShade);r(16,13,14,14,skin);r(18,27,12,3,skin);r(20,30,8,1,skinShade)
   r(13,21,3,5,ink);r(14,22,2,3,skin);r(32,21,3,5,ink);r(32,22,2,3,skinShade)
   r(17,18,2,4,skinLight);r(21,17,6,2,skinLight)
   r(17,21,4,1,hairDark);r(27,21,4,1,hairDark)
   for(const ex of [18,28]){
    if(blink||resting)r(ex,24,3,1,ink)
    else {r(ex,23,3,3,ink);r(ex,23,2,2,eyeColors[a.eyes]);r(ex,23,1,1,linen)}
   }
   r(24,25,1,2,skinShade);r(23,28,4,1,mix(skin,ink,.48));r(24,29,2,1,skinShade)
  }
 }
 // Each hairstyle has its own stepped perimeter, part and nape in all views.
 const hx=side?13:13,hw=side?19:22
 if(a.hairStyle==='curly'){
  const curls=side?[[15,7],[23,8],[11,12],[27,13],[12,20],[13,26]]: [[17,7],[24,7],[12,11],[29,11],[11,18],[30,18],[13,25],[28,25]]
  r(15,10,18,9,hairDark)
  for(const [x,y] of curls){r(x,y,7,7,ink);r(x+1,y+1,5,5,hair);r(x+2,y+1,3,1,hairLight);r(x+4,y+4,2,2,hairDark)}
  if(rear){r(15,17,18,13,hair);r(16,18,4,3,hairLight);r(21,24,3,4,hairDark);r(29,21,3,6,hairDark)}
 }else{
  const swept=a.hairStyle==='swept',long=a.hairStyle==='long'
  r(hx+3,8,hw-6,3,ink);r(hx+1,10,hw-2,5,ink);r(hx,13,hw,5,ink)
  r(hx+3,9,hw-6,3,hair);r(hx+1,11,hw-2,6,hair);r(left?hx+hw-9:hx+3,11,6,2,hairLight)
  if(rear){
   r(14,16,20,long?24:13,ink);r(15,16,18,long?23:12,hair);r(16,18,3,long?18:7,hairLight);r(29,18,3,long?20:9,hairDark)
   r(21,21,2,long?18:7,hairDark);r(17,long?38:28,4,2,hairDark)
   if(swept){r(10,13,6,6,ink);r(11,14,5,4,hair);r(12,14,2,1,hairLight);r(26,18,5,2,hairDark)}
  }else if(side){
   r(13,16,8,long?24:13,ink);r(14,16,6,long?23:12,hairDark);r(left?18:15,17,2,long?21:8,hair)
   if(swept){r(26,12,8,6,ink);r(26,13,7,4,hair);r(29,17,4,3,hair);r(27,13,3,1,hairLight)}
   else if(long){r(26,14,6,3,hair);r(29,17,3,3,hairDark)}
   else {r(27,14,5,4,hair);r(29,18,2,2,hairDark);r(18,7,4,3,hair)}
  }else{
   r(13,16,3,long?20:7,ink);r(14,16,2,long?19:6,hair);r(32,16,3,long?20:7,ink);r(32,16,2,long?19:6,hairDark)
   if(swept){r(11,14,15,4,hair);r(12,18,10,2,hair);r(14,20,4,1,hairDark);r(24,14,7,3,hairDark);r(12,13,9,1,hairLight)}
   else if(long){r(15,15,7,3,hair);r(16,18,3,2,hair);r(26,15,7,3,hair);r(30,18,3,2,hairDark);r(23,12,2,4,hairDark)}
   else {r(15,16,5,3,hair);r(22,16,4,4,hair);r(28,16,5,3,hairDark);r(18,7,5,3,hair);r(29,9,4,3,hair)}
  }
 }
 // Ear sits in front of the profile hair. Headgear follows this same skull envelope.
 if(side){r(20,22,4,6,ink);r(21,23,3,4,skinShade);r(21,23,2,2,skin)}
 if(a.accessory==='glasses'){
  if(rear){r(13,22,2,1,ink);r(33,22,2,1,ink)}
  else if(side){r(26,22,8,1,ink);r(26,26,8,1,ink);r(26,22,1,5,ink);r(33,22,1,5,ink);r(22,23,4,1,ink);r(27,23,2,1,'#b8d9dd')}
  else {for(const x of [16,26]){r(x,22,7,1,ink);r(x,26,7,1,ink);r(x,22,1,5,ink);r(x+6,22,1,5,ink);r(x+1,23,1,1,'#b8d9dd')}r(23,23,3,1,gold);r(14,23,2,1,ink);r(33,23,2,1,ink)}
 }else if(a.accessory==='headphones'){
  if(side){r(20,7,4,15,ink);r(21,8,2,12,metal);r(18,21,8,9,ink);r(19,22,6,7,'#445462');r(20,23,3,5,metal);r(20,24,1,2,cyan)}
  else {r(15,7,18,3,ink);r(16,8,16,1,metal);for(const x of [11,34]){r(x,14,3,9,ink);r(x,21,4,8,ink);r(x+1,22,2,6,metal);r(x+1,23,1,3,cyan)}}
 }else if(a.accessory==='crown'){
  const x=side?15:15,w=side?17:18
  r(x-1,5,w+2,6,ink);r(x,7,w,3,gold);r(x,9,w,1,'#8c713f')
  for(const px of [x,x+7,x+w-3]){r(px,3,3,5,ink);r(px+1,4,1,4,goldLight)}
  r(x+1,7,w-2,1,goldLight);if(!rear)r(x+(side?13:8),8,2,1,'#984a50')
 }
 if(resting){
  // Supine on the existing north/south bed: retain the costume, close the eyes,
  // relax the elbows and bring the legs together beneath the foreground quilt.
  for(const x of [18,25]){r(x,50,6,12,ink);r(x+1,50,4,10,pants);r(x+1,51,1,8,pantsLight);r(x,60,6,3,a.outfit==='everyday'?linen:a.outfit==='medieval'?leather:metal)}
 }
 return pixels
}

export function characterPixels(a:Appearance,direction:Direction='down',frame=0):Pixel[]{return resident(a,direction,frame,'stand')}
export function seatedCharacterPixels(a:Appearance,direction:Direction='down'):Pixel[]{return resident(a,direction,0,'sit')}
export function restingCharacterPixels(a:Appearance,direction:Direction='down'):Pixel[]{return resident(a,direction,0,'rest',true)}
/** Four-second breathing phrase; one brief blink per phrase. Feet and head stay fixed. */
export function idleCharacterPixels(a:Appearance,direction:Direction='down',tick=1,pose:Pose='stand'):Pixel[]{
 const step=Math.max(0,Math.floor(tick))%16
 return resident(a,direction,0,pose,step===0,step>=3&&step<=7&&pose!=='rest')
}
/** Compatibility overlay, used by room-life consumers; rendered after the open eye. */
export function characterEyeBlinkPixels(a:Appearance,direction:Direction,tick:number):Pixel[]{
 if(direction==='up'||Math.max(0,Math.floor(tick))%16!==0)return []
 const eyes=direction==='down'?[18,28]:[direction==='left'?16:29]
 const p:Pixel[]=[]
 for(const x of eyes){p.push({x,y:23,w:3,h:3,color:a.skin},{x,y:24,w:3,h:1,color:'#202029'})}
 // Keep eyewear reflection and bridge intact.
 if(a.accessory==='glasses')for(const x of direction==='down'?[17,27]:[direction==='left'?19:27])p.push({x,y:23,w:1,h:1,color:'#b8d9dd'})
 return p
}

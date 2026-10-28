import { eyeColors, outfits, type Appearance } from './appearance.ts'

export type Pixel = { x: number; y: number; w: number; h: number; color: string }
export const CHARACTER_WIDTH = 48
export const CHARACTER_HEIGHT = 64

/** Mix two hex colors without changing the user's saved palette. */
function mix(a: string, b: string, ratio: number): string {
 const channel = (at: number) => Math.round(parseInt(a.slice(at,at+2),16)*(1-ratio)+parseInt(b.slice(at,at+2),16)*ratio).toString(16).padStart(2,'0')
 return `#${channel(1)}${channel(3)}${channel(5)}`
}

/** Original layered pixel artwork, shared by SVG previews and the room canvas. */
export function characterPixels(a: Appearance): Pixel[] {
 const p: Pixel[] = []
 const block = (x:number,y:number,w:number,h:number,color:string) => p.push({x,y,w,h,color})
 const ink='#211e24', edge='#332c30', skin=a.skin, skinShadow=mix(skin,'#57382e',0.32), skinLight=mix(skin,'#fff0d4',0.22)
 const hair=a.hair, hairShade=mix(hair,'#14121a',0.38), hairLight=mix(hair,'#d9b6a4',0.27)
 const clothing=outfits[a.outfit], clothShade=mix(clothing,'#1a2022',0.4), clothLight=mix(clothing,'#dfd7e4',0.28)
 const gold='#d9b978', paper='#efe5d0'
 // Hair and cloak behind the character.
 if(a.hairStyle==='long') {
  block(8,11,32,31,ink); block(6,17,36,20,ink); block(10,12,28,27,hairShade); block(8,20,4,15,hair); block(36,18,4,19,hair)
  block(9,26,2,9,hairLight); block(37,23,2,10,hairLight)
 }
 if(a.outfit==='medieval') {
  block(7,37,34,20,ink); block(5,45,38,12,ink); block(8,39,32,15,'#4d5141'); block(6,48,36,7,'#3d4538'); block(9,40,3,12,'#68705a'); block(36,40,3,12,'#68705a')
 }
 // Boots, trousers and small shadows.
 block(13,51,10,10,ink); block(25,51,10,10,ink); block(14,52,8,7,'#55514d'); block(26,52,8,7,'#55514d')
 block(11,58,12,4,ink); block(25,58,12,4,ink); block(12,58,10,2,'#aa9c88'); block(26,58,10,2,'#aa9c88'); block(13,60,9,1,paper); block(27,60,9,1,paper)
 // Shoulders, sleeves, jacket and hands.
 block(13,36,22,3,ink); block(9,39,30,14,ink); block(7,42,34,9,ink)
 block(11,39,26,12,clothing); block(8,43,4,7,clothShade); block(36,43,4,7,clothShade)
 block(8,49,4,4,skinShadow); block(36,49,4,4,skinShadow); block(9,49,3,2,skin); block(36,49,3,2,skin)
 block(13,40,2,9,clothLight); block(33,40,2,9,clothShade); block(13,51,22,2,clothShade)
 block(19,33,10,6,ink); block(20,34,8,5,skinShadow); block(21,34,6,3,skin)
 // Face outline, ears, cheeks and chin.
 block(10,13,28,17,ink); block(12,10,24,24,ink); block(14,9,20,26,ink)
 block(12,16,24,13,skinShadow); block(13,14,22,16,skin); block(15,13,18,18,skin); block(16,30,16,3,skin)
 block(9,20,4,7,ink); block(35,20,4,7,ink); block(10,21,3,5,skinShadow); block(35,21,3,5,skinShadow)
 block(14,18,3,8,skinLight); block(31,18,3,7,skinShadow); block(15,26,3,2,mix(skin,'#bc766e',0.18)); block(30,26,3,2,mix(skin,'#bc766e',0.18))
 // Eyes, eyebrows, nose and mouth; small glints improve expression.
 block(16,19,5,1,edge); block(27,19,5,1,edge); block(16,21,5,4,ink); block(27,21,5,4,ink)
 block(16,21,4,3,'#f4ece0'); block(27,21,4,3,'#f4ece0'); block(18,21,2,4,eyeColors[a.eyes]); block(29,21,2,4,eyeColors[a.eyes]); block(18,21,1,1,'#fff6e8'); block(29,21,1,1,'#fff6e8')
 block(23,25,2,2,skinShadow); block(22,29,4,1,edge); block(23,30,3,1,skinShadow)
 // Hair silhouettes and individual strands, each covering the forehead differently.
 if(a.hairStyle==='short') {
  block(11,8,26,7,ink); block(9,11,30,7,ink); block(12,7,7,3,ink); block(19,5,10,4,ink); block(29,8,7,3,ink)
  block(12,9,24,6,hair); block(10,12,28,4,hair); block(10,15,5,6,hair); block(34,15,4,6,hair)
  block(15,14,6,3,hair); block(22,13,6,3,hair); block(30,14,5,3,hair); block(14,9,7,1,hairLight); block(26,9,6,2,hairLight); block(11,16,2,3,hairShade)
 }
 if(a.hairStyle==='long') {
  block(11,8,26,7,ink); block(9,11,30,5,ink); block(12,9,24,6,hair); block(10,13,28,4,hair); block(10,16,4,10,hair); block(34,16,4,10,hair)
  block(15,14,7,3,hair); block(24,13,8,3,hair); block(13,10,8,1,hairLight); block(26,10,7,1,hairLight); block(11,19,2,5,hairShade)
 }
 if(a.hairStyle==='curly') {
  block(11,6,7,5,ink); block(17,4,8,5,ink); block(25,5,8,5,ink); block(32,7,6,6,ink); block(8,10,32,8,ink)
  block(11,8,7,5,hair); block(18,6,7,6,hair); block(25,7,7,6,hair); block(32,9,5,6,hair); block(10,13,28,4,hair)
  block(9,16,6,5,hair); block(16,15,5,3,hair); block(23,14,5,3,hair); block(32,15,6,5,hair)
  block(13,9,3,2,hairLight); block(20,7,3,2,hairLight); block(28,8,3,2,hairLight); block(34,11,2,2,hairLight)
 }
 if(a.hairStyle==='swept') {
  block(12,7,24,5,ink); block(9,10,30,7,ink); block(8,13,29,5,ink); block(12,8,23,5,hair); block(10,11,27,5,hair)
  block(10,15,16,4,hair); block(12,18,8,2,hair); block(33,15,5,6,hair); block(13,9,11,1,hairLight); block(20,12,11,1,hairLight); block(13,16,6,1,hairShade)
 }
 // Outfit-specific material and small details.
 if(a.outfit==='everyday') {
  block(15,39,18,2,clothShade); block(19,38,10,11,paper); block(18,39,3,12,clothing);block(27,39,3,12,clothing)
  block(17,39,3,4,clothLight);block(28,39,3,4,clothLight);block(15,44,5,5,clothShade);block(29,44,4,5,clothShade)
  block(16,44,4,1,clothLight);block(29,44,4,1,clothLight);block(22,43,4,1,'#b7aa9b');block(10,47,3,2,paper);block(35,47,3,2,paper)
  block(15,50,18,1,clothLight);block(14,51,20,2,clothShade);block(20,53,3,4,'#3d3d4e');block(25,53,3,4,'#3d3d4e')
 }
 if(a.outfit==='medieval') {
  block(14,39,4,11,'#806145'); block(30,39,4,11,'#806145'); block(18,39,12,2,'#c4ae7c'); block(22,40,4,4,gold)
  block(13,48,22,3,'#49362d'); block(21,48,6,3,gold); block(22,49,4,1,'#49362d'); block(16,43,2,3,'#b9996d'); block(30,43,2,3,'#b9996d')
  block(12,37,7,5,'#97735d');block(29,37,7,5,'#97735d');block(15,38,17,3,'#ba9472');block(16,39,14,1,'#dec29a');block(17,41,4,9,'#ad8665');block(18,43,1,6,'#d0aa7d')
 }
 if(a.outfit==='tech') {
  block(15,39,18,3,'#303b45'); block(20,40,8,2,'#b8d5d2'); block(14,44,3,4,'#87c4bd'); block(31,44,3,4,'#87c4bd')
  block(21,44,6,4,'#253039'); block(22,45,4,1,'#b4c8ed'); block(14,50,20,2,'#303b45')
  block(10,39,7,4,'#8093a9');block(31,39,7,4,'#8093a9');block(11,40,5,1,'#c4ccd6');block(32,40,5,1,'#c4ccd6');block(12,45,3,3,'#d4b28b');block(34,45,3,3,'#d4b28b');block(19,49,10,2,'#7c8ca3')
 }
 // Accessories are layered last to stay legible.
 if(a.accessory==='glasses') {
  block(14,20,8,1,ink); block(14,20,1,6,ink); block(21,20,1,6,ink); block(15,25,6,1,ink)
  block(26,20,8,1,ink); block(26,20,1,6,ink); block(33,20,1,6,ink); block(27,25,6,1,ink); block(22,21,4,1,ink); block(15,21,2,1,paper); block(27,21,2,1,paper)
 }
 if(a.accessory==='headphones') {
  block(10,8,4,3,ink); block(14,6,20,3,ink); block(34,8,4,3,ink); block(7,14,5,10,ink); block(36,14,5,10,ink)
  block(8,15,3,8,'#8d99bc'); block(37,15,3,8,'#8d99bc'); block(9,16,1,5,'#d4d8ea'); block(38,16,1,5,'#d4d8ea')
 }
 if(a.accessory==='crown') {
  block(14,3,20,5,ink); block(15,2,4,5,gold); block(22,1,4,6,gold); block(29,2,4,5,gold); block(15,6,18,2,gold); block(17,5,2,1,paper); block(29,5,2,1,paper)
 }
 return p
}

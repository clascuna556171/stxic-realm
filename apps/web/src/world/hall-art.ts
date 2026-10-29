import type { Pixel } from '../character'
import { furniturePixels } from './art.ts'
import { HALL, hallCatalog, type DoorStyle, type HallKind, type HallLayout } from './hall-layout.ts'
import { worldPalettes, type WorldMood } from './palette.ts'

function painter() {
 const pixels: Pixel[] = []
 const r = (x: number, y: number, w: number, h: number, color: string) => {
  if (w > 0 && h > 0) pixels.push({ x: Math.floor(x), y: Math.floor(y), w: Math.ceil(w), h: Math.ceil(h), color })
 }
 return { pixels, r }
}
const ink = '#19202b', brass = '#caa56a', brassLight = '#f4d398'

export function hallDoorPixels(style: DoorStyle, mood: WorldMood): Pixel[] {
 const { pixels, r } = painter(), c = worldPalettes[mood]
 // Hand-stepped arch with individual voussoirs and alternating stone faces.
 for (const [x, y, w, h] of [[32,0,32,8],[20,8,56,8],[12,16,72,8],[4,24,88,16],[0,40,96,120]]) r(x,y,w,h,ink)
 for (const [x, y, w, h] of [[33,2,30,7],[22,9,52,7],[14,17,68,7],[6,25,84,15],[2,40,92,118]]) r(x,y,w,h,c.stone[0])
 for (let y = 42; y < 152; y += 16) {
  r(3,y,10,14,c.stone[(y / 2) % 3]);r(83,y,10,14,c.stone[(y / 2 + 1) % 3])
  r(3,y,9,2,c.stone[2]);r(83,y,9,2,c.stone[2]);r(12,y,2,14,c.stone[0]);r(92,y,1,14,ink)
 }
 r(35,2,26,3,c.stone[2]);r(24,10,12,4,c.stone[2]);r(60,10,12,4,c.stone[2]);r(15,18,11,5,c.stone[1]);r(70,18,11,5,c.stone[1]);r(7,27,10,10,c.stone[2]);r(79,27,10,10,c.stone[1])
 r(32,16,32,8,ink);r(24,24,48,8,ink);r(16,32,64,12,ink);r(14,44,68,108,ink)
 if (style === 'oak') {
  for (let x = 16; x < 80; x += 8) {
   const top = x < 24 || x >= 72 ? 42 : x < 32 || x >= 64 ? 32 : 26
   r(x,top,7,152-top,c.timber[1]);r(x,top,1,152-top,c.timber[2]);r(x+5,top+5,1,145-top,c.timber[0])
   r(x+2,top+18,1,14,c.timber[2]);r(x+3,top+41,1,16,c.timber[0])
  }
  r(47,25,2,126,ink)
  for (const y of [60,121]) {r(17,y,29,5,ink);r(50,y,29,5,ink);for (const x of [20,40,53,73]) r(x,y+1,2,2,brass)}
  r(40,88,4,8,brass);r(52,88,4,8,brass);r(41,90,2,4,ink);r(53,90,2,4,ink)
  r(17,145,29,3,c.timber[0]);r(50,145,29,3,c.timber[0])
 } else {
  const sky = style === 'portal' ? c.sky : ['#172630','#263d45','#668b83']
  r(32,25,32,7,sky[0]);r(24,32,48,12,sky[0]);r(16,44,64,106,sky[0]);r(17,84,62,50,sky[1])
  // A distant Realm rather than a flat portal-colored rectangle.
  for (let i=0;i<8;i++) {const x=20+i*7,y=114-(i*11%30);r(x,y,6,134-y,'#20333e');r(x+2,y-5,2,5,'#20333e');r(x+2,y+5,1,2,brassLight)}
  r(62,47,8,8,'#dde8d9');r(60,45,5,6,sky[0])
  for (const [x,y] of [[32,49],[52,64],[24,71],[67,82],[42,41]]) r(x,y,1,1,'#d3e5dc')
  for (let y=136;y<152;y+=4) {r(17,y,62,3,c.stone[1]);r(17,y,62,1,c.stone[2])}
  if (style === 'portal') {r(16,44,2,106,'#7bc7cd');r(78,44,2,106,'#7bc7cd');r(25,32,2,12,'#7bc7cd');r(69,32,2,12,'#7bc7cd');r(33,25,30,2,'#a6e7e1')}
 }
 r(-4,153,104,5,c.stone[1]);r(-4,153,104,1,c.stone[2]);r(-8,159,112,4,c.stone[0]);r(-8,159,112,1,c.stone[1])
 return pixels
}

export function hallComponentPixels(kind: HallKind, mood: WorldMood): Pixel[] {
 if (kind !== 'hearth' && kind !== 'round-table') return furniturePixels(kind, mood)
 const { pixels, r } = painter(), c = worldPalettes[mood]
 if (kind === 'hearth') {
  r(5,0,86,91,ink);r(8,2,80,87,c.stone[0]);r(12,4,72,82,c.stone[1])
  for (let row=0;row<5;row++) for (let col=0;col<4;col++) {r(12+col*18,row*12+5,17,11,c.stone[(row+col)%3]);r(12+col*18,row*12+5,16,1,c.stone[2])}
  r(3,16,90,8,ink);r(1,16,94,4,c.timber[2]);r(4,20,88,3,c.timber[0])
  r(26,34,44,7,ink);r(20,41,56,42,ink);r(23,43,50,37,'#30252a')
  r(28,74,40,5,c.timber[1]);r(31,76,36,4,c.timber[0]);r(34,71,27,4,c.timber[2])
  r(29,59,10,15,'#b85636');r(38,49,10,25,'#e69a4f');r(46,56,13,19,'#f2b963');r(56,62,10,13,'#c86f38')
  r(35,62,5,11,'#ffd38b');r(42,56,5,17,'#ffe7b2');r(50,63,6,12,'#ffe7b2')
  r(0,85,96,7,c.stone[0]);r(0,85,96,2,c.stone[2]);r(5,92,86,4,ink)
  r(11,7,12,9,c.timber[0]);r(13,8,8,6,brass);r(75,6,4,10,brass);r(73,6,8,2,brassLight)
  r(40,-10,17,24,ink);r(42,-8,13,20,c.cloth[1]);r(44,-6,9,16,c.cloth[0]);r(47,-3,3,9,brass);r(44,0,9,2,brass)
 } else {
  // Oak gathering table with curved, stepped silhouette and two stools.
  r(25,32,8,24,ink);r(64,32,8,24,ink);r(27,34,4,20,c.timber[1]);r(66,34,4,20,c.timber[1])
  for(const [x,y,w,h] of [[18,4,60,5],[8,9,80,7],[2,16,92,13],[8,29,80,8],[18,37,60,4]]) r(x,y,w,h,ink)
  for(const [x,y,w,h] of [[19,6,58,4],[10,10,76,7],[4,17,88,11],[10,29,76,6],[20,35,56,4]])r(x,y,w,h,c.timber[1])
  for (const y of [12,20,28]) {r(12,y,72,1,c.timber[2]);r(22,y+3,28,1,c.timber[0]);r(64,y+2,9,1,c.timber[0])}
  r(31,13,35,13,ink);r(33,14,15,10,'#ebddbd');r(49,14,15,10,'#d7c6a7');r(48,14,1,11,brass)
  for (const y of [17,20,23]) {r(35,y,10,1,'#9c8b70');r(51,y,10,1,'#9c8b70')}
  for(const [x,y] of [[14,16],[69,22]]) {r(x,y,9,10,ink);r(x+1,y+1,6,8,'#d8e2d9');r(x+1,y,6,2,'#51382b');r(x+7,y+2,3,5,'#c6c8b9')}
  r(70,7,7,9,c.timber[0]);r(69,5,10,5,'#496c4a');r(72,2,6,5,'#84a777')
  for(const x of [8,72]) {r(x,44,17,16,ink);r(x+2,45,13,9,c.timber[2]);r(x+3,47,11,5,c.timber[1]);r(x+2,55,3,7,c.timber[0]);r(x+12,55,3,7,c.timber[0])}
 }
 return pixels
}

export function hallArchitecture(layout: HallLayout): Pixel[] {
 const { pixels, r } = painter(), c = worldPalettes[layout.theme]
 r(0,0,768,512,'#101820')
 // Cutaway masonry foundation, naturally irregular edges and a stone doorstep.
 r(14,30,740,452,ink);r(18,26,732,450,c.stone[0]);r(24,30,720,438,c.stone[1]);r(26,32,716,8,c.trim)
 for(let y=472;y<504;y+=12) for(let x=18;x<746;x+=28){r(x,y,27,11,c.stone[(x/2+y)%3]);r(x,y,26,1,c.stone[1])}
 // Floor materials have actual plank seams / tile joints, grain and nail heads.
 for(let row=0;row<20;row++) for(let col=-1;col<10;col++) {
  const y=202+row*14,x=28+col*84+(row%2)*42,left=Math.max(28,x),right=Math.min(740,x+84)
  if(y>=470||right<=left)continue
  r(left,y,right-left,13,c.floor[(row+col+12)%4]);r(left,y+13,right-left,1,c.seam)
  if(x>=28&&x<740){r(x,y,1,14,c.seam);r(x+3,y+3,1,1,c.timber[2])}
  r(left+6,y+4,Math.max(1,Math.min(29,right-left-8)),1,c.floor[(row+col+13)%4])
  if(layout.theme==='tech'&&row%4===0)r(left+5,y+11,Math.max(1,Math.min(18,right-left-8)),1,'#5a7b8a')
 }
 r(28,204,712,9,c.timber[0]);r(28,213,712,3,c.seam)
 // Back wall, detailed mortar, framed plaster in the cozy conservatory.
 r(26,38,716,164,c.wall[0])
 for(let row=0;row<10;row++)for(let col=0;col<19;col++) {
  const x=28+col*40-(row%2)*20,y=40+row*16
  if(x<26||x+39>742)continue
  r(x,y,39,15,c.wall[(row+col*3)%3]);r(x,y,38,1,layout.theme==='cozy'?c.wall[2]:c.stone[1]);r(x+3,y+12,12,1,c.wall[(row+col+1)%3])
  if((row+col)%4===0){r(x+28,y+5,5,1,c.wall[(row+col+1)%3]);r(x+30,y+6,2,2,c.wall[(row+col+1)%3])}
 }
 // Timber framing and paneling anchor a coherent human scale.
 for(const x of [28,110,266,302,458,494,650,732]) {
  r(x,36,8,175,ink);r(x+1,38,6,172,c.timber[1]);r(x+1,38,2,170,c.timber[2]);r(x-2,194,12,10,c.timber[0]);r(x-2,194,12,2,c.timber[2])
 }
 r(24,32,720,10,ink);r(25,32,718,5,c.timber[2]);r(26,37,716,4,c.timber[0])
 r(24,198,720,10,c.timber[0]);r(24,198,720,2,c.timber[2])
 // High windows: sky, distant treetops and cross-mullions.
 for(const x of [54,672]) {
  r(x-4,66,42,100,ink);r(x-2,68,38,96,c.trim);r(x+1,71,32,89,c.sky[0]);r(x+2,111,30,48,c.sky[1])
  for(let i=0;i<6;i++){const sy=126-(i*11%20);r(x+2+i*5,sy,5,158-sy,c.sky[0]);r(x+4+i*5,sy-4,1,4,c.sky[0])}
  r(x+20,79,7,7,'#f4dfad');r(x+15,71,3,90,c.timber[0]);r(x+1,104,32,3,c.timber[0]);r(x-4,163,42,6,c.timber[2]);r(x-5,169,44,3,c.timber[0])
 }
 // Three independently styled entrances, with reserved landings.
 layout.doors.forEach((door,i)=>pixels.push(...hallDoorPixels(door,layout.theme).map(p=>({...p,x:p.x+144+i*192,y:p.y+48}))))
 // Wall banners are part of the architecture; placed banners are separate pieces.
 for(const x of [276,468]) {
  r(x-4,54,30,4,c.timber[0]);r(x-3,54,28,2,brass);r(x,58,22,78,ink);r(x+2,59,18,70,c.cloth[1]);r(x+4,59,3,69,c.cloth[2]);r(x+17,60,2,68,c.cloth[0]);r(x+5,128,12,5,c.cloth[1]);r(x+8,133,6,4,c.cloth[1])
  r(x+10,77,2,30,brassLight);r(x+5,88,12,2,brassLight);r(x+7,110,8,2,brass)
 }
 // Ceiling beams, iron chandeliers and flame-sized light sources.
 for(const x of [76,360,644]) {
  r(x+20,15,4,26,ink);r(x+21,16,1,24,brass);r(x,40,46,5,ink);r(x+4,44,38,3,brass)
  for(const dx of [2,15,28,41]){r(x+dx,33,3,9,'#e6c79b');r(x+dx,29,2,5,'#f8d181');r(x+dx,30,1,3,'#fff1c5')}
 }
 for(const x of [116,256,308,448,500,640]) {r(x,148,7,16,ink);r(x+1,149,5,12,brass);r(x+2,150,3,9,c.glow);r(x-1,163,10,3,c.timber[0])}
 // The runner is optional and never blocks the central aisle.
 if(layout.rug){
  r(336,224,96,244,ink);r(339,224,90,244,c.cloth[0]);r(342,224,84,244,brass);r(344,224,80,244,c.cloth[1]);r(348,224,72,244,c.cloth[0])
  for(let y=232;y<461;y+=24){r(379,y,10,3,brass);r(376,y+3,16,3,brass);r(379,y+6,10,3,brass);r(381,y+3,6,3,c.cloth[0]);r(346,y,2,3,brass);r(420,y,2,3,brass)}
  for(let x=340;x<430;x+=4){r(x,220,2,4,brass);r(x,468,2,4,brass)}
 }
 // Cutaway side walls and carved foreground rails, keeping the floor readable.
 for(const x of [18,740]){r(x,37,10,440,ink);r(x+1,38,7,430,c.stone[0]);r(x+1,40,2,425,c.stone[2])}
 r(18,460,306,14,c.stone[0]);r(444,460,306,14,c.stone[0]);r(18,460,306,3,c.trim);r(444,460,306,3,c.trim)
 r(324,471,120,10,c.stone[1]);r(324,471,120,2,c.stone[2]);r(316,481,136,10,c.stone[0]);r(316,481,136,2,c.stone[1]);r(310,491,148,10,ink)
 if(layout.greenery) {
  for(const x of [35,92,662,716]) for(let j=0;j<9;j++) {const y=38+j*9,dx=(j*3%7)-3;r(x+dx,y,3,10,'#354d43');r(x+dx-4,y+2,7,4,'#56765b');r(x+dx+2,y+5,5,3,'#7f9d72')}
  for(const x of [32,48,64,682,698,714]){r(x,456,15,12,'#2c483e');r(x+2,452,10,10,'#56765b');r(x+4,451,5,4,'#8fa777')}
 }
 return pixels
}

export function hallFootprint(kind: HallKind) { return hallCatalog.find(c => c.kind === kind)! }

export function drawHall(ctx: CanvasRenderingContext2D, layout: HallLayout) {
 ctx.clearRect(0,0,HALL.width,HALL.height)
 ctx.imageSmoothingEnabled = false
 const draw = (pixels: Pixel[], x=0, y=0) => { for(const p of pixels){ctx.fillStyle=p.color;ctx.fillRect(p.x+x,p.y+y,p.w,p.h)} }
 draw(hallArchitecture(layout))
 const c=worldPalettes[layout.theme]
 // Soft atmospheric light is composited once, never in an animation loop.
 const glow=(x:number,y:number,rx:number,ry:number,color:string,strength:number)=>{ctx.save();ctx.translate(x,y);ctx.scale(rx,ry);const g=ctx.createRadialGradient(0,0,0,0,0,1);g.addColorStop(0,color);g.addColorStop(1,color+'00');ctx.globalAlpha=strength;ctx.fillStyle=g;ctx.fillRect(-1,-1,2,2);ctx.restore()}
 for(const x of [120,260,312,452,504,644])glow(x,170,45,66,c.glow,.16)
 for(const piece of [...layout.pieces].sort((a,b)=>a.y+hallFootprint(a.kind).height-b.y-hallFootprint(b.kind).height)) {
  const item=hallFootprint(piece.kind),x=piece.x*32,y=piece.y*32
  ctx.fillStyle='#10172155';ctx.beginPath();ctx.ellipse(x+item.width*16,y+item.height*32-4,item.width*17,7,0,0,Math.PI*2);ctx.fill()
  draw(hallComponentPixels(piece.kind,layout.theme),x,y)
  if(piece.kind==='lantern'||piece.kind==='hearth'||piece.kind==='floor-lamp')glow(x+item.width*16,y+item.height*16,70,50,c.glow,.18)
  if(piece.kind==='bookshelf')glow(x+14,y-10,32,30,'#ffd18b',.14)
 }
}

// Original Realm ornament geometry. Run from any directory; no external artwork.
import {mkdir, writeFile} from 'node:fs/promises'
import {resolve} from 'node:path'
const out=resolve(import.meta.dirname,'../public/profile-frames')
await mkdir(out,{recursive:true})
const n=v=>Number(v.toFixed(2))
const path=(d,stroke,width=1,fill='none',extra='')=>`<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${width}" stroke-linejoin="round" ${extra}/>`
const shape=(s,inset)=>s==='circle'?`M128 ${inset}a${128-inset} ${128-inset} 0 1 1 0 ${256-2*inset}a${128-inset} ${128-inset} 0 1 1 0 -${256-2*inset}`:s==='square'?`M${inset} ${inset}H${256-inset}V${256-inset}H${inset}Z`:`M${inset+35} ${inset}H${221-inset}Q${256-inset} ${inset} ${256-inset} ${inset+35}V${221-inset}Q${256-inset} ${256-inset} ${221-inset} ${256-inset}H${inset+35}Q${inset} ${256-inset} ${inset} ${221-inset}V${inset+35}Q${inset} ${inset} ${inset+35} ${inset}Z`
const gem=(x,y,r,color,light)=>`<g transform="translate(${x} ${y})">${path(`M0 -${r}L${n(r*.68)} 0 0 ${r} -${n(r*.68)} 0Z`,'#151921',2,color)}${path(`M0 -${r-3}L0 ${r-3} -${n(r*.45)} 0Z`,'none',0,light)}${path(`M0 -${r-3}L${n(r*.45)} 0 0 ${r-3}`,'#ffffff',.7)}</g>`
const leaf=(x,y,angle,scale=1)=>`<g transform="translate(${x} ${y}) rotate(${angle}) scale(${scale})">${path('M0 0Q-15 -3 -10 -20Q5 -17 0 0Z','#273d28',1.4,'#779753')}${path('M0 0L-8 -16','#d0d889',1)}</g>`
const flower=(x,y,color='#e9deac',scale=1)=>`<g transform="translate(${x} ${y}) scale(${scale})">${[0,72,144,216,288].map(a=>`<ellipse cx="0" cy="-5" rx="3.5" ry="5" fill="${color}" stroke="#44523a" stroke-width=".8" transform="rotate(${a})"/>`).join('')}<rect x="-2" y="-2" width="4" height="4" fill="#e5b75e"/></g>`
const star=(x,y,r,color)=>path(`M${x} ${y-r}L${x+r*.25} ${y-r*.25} ${x+r} ${y} ${x+r*.25} ${y+r*.25} ${x} ${y+r} ${x-r*.25} ${y+r*.25} ${x-r} ${y} ${x-r*.25} ${y-r*.25}Z`,'#775d80',.7,color)
const heart=(x,y,scale=1)=>`<g transform="translate(${x} ${y}) scale(${scale})">${path('M0 7L-8 0Q-13 -8 -7 -10Q-2 -12 0 -6Q4 -13 9 -9Q14 -4 7 2Z','#a65c74',1.5,'#f9b6c4')}${path('M-7 -7L-4 -7','#fff4e6',1.5)}</g>`
function cat(x,y){return `<g transform="translate(${x} ${y})">${path('M-16 5L-16 -13 -8 -8Q0 -12 8 -8L16 -13 16 5Q14 15 0 15Q-14 15 -16 5Z','#a57778',2,'#ffe3b5')}<path d="M-10 -7L-13 -10V-3M10 -7L13 -10V-3" stroke="#e5a4a6" fill="none" stroke-width="2"/><path d="M-7 1V4M7 1V4M-2 7L0 9 2 7M-2 9L-5 10M2 9L5 10" stroke="#68464e" stroke-width="2" fill="none"/><path d="M-12 7H-9M9 7H12" stroke="#ea9f9f" stroke-width="2"/></g>`}
function bunny(x,y){return `<g transform="translate(${x} ${y})">${path('M-12 0Q-15 -19 -9 -19Q-3 -19 -4 -3H4Q3 -19 9 -19Q15 -19 12 0Q21 19 0 20Q-21 19 -12 0Z','#a58bba',1.5,'#f6eefb')}<path d="M-9 -14V-4M9 -14V-4" stroke="#dfb4d9" stroke-width="3"/><path d="M-6 7V10M6 7V10M-2 13H2" stroke="#73596f" stroke-width="2"/></g>`}
// Position ornaments along each actual silhouette, not a distorted circle.
function points(s,count=24){
 if(s==='circle')return Array.from({length:count},(_,i)=>{const a=-Math.PI/2+i*2*Math.PI/count;return {x:n(128+101*Math.cos(a)),y:n(128+101*Math.sin(a)),a:n(a*180/Math.PI+90)}})
 const coords=s==='square'?[[32,28],[64,28],[96,28],[128,28],[160,28],[192,28],[224,28],[228,64],[228,96],[228,128],[228,160],[228,192],[224,228],[192,228],[160,228],[128,228],[96,228],[64,228],[32,228],[28,192],[28,160],[28,128],[28,96],[28,64]]:[[48,32],[72,28],[100,28],[128,28],[156,28],[184,28],[208,32],[224,52],[228,80],[228,112],[228,144],[228,176],[220,208],[196,226],[164,228],[132,228],[100,228],[68,228],[44,220],[30,196],[28,164],[28,132],[28,100],[30,68]]
 return coords.map(([x,y])=>({x,y,a:n(Math.atan2(y-128,x-128)*180/Math.PI+90)}))
}
const metalDefs=`<linearGradient id="steel" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#9696a3"/><stop offset=".22" stop-color="#343640"/><stop offset=".5" stop-color="#11151d"/><stop offset=".72" stop-color="#626574"/><stop offset="1" stop-color="#242632"/></linearGradient><linearGradient id="gold" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="#fff0ac"/><stop offset=".22" stop-color="#d8ab50"/><stop offset=".45" stop-color="#9b612d"/><stop offset=".7" stop-color="#ffe0a0"/><stop offset="1" stop-color="#b27e33"/></linearGradient>`
for(const id of ['dark-realm','royal-legend','nature-spirit','cyber-core','minimal-mono','cozy-friends'])for(const s of ['circle','rounded-square','square']){
 let art='',ps=points(s)
 if(id==='dark-realm'){
  art+=path(shape(s,27),'#0b0d14',14)+path(shape(s,27),'url(#steel)',9)+path(shape(s,33),'#727281',1)+path(shape(s,23),'#a62b40',1)
  ps.forEach(({x,y,a},i)=>{if(i%3===0)art+=`<g transform="translate(${x} ${y}) rotate(${a})">${path('M-12 5L-8 -8 0 -20 6 -7 12 -10 8 6','#080b13',2,'url(#steel)')}${path('M-7 -6L0 -16 3 -7','#cc4553',1.5)}${path('M-6 6L0 1 5 5','#a0a1aa',1)}</g>`;else art+=`<rect x="${x-1}" y="${y-1}" width="2" height="2" fill="#b7a8a7"/>`})
  art+=gem(128,22,14,'#8c1c36','#e14b57')+gem(128,234,12,'#7f1f30','#cf4b55')
  if(s!=='circle')for(const [x,y,a] of [[31,31,-45],[225,31,45],[225,225,135],[31,225,-135]])art+=`<g transform="translate(${x} ${y}) rotate(${a})">${path('M-12 8L0 -15 12 8 0 3Z','#080c14',2,'#4c4e5a')}${path('M0 -10V1','#d74350',2)}</g>`
 }
 if(id==='royal-legend'){
  art+=path(shape(s,28),'#433121',12)+path(shape(s,28),'url(#gold)',8)+path(shape(s,35),'#f5de9c',1)+path(shape(s,21),'#b77e37',1.5)
  ps.forEach(({x,y,a},i)=>{art+=`<g transform="translate(${x} ${y}) rotate(${a})">${i%3===0?path('M-12 0Q-16 -11 -3 -14L0 -7 3 -14Q16 -11 12 0L0 7Z','#5b3c24',1,'url(#gold)')+path('M-9 -3L-3 -7M9 -3L3 -7','#ffeac1',1):path('M-5 0L0 -5 5 0 0 5Z','#86562d',1,'#eec878')}</g>`})
  art+=`<g transform="translate(128 24)">${path('M-23 0L-28 -16 -13 -9 -8 -24 0 -14 8 -24 13 -9 28 -16 23 0Z','#704721',2,'url(#gold)')}${path('M-20 -1H20M-18 4H18','#ffe4a0',2)}${gem(0,-9,10,'#24578d','#6fb6dd')}</g>`+gem(128,231,15,'#205f9c','#8ad3e5')
 }
 if(id==='nature-spirit'){
  art+=path(shape(s,28),'#263627',13)+path(shape(s,28),'#735d39',8)+path(shape(s,30),'#a39057',1.5)+path(shape(s,23),'#596e3a',2)
  ps.forEach(({x,y,a},i)=>{art+=leaf(x,y,a+(i%2?28:-25),i%3===0?1:.8);if(i%4===0)art+=flower(n(x+Math.cos(a)*6),n(y+Math.sin(a)*6),i%8===0?'#a7f3df':'#f2dbb3',.8)})
  art+=`<g transform="translate(128 25)">${path('M-16 1Q-10 -17 0 -10Q10 -17 16 1L0 10Z','#2a492f',1.5,'#c0cf7b')}${path('M0 -10V6M-10 -8L0 4 10 -8','#536e34',1)}</g>`+gem(128,233,8,'#6d9d80','#cbf8cc')
 }
 if(id==='cyber-core'){
  art+=path(shape(s,28),'#101b28',13)+path(shape(s,28),'#52617b',8)+path(shape(s,23),'#aeb7cc',1)+path(shape(s,34),'#42d9e9',1)
  art+=path(shape(s,27),'#59eff0',3,'none','stroke-dasharray="32 16 6 23"')+path(shape(s,21),'#aca2f5',2,'none','stroke-dasharray="16 82"')
  ps.forEach(({x,y,a},i)=>{if(i%3===0)art+=`<g transform="translate(${x} ${y}) rotate(${a})">${path('M-12 5V-8L-6 -14H11V-8H-3V5Z','#172333',2,'#6a7b91')}${path('M-8 -7V-10H7','#a8f6f2',2)}<rect x="3" y="-3" width="5" height="5" fill="#a59aeb"/></g>`})
  art+=gem(128,23,12,'#337c9e','#a5fff5')+path('M117 234H139M122 239H134','#a8a5f9',2)
 }
 if(id==='minimal-mono'){
  art+=path(shape(s,28),'#10131b',8)+path(shape(s,27),'#f3f0e5',3)+path(shape(s,34),'#a6acb4',1)
  for(const {x,y,a} of ps.filter((_,i)=>i%6===0))art+=`<g transform="translate(${x} ${y}) rotate(${a})">${path('M-11 1L0 -10 11 1 0 7Z','#171923',1.5,'#f1eee4')}${path('M-5 0L0 -5 5 0 0 3Z','#6c717c',1,'#343941')}</g>`
  art+=star(s==='circle'?57:43,s==='circle'?59:44,7,'#f3f0e5')+star(s==='circle'?205:212,s==='circle'?188:212,5,'#f3f0e5')
  if(s!=='circle')art+=path('M30 69V42Q30 30 42 30H69M186 226H214Q226 226 226 214V186','#f4f1e7',3)
 }
 if(id==='cozy-friends'){
  art+=path(shape(s,28),'#a97688',11)+path(shape(s,28),'#f4b6b8',8)+path(shape(s,25),'#ffedca',2)+path(shape(s,33),'#c8a9dd',2)
  ps.forEach(({x,y},i)=>{if(i%4===1)art+=heart(x,y,.65);if(i%6===3)art+=star(x,y,9,'#ffdda0');if(i%4===0)art+=`<circle cx="${x}" cy="${y}" r="2.3" fill="#fff4db"/>`})
  art+=cat(s==='circle'?79:62,s==='circle'?37:26)+bunny(s==='circle'?205:218,s==='circle'?192:215)+heart(131,231,.9)+star(216,47,12,'#ffe1a5')
 }
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256"><title>${id} / ${s} — original STXIC Realm frame</title><defs>${metalDefs}</defs>${art}</svg>\n`
 await writeFile(resolve(out,`${id}-${s}.svg`),svg)
}
console.log('Wrote 18 original transparent frame SVGs')

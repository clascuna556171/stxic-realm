import {chromium} from 'playwright'
import {readFile,writeFile,mkdir} from 'node:fs/promises'
import {resolve} from 'node:path'
import {BADGE_CATALOG} from '../src/badges.ts'

// Source-only copies preserve the existing artwork and its original sheet captions.
// Capture bounds exclude those captions before centering the complete crest.
const root=resolve(import.meta.dirname,'../../..')
const captionBounds={
 'code-contributor':100,'design-contributor':98,'system-tinkerer':103,
 'lore-reader':105,'storyteller':105,'chronicle-keeper':104,
 'milestone-explorer':105,'progress-seeker':106,'discord-ally':103,
 'house-leader':105,'guardian':104,'supporter':104,'realm-patron':104,
 'seasonal-veteran':99,'event-participant':103,'realm-legend':104,
}
const output=resolve(root,'apps/web/public/badges')
await mkdir(output,{recursive:true})
const browser=await chromium.launch({channel:process.env.REALM_BROWSER_CHANNEL??'chrome',headless:true})
const report=[]
try {
 const page=await browser.newPage()
 for(const badge of Object.values(BADGE_CATALOG)) {
  const original=await readFile(resolve(root,'docs/art-source/badges',badge.id+'.png'))
  const result=await page.evaluate(async({src,bottom,captioned})=>{
   const image=new Image();image.src=src;await image.decode()
   if(image.width!==128||image.height!==128)throw new Error('Expected an original 128px badge capture.')
   const source=document.createElement('canvas');source.width=image.width;source.height=image.height
   const ctx=source.getContext('2d');ctx.drawImage(image,0,0)
   const pixels=ctx.getImageData(0,0,image.width,image.height)
   // Keep the crest component and its antialiased edge when captions are close
   // to the shield tip. This removes isolated glyph fragments above the cutoff.
   if(captioned) {
    const seen=new Uint8Array(128*bottom),components=[]
    for(let start=0;start<seen.length;start++) {
     if(seen[start]||pixels.data[start*4+3]<16)continue
     const queue=[start];seen[start]=1
     for(let head=0;head<queue.length;head++) {
      const i=queue[head],x=i%128,y=(i/128)|0
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++) {
       const xx=x+dx,yy=y+dy,n=yy*128+xx
       if(xx<0||xx>=128||yy<0||yy>=bottom||seen[n]||pixels.data[n*4+3]<16)continue
       seen[n]=1;queue.push(n)
      }
     }
     components.push(queue)
    }
    components.sort((a,b)=>b.length-a.length)
    const keep=new Uint8Array(128*bottom)
    for(const i of components[0]) {
     const x=i%128,y=(i/128)|0
     for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++) {
      const xx=x+dx,yy=y+dy;if(xx>=0&&xx<128&&yy>=0&&yy<bottom)keep[yy*128+xx]=1
     }
    }
    for(let i=0;i<128*128;i++)if(i>=keep.length||!keep[i])pixels.data[i*4+3]=0
   }
   let left=128,top=128,right=0,low=0
   for(let y=0;y<bottom;y++)for(let x=0;x<128;x++)if(pixels.data[(y*128+x)*4+3]>0){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x+1);low=Math.max(low,y+1)}
   ctx.putImageData(pixels,0,0)
   const width=right-left,height=low-top,scale=112/Math.max(width,height)
   const w=Math.round(width*scale),h=Math.round(height*scale)
   const canvas=document.createElement('canvas');canvas.width=canvas.height=128
   const out=canvas.getContext('2d');out.imageSmoothingEnabled=true;out.imageSmoothingQuality='high'
   out.drawImage(source,left,top,width,height,Math.round((128-w)/2),Math.round((128-h)/2),w,h)
   return {image:canvas.toDataURL('image/png').split(',')[1],sourceBounds:{left,top,right,bottom:low},outputBounds:{width:w,height:h},captionRemoved:captioned}
  },{src:'data:image/png;base64,'+original.toString('base64'),bottom:captionBounds[badge.id]??128,captioned:badge.id in captionBounds})
  await writeFile(resolve(output,badge.id+'.png'),Buffer.from(result.image,'base64'))
  const {image,...metadata}=result;report.push({id:badge.id,...metadata})
 }
 await writeFile(resolve(root,'docs/art-source/badges/captures.json'),JSON.stringify({size:128,artExtent:112,transparentPadding:8,captures:report},null,2)+'\n')
 console.log('Recaptured 32 transparent badges with shared 128px canvas / 112px art extent; preserved catalog IDs and original artwork.')
}finally{await browser.close()}

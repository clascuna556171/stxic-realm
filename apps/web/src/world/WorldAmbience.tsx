import { useEffect, useRef } from 'react'
import fireflies from './vfx/fireflies'
import embers from './vfx/embers'

type Source={x:number;y:number}
export function WorldAmbience({width=512,height=384,hearths}:{width?:number;height?:number;hearths?:Source[]}) {
 const canvas=useRef<HTMLCanvasElement>(null)
 const sources=JSON.stringify(hearths)
 useEffect(()=>{
  const element=canvas.current,ctx=element?.getContext('2d')
  if(!element||!ctx)return
  const motion=matchMedia('(prefers-reduced-motion: reduce)')
  const w=width/2,h=height/2,color=new Uint32Array(w*h),light=new Uint32Array(w*h)
  const frame={w,h,ox:0,oy:0,color,light}
  const colorImage=new ImageData(new Uint8ClampedArray(color.buffer),w,h),lightImage=new ImageData(new Uint8ClampedArray(light.buffer),w,h)
  const layer=document.createElement('canvas');layer.width=w;layer.height=h
  const layerCtx=layer.getContext('2d')!
  const fx=hearths?hearths.map((p,i)=>embers({area:{x:p.x+28,y:p.y+52,w:40,h:28},density:.08,heat:false,seed:i+1})):[fireflies({area:{x:0,y:height-70,w:width,h:70},density:.2,close:2,grass:false,seed:7})]
  // Preserve the source's fixed 60 Hz simulation; render at 30 Hz on a small buffer.
  for(let i=0;i<210;i++)fx.forEach(f=>f.update(1/60))
  let id=0,last=0,accumulator=0,visible=true,disposed=false
  const clear=()=>ctx.clearRect(0,0,w,h)
  const tick=(now:number)=>{
   if(disposed||motion.matches||document.hidden||!visible){id=0;last=0;return}
   accumulator+=last?Math.min((now-last)/1000,.1):1/30;last=now
   if(accumulator>=1/30){
    while(accumulator>=1/60){fx.forEach(f=>f.update(1/60));accumulator-=1/60}
    color.fill(0);light.fill(0);fx.forEach(f=>f.draw(frame,'front'))
    clear();ctx.globalCompositeOperation='source-over';layerCtx.putImageData(lightImage,0,0);ctx.drawImage(layer,0,0)
    layerCtx.putImageData(colorImage,0,0);ctx.drawImage(layer,0,0)
   }
   id=requestAnimationFrame(tick)
  }
  const resume=()=>{if(motion.matches||document.hidden||!visible){cancelAnimationFrame(id);id=0;last=0;clear()}else if(!id)id=requestAnimationFrame(tick)}
  const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;resume()})
  observer.observe(element);motion.addEventListener('change',resume);document.addEventListener('visibilitychange',resume);resume()
  return()=>{disposed=true;cancelAnimationFrame(id);observer.disconnect();motion.removeEventListener('change',resume);document.removeEventListener('visibilitychange',resume)}
 },[width,height,sources])
 return <canvas ref={canvas} width={width/2} height={height/2} className={`world-ambience ${hearths?'hearth-ambience':'garden-ambience'}`} aria-hidden="true"/>
}

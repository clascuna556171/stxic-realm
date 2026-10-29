import { useEffect, useRef } from 'react'
import type { Appearance } from '../appearance'
import { characterPixels } from '../character'
import { composedRoomPixels } from './art'
import { OBJECTS } from './room'

// A character setting, deliberately separate from the member's saved home layout.
export function ProfileScene({ appearance }: { appearance: Appearance }) {
 const canvas=useRef<HTMLCanvasElement>(null)
 useEffect(()=>{
  const ctx=canvas.current?.getContext('2d')
  if(!ctx)return
  ctx.clearRect(0,0,512,384);ctx.imageSmoothingEnabled=false
  for(const p of composedRoomPixels(appearance.mood,OBJECTS)){ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,p.w,p.h)}
  ctx.fillStyle='#14212473';ctx.beginPath();ctx.ellipse(260,301,22,7,0,0,Math.PI*2);ctx.fill()
  for(const p of characterPixels(appearance)){ctx.fillStyle=p.color;ctx.fillRect(p.x+236,p.y+237,p.w,p.h)}
 },[appearance])
 return <canvas ref={canvas} className="profile-scene" width={512} height={384} role="img" aria-label={`Your character in a ${appearance.mood} room setting`}/>
}

import { useEffect, useState } from 'react'
import { PixelCharacter } from '../AppearanceStudio'
import { readAppearance } from '../appearance'
import type { Direction, Point } from './room'

export function HallTraveler({position,direction,moving,seated=false}:{position:Point;direction:Direction;moving:boolean;seated?:boolean}){
 const [frame,setFrame]=useState(0)
 useEffect(()=>{const media=matchMedia('(prefers-reduced-motion: reduce)');let timer:ReturnType<typeof setInterval>|undefined;const start=()=>{clearInterval(timer);setFrame(0);if(moving&&!media.matches)timer=setInterval(()=>setFrame(f=>f===1?2:1),100)};start();media.addEventListener('change',start);return()=>{clearInterval(timer);media.removeEventListener('change',start)}},[moving])
 return <div className={`hall-traveler is-walking-character${seated?' is-seated':''}`} data-facing={direction} style={{left:`${(position.x*32+16)/768*100}%`,top:`${(position.y*32+27)/512*100}%`}}><PixelCharacter value={readAppearance()} direction={direction} frame={frame}/><span>You</span></div>
}

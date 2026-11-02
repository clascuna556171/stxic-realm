import { useEffect, useState } from 'react'
import { readAppearance } from '../appearance'
import {characterPixels,seatedCharacterPixels,restingCharacterPixels,idleCharacterPixels} from '../character'
import {furniturePose,type PoseObject} from './furniture-pose'
import {furnitureActionForeground} from './art'
import type { Direction, Point, RoomAction } from './room'
import {TravelerActivity} from './TravelerActivity'
import {initialFocus,type WorldSnapshot,type FocusState} from './activity-state'

export function HallTraveler({position,direction,moving,action=null,objects=[],activity={messages:[],activity:[]},user='local',focus=initialFocus}:{position:Point;direction:Direction;moving:boolean;action?:RoomAction|null;objects?:PoseObject[];activity?:WorldSnapshot;user?:string;focus?:FocusState}){
 const [frame,setFrame]=useState(0)
 useEffect(()=>{const media=matchMedia('(prefers-reduced-motion: reduce)');let timer:ReturnType<typeof setInterval>|undefined;const start=()=>{clearInterval(timer);setFrame(0);if(!media.matches&&!document.hidden)timer=setInterval(()=>setFrame(f=>f+1),moving?110:250)};start();media.addEventListener('change',start);document.addEventListener('visibilitychange',start);return()=>{clearInterval(timer);media.removeEventListener('change',start);document.removeEventListener('visibilitychange',start)}},[moving])
 const appearance=readAppearance(),pose=furniturePose(position,action,objects),x=pose?.x??position.x*32+16,y=pose?.y??position.y*32+27,facing=pose?.direction??direction
 const pixels=pose?.type==='sit'?(frame===0?seatedCharacterPixels(appearance,facing):idleCharacterPixels(appearance,facing,frame,'sit')):pose?.type==='rest'?restingCharacterPixels(appearance,facing):moving?characterPixels(appearance,facing,frame===0?0:frame%2+1):frame===0?characterPixels(appearance,facing):idleCharacterPixels(appearance,facing,frame)
 // The same contain/center viewBox as the canvas keeps actors on their tiles in letterboxed stages.
 return <svg className="hall-traveler-surface" viewBox="0 0 768 512" preserveAspectRatio="xMidYMid meet" role="img" aria-label={pose?`Your character: ${action!.label}`:'Your character'}>
  <g className={`hall-traveler is-walking-character${pose?' is-posed':''}`} data-facing={facing} data-pose={pose?.type??'standing'} data-pose-target={pose?.object.id} data-world-x={x} data-world-y={y} style={{transform:`translate(${x}px,${y}px)`,transition:pose||!moving?'none':undefined}}>
   {!pose&&<ellipse cx="0" cy="-2" rx="11" ry="3.5" fill="#10182080"/>}
   <g transform="translate(-15.84 -42.24) scale(.66)">{pixels.map((p,i)=><rect key={i} x={p.x} y={p.y} width={p.w} height={p.h} fill={p.color}/>)}</g>
   <rect x="-12" y="-54" width="24" height="12" rx="2" fill="#17212bed"/><text x="0" y="-45" textAnchor="middle" fontSize="8" fill="#e0edf3">You</text>
  </g>
  {pose&&<g className="hall-pose-foreground" aria-hidden="true">{furnitureActionForeground(pose.kind,appearance.mood,appearance.skin).map((p,i)=><rect key={i} x={pose.object.x*32+p.x} y={pose.object.y*32+p.y} width={p.w} height={p.h} fill={p.color}/>)}</g>}
  <TravelerActivity snapshot={activity} user={user} x={x} y={y} focus={focus}/>
 </svg>
}

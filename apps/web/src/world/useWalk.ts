import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { createWalker, type WalkGoal, type WalkState } from './navigation'
import type { Direction, Point } from './room'

export function useWalk(options: { position: () => Point; walkable: (p:Point) => boolean; step: (p:Point) => Promise<void>|void; enabled?: boolean }) {
 const latest=useRef(options);latest.current=options
 const [state,setState]=useState<WalkState>({moving:false,message:'Click or tap the floor to walk. Select an object to approach it.',arrived:null})
 const walker=useRef<ReturnType<typeof createWalker>|null>(null)
 useEffect(()=>{const next=createWalker({position:()=>latest.current.position(),walkable:p=>latest.current.walkable(p),step:p=>latest.current.step(p),changed:setState});walker.current=next;return()=>{next.dispose();walker.current=null}},[])
 useEffect(()=>{if(options.enabled===false)walker.current?.cancel('Movement is unavailable. Re-enter to continue.');else if(options.enabled===true)walker.current?.cancel('Click or tap the floor to walk. Select an object to approach it.')},[options.enabled])
 const go=(goal:WalkGoal)=>{if(latest.current.enabled!==false)walker.current?.go(goal)}
 const cancel=(message?:string)=>walker.current?.cancel(message)
 const step=(d:Direction)=>{const p=latest.current.position(),delta={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]}[d];go({point:{x:p.x+delta[0],y:p.y+delta[1]}})}
 const key=(e:KeyboardEvent<HTMLElement>)=>{if(e.target!==e.currentTarget)return;if(e.key==='Escape'){e.preventDefault();cancel();return}const d:Record<string,Direction>={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',w:'up',s:'down',a:'left',d:'right'};if(d[e.key]){e.preventDefault();step(d[e.key])}}
 return {...state,go,cancel,step,key}
}

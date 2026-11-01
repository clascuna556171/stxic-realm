import {useEffect,useRef,useState} from 'react'
import type {RoomAction} from './room'
import {focusTransition,initialFocus} from './activity-state'
import {useSoundscape} from './useSoundscape'
export type ItemTarget={id:string;name:string;description:string;kind?:string}
export function useWorldItems(){
 const [focus,setFocus]=useState({...initialFocus}),[now,setNow]=useState(Date.now())
 const sound=useSoundscape()
 useEffect(()=>{if(focus.status!=='running')return;const timer=setInterval(()=>{const time=Date.now();setNow(time);setFocus(value=>focusTransition(value,'tick',time))},1000);return()=>clearInterval(timer)},[focus.status])
 function syncAction(action:RoomAction|null){setFocus(value=>value.status==='running'&&(action?.type!=='sit'||action.target!==value.target)?focusTransition(value,'leave',Date.now()):value)}
 const opener=useRef<HTMLElement|null>(null)
 const [target,setTarget]=useState<ItemTarget|null>(null)
 const [lights,setLights]=useState<Record<string,boolean>>({})
 const [watered,setWatered]=useState<Record<string,number>>({})
 const [splash,setSplash]=useState(0)
 return {target,opener,open:(next:ItemTarget|null)=>{opener.current=document.activeElement as HTMLElement|null;setTarget(next)},close:()=>setTarget(null),lights,watered,splash,focus,now,syncAction,sound,
  startFocus:(id:string)=>setFocus(value=>focusTransition(value,'start',Date.now(),id)),pauseFocus:()=>setFocus(value=>focusTransition(value,'pause',Date.now())),resetFocus:()=>setFocus({...initialFocus}),
  toggle:(id:string)=>setLights(v=>({...v,[id]:v[id]===false})),
  water:(id:string)=>{setWatered(v=>({...v,[id]:Date.now()}));setSplash(v=>v+1)}}
}

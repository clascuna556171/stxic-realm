import {useRef,useState} from 'react'
export type ItemTarget={id:string;name:string;description:string;kind?:string}
export function useWorldItems(){
 const opener=useRef<HTMLElement|null>(null)
 const [target,setTarget]=useState<ItemTarget|null>(null)
 const [lights,setLights]=useState<Record<string,boolean>>({})
 const [watered,setWatered]=useState<Record<string,number>>({})
 const [splash,setSplash]=useState(0)
 return {target,opener,open:(next:ItemTarget|null)=>{opener.current=document.activeElement as HTMLElement|null;setTarget(next)},close:()=>setTarget(null),lights,watered,splash,
  toggle:(id:string)=>setLights(v=>({...v,[id]:v[id]===false})),
  water:(id:string)=>{setWatered(v=>({...v,[id]:Date.now()}));setSplash(v=>v+1)}}
}

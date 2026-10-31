import {useEffect,useRef,useState} from 'react'
import {Soundscape,initialMix,type Sound,type Mix} from './soundscape'
export function useSoundscape(){
 const engine=useRef<Soundscape|null>(null),generation=useRef(0),mixRef=useRef<Mix>(structuredClone(initialMix)),mutedRef=useRef(false)
 const [mix,setMix]=useState(mixRef.current),[muted,setMuted]=useState(false),[error,setError]=useState('')
 useEffect(()=>{
  const stop=()=>{generation.current++;engine.current?.dispose();engine.current=null;mixRef.current=structuredClone(initialMix);setMix(mixRef.current)}
  window.addEventListener('pagehide',stop)
  return()=>{window.removeEventListener('pagehide',stop);generation.current++;engine.current?.dispose();engine.current=null}
 },[])
 async function toggle(sound:Sound){
  const next={...mixRef.current,[sound]:{...mixRef.current[sound],enabled:!mixRef.current[sound].enabled}}
  mixRef.current=next;setMix(next);setError('')
  const version=generation.current
  let active:Soundscape|null=engine.current
  try{
   // Called only inside a user's click handler, including context creation and resume.
   if(next[sound].enabled){engine.current??=new Soundscape();active=engine.current;await active.resume()}
   if(version!==generation.current||active!==engine.current)return
   engine.current?.update(mixRef.current,mutedRef.current)
   if(!Object.values(mixRef.current).some(value=>value.enabled)){engine.current?.dispose();engine.current=null}
  }catch{if(version!==generation.current||active!==engine.current)return;engine.current?.dispose();engine.current=null;mixRef.current=structuredClone(initialMix);setMix(mixRef.current);setError('Audio could not start. Try enabling a sound again.')}
 }
 return {mix,muted,error,toggle,volume:(sound:Sound,volume:number)=>{const next={...mixRef.current,[sound]:{...mixRef.current[sound],volume}};mixRef.current=next;setMix(next);engine.current?.update(next,mutedRef.current)},mute:()=>{mutedRef.current=!mutedRef.current;setMuted(mutedRef.current);engine.current?.update(mixRef.current,mutedRef.current)}}
}

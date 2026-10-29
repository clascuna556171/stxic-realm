import { useEffect, useState } from 'react'
import { readAppearance } from '../appearance'
import { hallStorageKey, parseHall, starterHall } from './hall-layout'

export function readHall(user?: string) {
 const key=hallStorageKey(user)
 try {
  const raw=localStorage.getItem(key)
  const saved=parseHall(raw)
  return { layout:saved??starterHall(readAppearance().mood), raw, error:raw&&!saved?'The saved hall is invalid. A starter arrangement is shown; use Hall Studio to replace it.':'' }
 } catch { return { layout:starterHall(readAppearance().mood),raw:null,error:'Browser storage is unavailable. Hall edits cannot be saved on this device.' } }
}
export function useHall(user?:string) {
 const [snapshot,setSnapshot]=useState(()=>readHall(user))
 useEffect(()=>{
  setSnapshot(readHall(user))
  const update=(e:StorageEvent)=>{if(e.key===hallStorageKey(user)||e.key===null)setSnapshot(readHall(user))}
  window.addEventListener('storage',update)
  return()=>window.removeEventListener('storage',update)
 },[user])
 return snapshot
}

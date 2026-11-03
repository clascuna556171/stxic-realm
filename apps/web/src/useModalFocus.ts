import {useEffect,useRef,type RefObject} from 'react'

/** Focus ownership for the conventional dialogs; native <dialog> owns its own stack. */
export function useModalFocus(open:boolean,returnTarget?:RefObject<HTMLElement|null>,preferActive=false){
 const dialog=useRef<HTMLDivElement>(null)
 useEffect(()=>{
  const element=dialog.current
  if(!open||!element)return
  const active=document.activeElement
  const visibleActive=active instanceof HTMLElement&&active!==document.body&&active.getClientRects().length?active:null
  const opener=preferActive?(visibleActive??returnTarget?.current):(returnTarget?.current??visibleActive)
  const controls=()=>Array.from(element.querySelectorAll<HTMLElement>('a[href],button:not(:disabled),input:not(:disabled),textarea:not(:disabled),select:not(:disabled),[tabindex="0"]')).filter(el=>el.getClientRects().length>0)
  ;(element.querySelector<HTMLElement>('input:not(:disabled),textarea:not(:disabled)')??controls()[0]??element).focus()
  const contain=(event:KeyboardEvent)=>{
   if(event.key!=='Tab')return
   const items=controls(),first=items[0],last=items.at(-1)
   if(!first){event.preventDefault();element.focus();return}
   if(event.shiftKey&&(document.activeElement===first||!element.contains(document.activeElement))){event.preventDefault();last?.focus()}
   else if(!event.shiftKey&&(document.activeElement===last||!element.contains(document.activeElement))){event.preventDefault();first.focus()}
  }
  const redirect=(event:FocusEvent)=>{if(!element.contains(event.target as Node)) (controls()[0]??element).focus()}
  element.addEventListener('keydown',contain)
  document.addEventListener('focusin',redirect)
  return()=>{element.removeEventListener('keydown',contain);document.removeEventListener('focusin',redirect);if(opener?.isConnected)opener.focus()}
 },[open,returnTarget,preferActive])
 return dialog
}

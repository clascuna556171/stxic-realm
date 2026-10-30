import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Icon } from '../Icon'
import type { Direction, Point } from './room'

type Props = {
 position: Point
 moving: boolean
 message: string
 onStep: (direction: Direction) => void
 onStop: () => void
 onWalk?: (point: Point) => void
 disabled?: boolean
 showSteps?: boolean
 children?: ReactNode
 options?: ReactNode
}

export function WalkControls({position,moving,message,onStep,onStop,onWalk,disabled=false,showSteps=true,children,options}:Props){
 const [column,setColumn]=useState(''),[row,setRow]=useState('')
 const panelId=useId()
 const menu=useRef<HTMLDetailsElement>(null)
 useEffect(()=>{
  const dismiss=(event:PointerEvent)=>{if(menu.current&&!menu.current.contains(event.target as Node))menu.current.open=false}
  document.addEventListener('pointerdown',dismiss)
  return()=>document.removeEventListener('pointerdown',dismiss)
 },[])
 const coordinates=<span className="walk-position">Column {position.x+1} · Row {position.y+1}</span>
 const form=onWalk&&<form className="walk-position-form" onSubmit={event=>{event.preventDefault();onWalk({x:Number(column)-1,y:Number(row)-1})}}>
  <label>Column<input aria-label="Walk to column" type="number" step="1" required value={column} onChange={event=>setColumn(event.target.value)}/></label>
  <label>Row<input aria-label="Walk to row" type="number" step="1" required value={row} onChange={event=>setRow(event.target.value)}/></label>
  <button disabled={disabled}>Walk here</button>
 </form>

 // The inspector keeps a text alternative without repeating the main toolbar.
 if(!showSteps)return <details className="walk-controls is-position-controls">
  <summary>Move by coordinates</summary>
  <div className="walk-position-panel">
   <p className="position-feedback" role="status">{message}</p>
   <p>{coordinates}</p>{form}
   {moving&&<button className="position-stop" onClick={onStop}>Stop walking</button>}
  </div>
 </details>

 return <div className="walk-controls is-scene-controls">
  <div className="walk-summary"><p role="status" title={message}><span className="walk-message">{message}</span>{coordinates}</p></div>
  <div className="scene-arrival">{children}</div>
  <button type="button" className="walk-stop" onClick={onStop} disabled={!moving} aria-label="Stop walking" aria-keyshortcuts="Escape">Stop</button>
  <details className="walk-menu" ref={menu} onToggle={event=>{
   if(!event.currentTarget.open)return
   const dock=event.currentTarget.closest('.is-scene-controls'),surface=dock?.closest('.room-main,.hall-world,.shared-hall-stage'),panel=event.currentTarget.querySelector<HTMLElement>('.walk-menu-panel')
   if(dock&&surface&&panel)panel.style.maxHeight=`${Math.max(64,Math.min(360,dock.getBoundingClientRect().top-Math.max(0,surface.getBoundingClientRect().top)-8))}px`
  }} onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget as Node))event.currentTarget.open=false}} onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();event.currentTarget.open=false;event.currentTarget.querySelector('summary')?.focus();onStop()}}}>
   <summary aria-controls={panelId}><Icon name="compass"/>Movement</summary>
   <div className="walk-menu-panel" id={panelId}>
    <p>Arrow keys or WASD to move. Escape to stop.</p>
    <div className="direction-pad" role="group" aria-label="Movement controls">
     {(['up','left','down','right'] as const).map((direction,index)=><button type="button" key={direction} className={`move-${direction}`} aria-label={`Move ${direction}`} disabled={disabled} onClick={()=>onStep(direction)}>{['↑','←','↓','→'][index]}</button>)}
    </div>
    {form}
    {options&&<div className="walk-menu-options">{options}</div>}
   </div>
  </details>
 </div>
}

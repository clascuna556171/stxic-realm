import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { drawHall, hallFootprint } from './hall-art'
import { HALL, placeHallPiece, type HallLayout } from './hall-layout'

type Props = { layout: HallLayout; selected?: string; editing?: boolean; onSelect?: (id: string) => void; onMove?: (id: string, x: number, y: number) => void; disabled?:boolean; onStatus?:(message:string)=>void; onWalk?:(p:{x:number;y:number})=>void; onObject?:(id:string)=>void; onDoor?:(slot:number)=>void }
export function HallCanvas({ layout, selected, editing = false, onSelect, onMove, disabled=false, onStatus, onWalk, onObject, onDoor }: Props) {
 const canvas = useRef<HTMLCanvasElement>(null)
 const drag = useRef<{ id: string; x: number; y: number; column: number; row: number } | null>(null)
 const [preview,setPreview]=useState<{id:string;x:number;y:number;error:string|null}|null>(null)
 const current = layout.pieces.find(p => p.id === selected)
 useEffect(() => {
  const ctx = canvas.current?.getContext('2d')
  if (!ctx) return
  drawHall(ctx, layout)
  if (!editing) return
  ctx.strokeStyle = '#d0e5ed22'; ctx.lineWidth = 1
  for (let x=32; x<768; x+=32) {ctx.beginPath();ctx.moveTo(x+.5,224);ctx.lineTo(x+.5,480);ctx.stroke()}
  for (let y=224; y<=480; y+=32) {ctx.beginPath();ctx.moveTo(32,y+.5);ctx.lineTo(736,y+.5);ctx.stroke()}
  if (current) {
   const item = hallFootprint(current.kind)
   ctx.strokeStyle='#b7e7d5';ctx.lineWidth=2
   ctx.strokeRect(current.x*32+1,current.y*32+1,item.width*32-2,item.height*32-2)
  }
  if(preview){const piece=layout.pieces.find(p=>p.id===preview.id);if(piece){const item=hallFootprint(piece.kind),x=preview.x*32,y=preview.y*32;ctx.fillStyle=preview.error?'#c8676738':'#b7e7d538';ctx.fillRect(x,y,item.width*32,item.height*32);ctx.strokeStyle=preview.error?'#ffa3a3':'#b7e7d5';ctx.strokeRect(x+1,y+1,item.width*32-2,item.height*32-2);if(preview.error){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+item.width*32,y+item.height*32);ctx.moveTo(x+item.width*32,y);ctx.lineTo(x,y+item.height*32);ctx.stroke()}}}
 }, [layout, current, editing,preview])
 useEffect(()=>{drag.current=null;setPreview(null)},[layout,disabled])
 function tile(e: PointerEvent<HTMLCanvasElement>) {
  const rect=e.currentTarget.getBoundingClientRect()
  return { x: Math.floor((e.clientX-rect.left)/rect.width*HALL.columns), y: Math.floor((e.clientY-rect.top)/rect.height*HALL.rows) }
 }
 function down(e: PointerEvent<HTMLCanvasElement>) {
  if(disabled||e.button>0)return
  const point=tile(e)
  const piece=[...layout.pieces].reverse().find(p=>{const item=hallFootprint(p.kind);return point.x>=p.x&&point.x<p.x+item.width&&point.y>=p.y&&point.y<p.y+item.height})
  if(!editing){e.currentTarget.parentElement?.focus({preventScroll:true});if(piece)onObject?.(piece.id);else if(point.y>=2&&point.y<7&&onDoor){const slot=[6,12,18].findIndex(x=>Math.abs(point.x-x)<=1);if(slot>=0)onDoor(slot);else onWalk?.(point)}else onWalk?.(point);return}
  e.currentTarget.focus({preventScroll:true})
  if(piece){onSelect?.(piece.id);drag.current={id:piece.id,x:point.x,y:point.y,column:piece.x,row:piece.y};e.currentTarget.setPointerCapture(e.pointerId)}

 }
 function moving(e:PointerEvent<HTMLCanvasElement>){
  const start=drag.current;if(!start||disabled)return
  const point=tile(e),piece=layout.pieces.find(p=>p.id===start.id);if(!piece)return
  const x=start.column+point.x-start.x,y=start.row+point.y-start.y,error=placeHallPiece(layout,{...piece,x,y}).error
  setPreview({id:start.id,x,y,error});onStatus?.(error?`Invalid placement: ${error}`:`Valid placement · Column ${x+1}, row ${y+1}. Release to place.`)
 }
 function cancel(){drag.current=null;setPreview(null);onStatus?.('Placement cancelled. Original position kept.')}
 function up(e: PointerEvent<HTMLCanvasElement>) {
  const start=drag.current
  drag.current=null;setPreview(null)
  if(!start||disabled)return
  const point=tile(e)
  if(point.x!==start.x||point.y!==start.y)onMove?.(start.id,start.column+point.x-start.x,start.row+point.y-start.y)
 }
 function key(e: KeyboardEvent<HTMLCanvasElement>) {
  if(e.key==='Escape'){e.preventDefault();cancel();return}
  if(!editing||disabled||!current)return
  const offsets:Record<string,[number,number]>={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0]}
  const offset=offsets[e.key]
  if(offset){e.preventDefault();onMove?.(current.id,current.x+offset[0],current.y+offset[1])}
 }
 return <canvas ref={canvas} className={`hall-pixel-canvas ${editing ? 'is-editing' : ''}`} width={HALL.width} height={HALL.height} role="img" aria-label={editing ? 'Editable hall. Drag a component, or select one and use arrow keys. Position fields are also available.' : `${layout.theme} pixel-art hall with three entrances and ${layout.pieces.length} independently arranged components.`} tabIndex={editing?0:undefined} onPointerDown={down} onPointerMove={moving} onPointerUp={up} onPointerCancel={cancel} onLostPointerCapture={()=>{if(drag.current)cancel()}} onKeyDown={key} />
}

import { useEffect, useRef, type KeyboardEvent, type PointerEvent } from 'react'
import { drawHall, hallFootprint } from './hall-art'
import { HALL, type HallLayout } from './hall-layout'

type Props = { layout: HallLayout; selected?: string; editing?: boolean; onSelect?: (id: string) => void; onMove?: (id: string, x: number, y: number) => void }
export function HallCanvas({ layout, selected, editing = false, onSelect, onMove }: Props) {
 const canvas = useRef<HTMLCanvasElement>(null)
 const drag = useRef<{ id: string; x: number; y: number; column: number; row: number } | null>(null)
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
 }, [layout, current, editing])
 function tile(e: PointerEvent<HTMLCanvasElement>) {
  const rect=e.currentTarget.getBoundingClientRect()
  return { x: Math.floor((e.clientX-rect.left)/rect.width*HALL.columns), y: Math.floor((e.clientY-rect.top)/rect.height*HALL.rows) }
 }
 function down(e: PointerEvent<HTMLCanvasElement>) {
  if(!editing)return
  const point=tile(e)
  const piece=[...layout.pieces].reverse().find(p=>{const item=hallFootprint(p.kind);return point.x>=p.x&&point.x<p.x+item.width&&point.y>=p.y&&point.y<p.y+item.height})
  if(piece){onSelect?.(piece.id);drag.current={id:piece.id,x:point.x,y:point.y,column:piece.x,row:piece.y};e.currentTarget.setPointerCapture(e.pointerId)}
  else if(selected)onMove?.(selected,point.x,point.y)
 }
 function up(e: PointerEvent<HTMLCanvasElement>) {
  const start=drag.current
  drag.current=null
  if(!start)return
  const point=tile(e)
  if(point.x!==start.x||point.y!==start.y)onMove?.(start.id,start.column+point.x-start.x,start.row+point.y-start.y)
 }
 function key(e: KeyboardEvent<HTMLCanvasElement>) {
  if(!editing||!current)return
  const offsets:Record<string,[number,number]>={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0]}
  const offset=offsets[e.key]
  if(offset){e.preventDefault();onMove?.(current.id,current.x+offset[0],current.y+offset[1])}
 }
 return <canvas ref={canvas} className={`hall-pixel-canvas ${editing ? 'is-editing' : ''}`} width={HALL.width} height={HALL.height} role="img" aria-label={editing ? 'Editable hall. Drag a component, or select one and use arrow keys. Position fields are also available.' : `${layout.theme} pixel-art hall with three entrances and ${layout.pieces.length} independently arranged components.`} tabIndex={editing?0:undefined} onPointerDown={down} onPointerUp={up} onPointerCancel={()=>{drag.current=null}} onKeyDown={key} />
}

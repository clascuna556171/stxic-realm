import type { Appearance } from '../appearance'
import { furniturePixels } from './art'
import { OBJECTS } from './room'

export function FurnitureThumbnail({ id, mood='cozy' }: { id:string; mood?:Appearance['mood'] }) {
 const item=OBJECTS.find(o=>o.id===id)
 if(!item)return null
 return <svg viewBox={`-4 -26 ${item.width*32+8} ${item.height*32+34}`} shapeRendering="crispEdges" aria-hidden="true">{furniturePixels(id,mood).map((p,i)=><rect key={i} x={p.x} y={p.y} width={p.w} height={p.h} fill={p.color}/>)}</svg>
}

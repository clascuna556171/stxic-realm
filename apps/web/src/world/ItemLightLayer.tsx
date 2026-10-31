import type {HallLayout} from './hall-layout'
export function ItemLightLayer({layout,lights}:{layout:HallLayout;lights:Record<string,boolean>}){
 return <div className="item-light-layer" aria-hidden="true">{layout.pieces.filter(p=>['lantern','floor-lamp','hearth'].includes(p.kind)&&lights[p.id]!==false).map(p=><i key={p.id} style={{left:`${(p.x+.5)/24*100}%`,top:`${(p.y+.5)/16*100}%`}}/>)}</div>
}

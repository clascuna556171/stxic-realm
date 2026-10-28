import { composedRoomPixels } from './art'
import { OBJECTS } from './room'
import { characterPixels } from '../character'
import { defaults } from '../appearance'
export function RoomArtwork() {
 return <svg className="room-artwork" viewBox="0 0 512 384" shapeRendering="crispEdges" role="img" aria-label="Original pixel room with oak floors, a city window, a project desk and a reading corner">{composedRoomPixels('cozy',OBJECTS).map((p,i)=><rect key={i} x={p.x} y={p.y} width={p.w} height={p.h} fill={p.color}/>)}<g transform="translate(252 268) scale(.65)">{characterPixels(defaults).map((p,i)=><rect key={i} x={p.x} y={p.y} width={p.w} height={p.h} fill={p.color}/>)}</g></svg>
}

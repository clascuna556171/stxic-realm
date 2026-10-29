import { composedRoomPixels } from './art'
import { useId } from 'react'
import { roomLighting } from './lighting'
import { OBJECTS } from './room'
import { characterPixels } from '../character'
import { defaults, hairs, skins } from '../appearance'

const deskCompanion = {
 ...defaults,
 skin: skins[0],
 hair: hairs[0],
 hairStyle: 'short' as const,
 outfit: 'tech' as const,
 accessory: 'headphones' as const,
 eyes: 'blue' as const,
}

export function RoomArtwork() {
 const id = useId()
 const lights = roomLighting('cozy', OBJECTS)
 return (
  <svg
   className="room-artwork"
   viewBox="0 0 512 384"
   shapeRendering="crispEdges"
   role="img"
   aria-label="Original pixel room with oak floors, a city window, a project desk and a reading corner"
  >
   <defs>{lights.map((light, i) => <radialGradient key={i} id={id+'-light-'+i}><stop offset="0%" stopColor={light.color} stopOpacity={light.strength}/><stop offset="100%" stopColor={light.color} stopOpacity="0"/></radialGradient>)}</defs>
   {composedRoomPixels('cozy', OBJECTS).map((p, i) => (
    <rect key={i} x={p.x} y={p.y} width={p.w} height={p.h} fill={p.color} />
   ))}
   {lights.map((light,i)=><ellipse key={i} cx={light.x} cy={light.y} rx={light.rx} ry={light.ry} fill={'url(#'+id+'-light-'+i+')'}/>)}
   {/* Companion character at desk */}
   <g transform="translate(96 76) scale(.62)">
    {characterPixels(deskCompanion).map((p, i) => (
     <rect key={`c1-${i}`} x={p.x} y={p.y} width={p.w} height={p.h} fill={p.color} />
    ))}
   </g>
   {/* Main character near sofa & orbital portal */}
   <g transform="translate(248 258) scale(.66)">
    {characterPixels(defaults).map((p, i) => (
     <rect key={`c2-${i}`} x={p.x} y={p.y} width={p.w} height={p.h} fill={p.color} />
    ))}
   </g>
  </svg>
 )
}

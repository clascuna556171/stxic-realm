import { composedRoomPixels } from './art'
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
 return (
  <svg
   className="room-artwork"
   viewBox="0 0 512 384"
   shapeRendering="crispEdges"
   role="img"
   aria-label="Original pixel room with oak floors, a city window, a project desk and a reading corner"
  >
   <defs>
    <radialGradient id="realm-glow-amber" cx="50%" cy="50%" r="50%">
     <stop offset="0%" stopColor="#ffe49e" stopOpacity="0.34" />
     <stop offset="60%" stopColor="#f6ad55" stopOpacity="0.12" />
     <stop offset="100%" stopColor="#f6ad55" stopOpacity="0" />
    </radialGradient>
    <radialGradient id="realm-glow-portal" cx="50%" cy="50%" r="50%">
     <stop offset="0%" stopColor="#c4b5fd" stopOpacity="0.42" />
     <stop offset="55%" stopColor="#8b5cf6" stopOpacity="0.18" />
     <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
    </radialGradient>
    <radialGradient id="realm-glow-screen" cx="50%" cy="50%" r="50%">
     <stop offset="0%" stopColor="#5ce6dc" stopOpacity="0.25" />
     <stop offset="100%" stopColor="#5ce6dc" stopOpacity="0" />
    </radialGradient>
   </defs>
   {composedRoomPixels('cozy', OBJECTS).map((p, i) => (
    <rect key={i} x={p.x} y={p.y} width={p.w} height={p.h} fill={p.color} />
   ))}
   {/* Atmospheric lighting halos */}
   <ellipse cx="244" cy="68" rx="76" ry="38" fill="url(#realm-glow-amber)" />
   <ellipse cx="116" cy="78" rx="48" ry="28" fill="url(#realm-glow-screen)" />
   <ellipse cx="80" cy="166" rx="38" ry="32" fill="url(#realm-glow-amber)" />
   <ellipse cx="240" cy="112" rx="36" ry="30" fill="url(#realm-glow-amber)" />
   <ellipse cx="294" cy="260" rx="44" ry="32" fill="url(#realm-glow-portal)" />
   <ellipse cx="202" cy="344" rx="26" ry="22" fill="url(#realm-glow-amber)" />
   <ellipse cx="310" cy="344" rx="26" ry="22" fill="url(#realm-glow-amber)" />
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
   {/* Interactive callout tags inspired by room reference */}
   <g transform="translate(124 236)">
    <rect x="0" y="0" width="52" height="14" rx="3" fill="#181724" stroke="#6c648b" strokeWidth="1" />
    <text x="26" y="10" textAnchor="middle" fill="#ececf4" fontSize="7.5" fontFamily="Inter, Segoe UI, sans-serif" fontWeight="600">
     Guestbook
    </text>
   </g>
   <g transform="translate(274 216)">
    <rect x="0" y="0" width="40" height="15" rx="3" fill="#181724" stroke="#a78bfa" strokeWidth="1" />
    <text x="20" y="10.5" textAnchor="middle" fill="#f3e8ff" fontSize="8" fontFamily="Inter, Segoe UI, sans-serif" fontWeight="600">
     Chat
    </text>
    <path d="M17 18 L23 18 L20 22 Z" fill="#c4b5fd" />
   </g>
  </svg>
 )
}

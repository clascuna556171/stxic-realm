import type { Appearance } from '../appearance'
import { worldPalettes } from './palette'

// A small room in the same architectural vocabulary as the great hall.
// Grid-aligned masonry keeps the stage compatible with the 48 × 64 sprite.
export function CharacterAlcove({ mood }: { mood: Appearance['mood'] }) {
 const palette = worldPalettes[mood]
 const stone = palette.wall
 const trim = palette.trim
 const cloth = palette.cloth[1]
 const light = palette.glow
 return <svg className="stage-backdrop alcove-backdrop" viewBox="0 0 96 128" preserveAspectRatio="xMidYMax slice" shapeRendering="crispEdges" aria-hidden="true">
  <rect width="96" height="128" fill="#202925" />
  {Array.from({ length: 10 }, (_, row) => Array.from({ length: 5 }, (_, col) => <g key={`${row}-${col}`}><rect x={col * 24 - (row % 2) * 12} y={row * 10} width="23" height="9" fill={stone[(row + col * 2) % 3]} /><rect x={col * 24 - (row % 2) * 12 + 2} y={row * 10} width="19" height="1" fill={trim} opacity=".18" /></g>))}
  <path d="M17 98V38h4V27h7V18h9v-5h22v5h9v9h7v11h4v60Z" fill="#1b211f" />
  <path d="M20 97V39h4V29h7v-8h9v-5h16v5h9v8h7v10h4v58Z" fill={trim} />
  <path d="M25 98V41h4V31h7v-8h24v8h7v10h4v57Z" fill="#252d29" />
  <path d="M32 94V43h4V33h24v10h4v51Z" fill="#1a2422" />
  <path d="M36 35h24v48l-12 7-12-7Z" fill={cloth} />
  <path d="M38 38h20v43l-10 6-10-6Z" fill="none" stroke="#c3a774" />
  <path d="M47 46h2v10h7v2h-7v15h-2V58h-7v-2h7Z" fill="#d4b884" />
  <path d="M10 0h6v104h-6ZM80 0h6v104h-6Z" fill="#39362b" />
  <path d="M10 0h2v100h-2ZM80 0h2v100h-2Z" fill="#7c6a4c" />
  <path d="M0 96h96v32H0Z" fill="#36372d" />
  {Array.from({ length: 4 }, (_, row) => <g key={row}><path d={`M0 ${98 + row * 8}h96`} stroke="#5e5a45" /><path d={`M${row % 2 ? 16 : 32} ${98 + row * 8}v8m32-8v8`} stroke="#252b25" /></g>)}
  <path d="M31 100h34l10 28H21Z" fill={cloth} /><path d="m34 102-8 26m36-26 8 26" stroke="#baa075" />
  <path d="M5 48h15v2H5Zm71 0h15v2H76ZM9 51h8v13H9Zm70 0h8v13h-8Z" fill="#1b221d" />
  <path d="M11 52h4v9h-4Zm70 0h4v9h-4Z" fill={light} /><path d="M12 50h2v8h-2Zm70 0h2v8h-2Z" fill="#fff2ca" />
  <path d="M2 80h5v17H2Zm87-5h5v22h-5Z" fill="#334c37" /><path d="M1 85h8v4H1Zm86-5h9v4h-9Z" fill="#66805a" />
  <path d="M0 94h9v7H0Zm87 0h9v7h-9Z" fill="#897052" />
 </svg>
}

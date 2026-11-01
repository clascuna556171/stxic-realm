import {useId, type CSSProperties} from 'react'
import type {FrameCollection, FrameShape} from './profile-frames'

// The energy follows the artwork's own silhouette. Its center is always empty.
export function FrameEffects({frame, shape}: {frame: FrameCollection; shape: FrameShape}) {
 const glow = `frame-glow-${useId().replace(/:/g, '')}`
 const contour = shape === 'circle'
  ? 'M128 27a101 101 0 1 1 0 202a101 101 0 1 1 0 -202Z'
  : shape === 'square' ? 'M28 28H228V228H28Z'
  : 'M63 28H193Q228 28 228 63V193Q228 228 193 228H63Q28 228 28 193V63Q28 28 63 28Z'
 const anchors = shape === 'circle'
  ? [[57,57], [128,27], [199,57], [229,128], [199,199], [128,229], [57,199], [27,128]]
  : [[33,33], [128,27], [223,33], [229,128], [223,223], [128,229], [33,223], [27,128]]
 const colors = {ember:'#ff5761', glimmer:'#ffe2a0', firefly:'#a8ffe0', pulse:'#69f4ff', sparkle:'#fffdf0', twinkle:'#ffc2df', celestial:'#ffd875'}
 return <span className={`profile-frame-effect effect-${frame.effect}`} aria-hidden="true" style={{'--effect-color':colors[frame.effect], '--effect-secondary':frame.palette[1]} as CSSProperties}>
  <svg className="frame-energy" viewBox="0 0 256 256" fill="none" focusable="false">
   <defs><filter id={glow} x="-60%" y="-60%" width="220%" height="220%" colorInterpolationFilters="sRGB"><feGaussianBlur stdDeviation="2.2"/></filter></defs>
   <g className="frame-energy-halo" filter={`url(#${glow})`}><path d={contour} pathLength={100}/></g>
   <path className="frame-energy-track" d={contour} pathLength={100}/>
   <path className="frame-energy-chase" d={contour} pathLength={100}/>
   <path className="frame-energy-echo" d={contour} pathLength={100}/>
   <g className="frame-spectacle">{anchors.map(([x,y],i)=>{
    const angle=Math.atan2(y-128,x-128)*180/Math.PI+90
    const style={'--piece-delay':`${-i*.37}s`,'--piece-turn':`${i%2?12:-12}deg`} as CSSProperties
    return <g key={i} transform={`translate(${x} ${y}) rotate(${angle})`}>
     {frame.effect==='ember' && <g className="spectacle-flame" style={style}>
      <path className="flame-smoke" d="M-12 5C-31 -10 -9 -24 -16 -38C8 -23 -5 -19 9 -29C5 -12 26 -6 12 5Z"/>
      <path className="flame-outer" d="M-11 4C-25 -8 -8 -19 -12 -31C-2 -26 0 -19 0 -13C7 -18 12 -22 12 -27C22 -12 22 -1 10 5Z"/>
      <path className="flame-inner" d="M-5 5C-15 -4 -2 -13 -3 -20C5 -16 2 -10 8 -13C15 -4 10 3 5 6Z"/>
     </g>}
     {frame.effect==='glimmer' && <g className="spectacle-regalia" style={style}>
      <path className="regalia-ribbon" d="M-17 5Q-27 -9 -14 -20Q-23 -8 -6 -8M17 5Q27 -9 14 -20Q23 -8 6 -8"/>
      <path className="regalia-star" d="M0 -30L4 -17 17 -13 4 -9 0 4 -4 -9 -17 -13 -4 -17Z"/>
      <path className="regalia-crystal" d="M0 -20L5 -13 0 -6 -5 -13Z"/>
     </g>}
     {frame.effect==='pulse' && <g className="spectacle-lightning" style={style}>
      <path className="lightning-halo" d="M-22 5L-15 -11 -8 -6 0 -27 7 -13 14 -18 24 -2"/>
      <path className="lightning-core" d="M-22 5L-15 -11 -8 -6 0 -27 7 -13 14 -18 24 -2M0 -27L-3 -39M14 -18L24 -27"/>
      <path className="lightning-shard" d="M-22 -18L-15 -29 -12 -19ZM21 -10L30 -19 31 -7Z"/>
     </g>}
     {frame.effect==='sparkle' && i%2===0 && <g className="spectacle-ink" style={style}>
      <path className="ink-comet" d="M-19 -11H-6M6 -11H19M0 -31V-18M0 -4V9"/>
      <path className="ink-star" d="M0 -26L3 -14 15 -11 3 -8 0 4 -3 -8 -15 -11 -3 -14Z"/>
      <path className="ink-satellite" d="M15 -27L18 -21 24 -18 18 -15 15 -9 12 -15 6 -18 12 -21Z"/>
     </g>}
     {frame.effect==='twinkle' && <g className="spectacle-sweets" style={style}>
      {i%2===0 ? <><path className="sweet-string" d="M0 5Q-10 -9 0 -23"/><path className="sweet-heart" d="M0 -13L-11 -23C-25 -38 -6 -46 0 -33C6 -46 25 -38 11 -23Z"/></> : <path className="sweet-star" d="M0 -35L5 -23 18 -21 8 -12 10 1 0 -6 -10 1 -8 -12 -18 -21 -5 -23Z"/>}
     </g>}
     {frame.effect==='celestial' && <g className="spectacle-celestial" style={style}>
      <path className="celestial-ray" d="M0 -30L0 10M-20 -10L20 -10"/>
      <path className="celestial-star" d="M0 -24L4 -14 14 -10 4 -6 0 4 -4 -6 -14 -10 -4 -14Z"/>
      <circle className="celestial-core" r="2.5" cy="-10"/>
     </g>}
    </g>
   })}</g>
   {frame.effect==='firefly' && <g className="frame-woodland-life">{[[32,79,-24],[224,169,22],[195,30,12]].map(([x,y,turn],i)=><g key={i} transform={`translate(${x} ${y}) rotate(${turn})`}><g className="spectacle-butterfly" style={{'--piece-delay':`${-i*1.1}s`} as CSSProperties}>
    <g className="butterfly-wing butterfly-left"><path d="M0 0C-12 -32 -36 -30 -27 -10C-39 6 -20 24 0 0Z"/><path className="wing-inlay" d="M-5 -1Q-24 -24 -24 -13Q-16 -9 -5 -1M-5 2Q-25 11 -22 3"/></g>
    <g className="butterfly-wing butterfly-right"><path d="M0 0C12 -32 36 -30 27 -10C39 6 20 24 0 0Z"/><path className="wing-inlay" d="M5 -1Q24 -24 24 -13Q16 -9 5 -1M5 2Q25 11 22 3"/></g>
    <path className="butterfly-body" d="M0 -11V10M0 -8L-5 -15M0 -8L5 -15"/>
   </g></g>)}</g>}
   {frame.effect==='twinkle' && <g className="frame-cozy-companions">
    <g transform="translate(31 180)"><g className="cozy-bunny"><path className="companion-body" d="M-13 0Q-24 -29 -14 -31Q-5 -33 -4 -6H4Q5 -33 14 -31Q24 -29 13 0Q26 7 19 21Q1 36 -19 21Q-26 7 -13 0Z"/><path className="companion-inner" d="M-14 -24L-8 -7M14 -24L8 -7"/><path className="companion-face" d="M-8 10V14M8 10V14M-3 18L0 20 3 18"/><path className="companion-cheek" d="M-14 17H-10M10 17H14"/></g></g>
    <g transform="translate(223 73)"><g className="cozy-cat"><path className="companion-body" d="M-20 3V-20L-8 -12Q0 -16 8 -12L20 -20V3Q25 25 0 26Q-25 25 -20 3Z"/><path className="companion-inner" d="M-15 -13L-11 -10M15 -13L11 -10"/><path className="companion-face" d="M-9 1V6M5 3L10 6 14 3M-3 12L0 15 3 12M0 15V18"/><path className="companion-cheek" d="M-17 12H-11M11 12H17"/></g></g>
   </g>}
   {frame.effect==='celestial' && <g className="frame-celestial-cosmos">
    <g transform="translate(128 128) rotate(-26)">
     <ellipse cx="0" cy="0" rx="122" ry="46" className="celestial-orbital-ring"/>
     <ellipse cx="0" cy="0" rx="126" ry="48" className="celestial-orbital-ring-outer"/>
    </g>
    <g transform="translate(128 230)" className="celestial-shield-burst">
     <path d="M0 -9V9M-9 0H9M-6 -6L6 6M-6 6L6 -6" className="shield-burst-star"/>
    </g>
   </g>}
   <g className="frame-edge-details">{anchors.filter((_,i)=>i%2===0).map(([x,y],i)=><g key={i} transform={`translate(${x} ${y}) rotate(${i*90+45})`}><path d="M-9 0H-4M4 0H9M0 -9V-4M0 4V9"/><path d="M-2 0L0 -2 2 0 0 2Z"/></g>)}</g>
   <g className="frame-motes">{anchors.map(([x,y],i)=>{
    const dx=(x-128)*.13,dy=(y-128)*.13
    const style={'--mote-delay':`${-i*.63}s`, '--drift-x':`${dx}px`, '--drift-y':`${dy-6}px`, '--mote-turn':`${i%2?18:-18}deg`} as CSSProperties
    return <g key={i} transform={`translate(${x} ${y})`}><g className="frame-mote" style={style}>
     {frame.effect==='twinkle' ? (i%2===0 ? <path className="mote-charm" d="M0 6L-6 0C-12 -7 -3 -12 0 -5C3 -12 12 -7 6 0Z"/> : <path className="mote-charm" d="M0 -8L2 -2 8 0 2 2 0 8 -2 2 -8 0 -2 -2Z"/>)
      : frame.effect==='ember' ? <><path className="mote-trail" d="M0 0L-2 9"/><path className="mote-core" d="M0 -4L2 0 0 4 -2 0Z"/></>
      : frame.effect==='pulse' ? <><path className="mote-trail" d="M-7 4V-4H4"/><rect className="mote-core" x={-2} y={-2} width={4} height={4}/></>
      : frame.effect==='celestial' ? <><circle className="mote-aura" r={5}/><path className="mote-star" d="M0 -9V9M-9 0H9"/><polygon className="mote-core" points="0,-4 3,0 0,4 -3,0"/></>
      : <><circle className="mote-aura" r={frame.effect==='firefly'?6:4}/><path className="mote-star" d="M0 -7V7M-7 0H7"/><circle className="mote-core" r={2}/></>}
    </g></g>
   })}</g>
   <g className="frame-jewel-glint" transform={frame.effect === 'celestial' ? 'translate(128 12)' : 'translate(128 23)'}><path d="M0 -10V10M-7 0H7"/><path d="M-4 -4L4 4M4 -4L-4 4"/></g>
  </svg>
 </span>
}

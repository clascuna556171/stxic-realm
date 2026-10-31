import {useEffect, useRef, useState, type CSSProperties} from 'react'
import {ProfileImage} from './ProfileImage'
import {FrameEffects} from './FrameEffects'
import {frameShape as normalizeShape, getFrame, type FrameShape} from './profile-frames'
import './profile-frames.css'

type Props = {avatarSrc?: string | null; frameId?: string; frameShape?: FrameShape | string; size?: number; showEffects?: boolean; className?: string; label?: string; initials?: string; focusX?: number; focusY?: number}
export function ProfileFrame({avatarSrc, frameId = 'none', frameShape = 'circle', size, showEffects = false, className = '', label = 'Account photo', initials = 'R', focusX = 50, focusY = 50}: Props) {
 const shape = normalizeShape(frameShape), frame = getFrame(frameId), asset = frame?.assets[shape]
 const [failedAsset, setFailedAsset] = useState(''), [failedPhoto, setFailedPhoto] = useState('')
 const decorated = !!asset && failedAsset !== asset
 const effects = decorated && showEffects && (!size || size >= 64)
 const element = useRef<HTMLSpanElement>(null), [running,setRunning] = useState(false)
 useEffect(()=>{
  if(!effects || !element.current){setRunning(false);return}
  let visible=false
  const reconcile=()=>setRunning(visible&&!document.hidden)
  const observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;reconcile()})
  observer.observe(element.current)
  document.addEventListener('visibilitychange',reconcile)
  return()=>{observer.disconnect();document.removeEventListener('visibilitychange',reconcile)}
 },[effects,asset])
 const vars = {...(size ? {width: size, height: size} : {})} as CSSProperties
 return <span ref={element} className={`profile-frame ${decorated ? 'is-framed' : ''} ${effects ? 'has-effects' : ''} ${className}`} style={vars} data-shape={shape} data-frame={frame?.id ?? 'none'} data-motion={running?'running':'paused'} role="img" aria-label={label}>
  <span className="profile-frame-photo" aria-hidden="true">
   <span className="profile-frame-initials">{initials}</span>
   {avatarSrc && failedPhoto !== avatarSrc && <ProfileImage src={avatarSrc} alt={label} style={{objectPosition: `${focusX}% ${focusY}%`}} onError={() => setFailedPhoto(avatarSrc)}/>}
  </span>
  {decorated && <img className="profile-frame-art" src={asset} alt="" aria-hidden="true" draggable={false} onError={() => setFailedAsset(asset)}/>}
  {effects && frame && <FrameEffects frame={frame} shape={shape}/>}
 </span>
}

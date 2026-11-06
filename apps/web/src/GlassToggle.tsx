import {useEffect, useId, useState} from 'react'
import {applyGlass, getGlassEnabled, GLASS_STORAGE_KEY} from './theme'
import {Icon} from './Icon'

export function GlassToggle({showIcon = false}: {showIcon?: boolean}) {
 const [enabled, setEnabled] = useState(() => getGlassEnabled())
 const description = useId()
 useEffect(() => {
  const update = () => setEnabled(document.documentElement.dataset.glass === 'true')
  const sync = (event: StorageEvent) => {
   if (event.key === GLASS_STORAGE_KEY || event.key === null) applyGlass(getGlassEnabled())
  }
  window.addEventListener('realm:glass-change', update)
  window.addEventListener('storage', sync)
  return () => {
   window.removeEventListener('realm:glass-change', update)
   window.removeEventListener('storage', sync)
  }
 }, [])
 return <div className="glass-setting">
  {showIcon && <Icon name="sparkle"/>}
  <div className="glass-setting-info">
   <strong>Glass appearance</strong>
   <p id={description}>Make the whole window translucent over a softly lit backdrop. Saves on this device. Reduced transparency uses solid tinted panels.</p>
  </div>
  <button type="button" role="switch" aria-checked={enabled} aria-label="Glass appearance" aria-describedby={description} className="glass-switch" onClick={() => applyGlass(!enabled)}>
   <span aria-hidden="true" className="glass-switch-track"><span/></span>
   <span aria-hidden="true">{enabled ? 'On' : 'Off'}</span>
  </button>
 </div>
}

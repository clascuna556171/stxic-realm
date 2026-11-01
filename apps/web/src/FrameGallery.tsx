import type {CSSProperties} from 'react'
import {ProfileFrame} from './ProfileFrame'
import {frameCatalog, frameSelection, frameShapes, getFrame} from './profile-frames'
import type {ProfileStyle} from './profile-model'

export function FrameGallery({style, savedStyle, avatarSrc, name, onChange, saveBlocked = false, isFounder = false}: {style: ProfileStyle; savedStyle: ProfileStyle; avatarSrc?: string; name: string; onChange: (patch: Partial<ProfileStyle>) => void; saveBlocked?: boolean; isFounder?: boolean}) {
 const selection = frameSelection(style), saved = frameSelection(savedStyle), selected = getFrame(selection.frameId)
 const initials = name.trim().slice(0, 2).toUpperCase() || 'R'
 const changed = selection.frameId !== saved.frameId || selection.frameShape !== saved.frameShape || selection.showEffects !== saved.showEffects
 const photo = {avatarSrc, initials, focusX: style.avatar_x, focusY: style.avatar_y}
 const visibleCatalog = frameCatalog.filter(frame => frame.available && (!frame.founderOnly || isFounder))
 return <section className="frame-workshop" aria-label="Profile frame collection">
  <div className="frame-workshop-heading"><h3>Find your frame.</h3><p>{isFounder ? 'Seven collections. Three silhouettes. Crowned in sovereignty.' : 'Six collections. Three silhouettes. A little more you.'}</p></div>
  <div className="frame-fitting">
   <ProfileFrame {...photo} {...selection} size={156} label={`Preview: ${selected?.name ?? 'No frame'}`}/>
   <div className="frame-fitting-copy"><strong>{selected?.name ?? 'Unframed'}</strong><p>{selected?.material ?? 'Your photo, just as it is.'}</p><span role="status">{changed ? 'Preview · not saved yet' : 'Currently equipped'}</span></div>
  </div>
  <fieldset className="frame-shape-selector"><legend>Frame shape</legend><div>{frameShapes.map(shape => <label key={shape}><input type="radio" name="frame-shape" value={shape} checked={selection.frameShape === shape} onChange={() => onChange({avatar_shape: shape === 'rounded-square' ? 'rounded' : shape})}/><span className="frame-shape-icon" data-shape={shape} aria-hidden="true"/>{shape === 'circle' ? 'Circle' : shape === 'rounded-square' ? 'Rounded square' : 'Square'}</label>)}</div></fieldset>
  <div className="frame-gallery" role="group" aria-label="Choose a frame collection">
   {visibleCatalog.map(frame => <button type="button" key={frame.id} className="frame-collection" aria-pressed={selection.frameId === frame.id} aria-label={`Select ${frame.name}`} style={{'--collection-color': frame.palette[0]} as CSSProperties} onClick={() => onChange({frame_id: frame.id})}>
    <span className="frame-collection-art"><ProfileFrame {...photo} frameId={frame.id} frameShape={selection.frameShape} size={100} showEffects={selection.showEffects} label={frame.name}/><span className="frame-material-swatches" aria-hidden="true">{frame.palette.map(color => <i key={color} style={{background: color}}/>)}</span></span>
    <span className="frame-collection-title">{frame.name}{frame.founderOnly && <small className="frame-founder-badge">Founder Only</small>}{saved.frameId === frame.id && <small>Equipped</small>}</span><span className="frame-collection-description">{frame.description}</span>
   </button>)}
  </div>
  <div className="frame-workshop-options"><button type="button" className="frame-none" aria-pressed={selection.frameId === 'none'} onClick={() => onChange({frame_id: 'none'})}>No frame</button><label><input type="checkbox" checked={selection.showEffects} disabled={!selected} onChange={e => onChange({frame_effects: e.target.checked})}/>Animated effects</label></div>
  <div className="frame-fit-check" aria-label="Small avatar previews"><span>Looks good in conversation, too.</span><div>{[32, 48, 64].map(size => <ProfileFrame key={size} {...photo} {...selection} size={size} showEffects={false} label={`${size} pixel preview`}/>)}</div></div>
  <div className="frame-workshop-footer"><p>{saveBlocked ? 'Reload the newer profile before equipping a frame.' : 'Saving equips your frame and saves your other profile edits.'}</p><div><button type="submit" className="primary" disabled={!changed || saveBlocked}>Save profile & equip</button><button type="button" disabled={!changed} onClick={() => onChange({frame_id: saved.frameId, avatar_shape: saved.frameShape === 'rounded-square' ? 'rounded' : saved.frameShape, frame_effects: saved.showEffects})}>Reset frame changes</button></div></div>
 </section>
}

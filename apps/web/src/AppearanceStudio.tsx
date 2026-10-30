import { useEffect, useState } from 'react'
import {
 APPEARANCE_KEY,
 accents,
 accessories,
 applyAppearance,
 eyeColors,
 hairs,
 hairStyles,
 moods,
 outfits,
 readAppearance,
 skins,
 type Appearance,
} from './appearance'
import { CHARACTER_HEIGHT, CHARACTER_WIDTH, characterPixels } from './character'
import type { Direction } from './world/room'
import { WorkspaceNav } from './WorkspaceNav'
import { Icon } from './Icon'
import { CharacterAlcove } from './world/CharacterAlcove'
import { useAccount } from './Account'
import { appearanceFor, errorText } from './account-repository'

export function PixelCharacter({ value, portrait = false, direction='down', frame=0 }: { value: Appearance; portrait?: boolean; direction?: Direction; frame?: number }) {
 return (
  <svg
   className={portrait ? 'pixel-portrait' : 'pixel-character'}
   viewBox={portrait ? '5 1 38 38' : `0 0 ${CHARACTER_WIDTH} ${CHARACTER_HEIGHT}`}
   shapeRendering="crispEdges"
   role="img"
   aria-label={`${value.hairStyle} hair, ${value.outfit} outfit, ${value.accessory} accessory character preview`}
  >
   {characterPixels(value,direction,frame).map((p, i) => (
    <rect key={i} x={p.x} y={p.y} width={p.w} height={p.h} fill={p.color} />
   ))}
  </svg>
 )
}

const starters: { name: string; bg: string; look: Partial<Appearance> }[] = [
 { name: 'After hours', bg: '#4e4266', look: { skin: skins[1], hair: hairs[0], hairStyle: 'swept', outfit: 'everyday', accessory: 'glasses', eyes: 'dark' } },
 { name: 'The reader', bg: '#4c594e', look: { skin: skins[3], hair: hairs[1], hairStyle: 'curly', outfit: 'medieval', accessory: 'none', eyes: 'brown' } },
 { name: 'Daydream', bg: '#48596e', look: { skin: skins[0], hair: hairs[3], hairStyle: 'long', outfit: 'everyday', accessory: 'none', eyes: 'blue' } },
 { name: 'Night shift', bg: '#374c5e', look: { skin: skins[4], hair: hairs[0], hairStyle: 'short', outfit: 'tech', accessory: 'headphones', eyes: 'brown' } },
 { name: 'Field notes', bg: '#614942', look: { skin: skins[2], hair: hairs[2], hairStyle: 'curly', outfit: 'medieval', accessory: 'glasses', eyes: 'green' } },
 { name: 'Silver lining', bg: '#4a4763', look: { skin: skins[1], hair: hairs[4], hairStyle: 'swept', outfit: 'tech', accessory: 'none', eyes: 'blue' } },
 { name: 'Crownwarden', bg: '#634356', look: { skin: skins[0], hair: hairs[2], hairStyle: 'long', outfit: 'medieval', accessory: 'crown', eyes: 'green' } },
 { name: 'Netrunner', bg: '#34545c', look: { skin: skins[2], hair: hairs[4], hairStyle: 'short', outfit: 'tech', accessory: 'glasses', eyes: 'blue' } },
 { name: 'Starlight', bg: '#57466b', look: { skin: skins[3], hair: hairs[3], hairStyle: 'long', outfit: 'medieval', accessory: 'crown', eyes: 'brown' } },
 { name: 'Vanguard', bg: '#5c4d3c', look: { skin: skins[4], hair: hairs[1], hairStyle: 'short', outfit: 'medieval', accessory: 'none', eyes: 'dark' } },
 { name: 'Solstice', bg: '#614652', look: { skin: skins[0], hair: hairs[1], hairStyle: 'curly', outfit: 'everyday', accessory: 'headphones', eyes: 'green' } },
 { name: 'Archivist', bg: '#3f4c63', look: { skin: skins[1], hair: hairs[0], hairStyle: 'long', outfit: 'tech', accessory: 'headphones', eyes: 'dark' } },
]

const outfitLabels: Record<Appearance['outfit'], string> = {
 everyday: 'Everyday jacket',
 medieval: 'Medieval cloak & armor',
 tech: 'Tech cyber gear',
}

const accessoryLabels: Record<Appearance['accessory'], string> = {
 none: 'None',
 glasses: 'Pixel glasses',
 headphones: 'Studio headset',
 crown: 'Royal crown',
}

const moodDescriptions = {
 cozy: 'Warm oak, sunlit window rays, and an inhabited apartment.',
 medieval: 'Hewn castle timber, tapestry banners, and lantern warmth.',
 tech: 'Cool carbon slate, neon telemetry, and a twilight skyline.',
}

export default function AppearanceStudio() {
 const account = useAccount()
 const [saving, setSaving] = useState(false)
 const [value, setValue] = useState(readAppearance)
 const [saved, setSaved] = useState(value)
 const [notice, setNotice] = useState('')
 const [section, setSection] = useState<'character' | 'space'>(new URLSearchParams(location.search).get('section')==='interface'?'space':'character')
 const dirty = JSON.stringify(value) !== JSON.stringify(saved)
 useEffect(()=>{if(new URLSearchParams(location.search).get('section')==='interface'){const frame=requestAnimationFrame(()=>document.getElementById('interface-settings')?.scrollIntoView({block:'start'}));return()=>cancelAnimationFrame(frame)}},[])

 useEffect(() => {
  if (!dirty) return
  const guard = (event: BeforeUnloadEvent) => {
   event.preventDefault()
   event.returnValue = ''
  }
  window.addEventListener('beforeunload', guard)
  return () => window.removeEventListener('beforeunload', guard)
 }, [dirty])

 function update<K extends keyof Appearance>(key: K, next: Appearance[K]) {
  setValue(v => ({ ...v, [key]: next }))
  setNotice('')
 }

 function randomizeCharacter() {
  const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)]
  const outfitKeys = Object.keys(outfits) as Appearance['outfit'][]
  const eyeKeys = Object.keys(eyeColors) as Appearance['eyes'][]
  setValue(v => ({
   ...v,
   skin: pick(skins),
   hair: pick(hairs),
   hairStyle: pick(hairStyles),
   eyes: pick(eyeKeys),
   outfit: pick(outfitKeys),
   accessory: pick(accessories),
  }))
  setNotice('Randomized character look. Save to keep it.')
 }

 async function save() {
  setSaving(true)
  try {
   if (account.session) {
    if (!account.identity) throw new Error('Reload your account before saving.')
    await account.save(account.identity.profile, value)
   } else {
    localStorage.setItem(APPEARANCE_KEY, JSON.stringify(value))
    applyAppearance(value)
   }
   setSaved(value)
   setNotice(account.session ? 'Appearance saved to your account.' : 'Appearance saved on this device.')
  } catch (e) {
   setNotice(errorText(e))
  } finally {
   setSaving(false)
  }
 }

 async function reloadAccount() {
  if (dirty && !confirm('Discard unsaved appearance changes and reload your account?')) return
  setSaving(true)
  try {
   const next = await account.reload()
   if (next) {
    const a = appearanceFor(next)
    setValue(a)
    setSaved(a)
    setNotice('Loaded appearance from your account.')
   }
  } catch (e) {
   setNotice(errorText(e))
  } finally {
   setSaving(false)
  }
 }

 return (
  <main className="appearance-page workspace-page">
   <WorkspaceNav current="appearance" />
   <header className="workspace-header">
    <div>
     <span>Personal space</span>
     <span className="header-divider">/</span>
     <strong>Appearance</strong>
    </div>
    <a href="/?room-preview">
     Back to home <Icon name="arrow" />
    </a>
   </header>
   <div className="appearance-content">
    <div className="appearance-intro">
     <div>
      <h1>A character all your own.</h1>
      <p>Default Realm avatars, layered RPG outfits, and room atmosphere.</p>
     </div>
     <span className="local-label">{account.session ? 'Saved to your account' : 'Device-only preview'}</span>
    </div>
    <div className="appearance-grid">
     <section className="appearance-controls">
      <nav className="editor-tabs" aria-label="Appearance sections">
       <button aria-pressed={section === 'character'} onClick={() => setSection('character')}>
        <Icon name="avatar" />
        Character
       </button>
       <button aria-pressed={section === 'space'} onClick={() => setSection('space')}>
        <Icon name="home" />
        Room & interface
       </button>
      </nav>
      {section === 'character' ? (
       <>
        <div className="control-section">
         <div className="section-title-row">
          <div>
           <h2>Default Avatars</h2>
           <p>A starting set of Realm avatars for everyone. Pick one and customize every detail.</p>
          </div>
          <button type="button" className="GhostButton" onClick={randomizeCharacter}>
           <Icon name="shuffle" /> Randomize
          </button>
         </div>
         <div className="starter-looks">
          {starters.map(({ name, bg, look }) => (
           <button
            key={name}
            aria-label={`Use ${name} starter`}
            aria-pressed={Object.entries(look).every(([k, v]) => value[k as keyof Appearance] === v)}
            onClick={() => {
             setValue(v => ({ ...v, ...look }))
             setNotice('')
            }}
           >
            <div style={{ background: bg }}>
             <PixelCharacter value={{ ...value, ...look }} portrait />
            </div>
            <span>{name}</span>
           </button>
          ))}
         </div>
        </div>
        <div className="detail-controls">
         <fieldset>
          <legend>Skin tone</legend>
          <div className="swatch-row">
           {skins.map((c, i) => (
            <button
             key={c}
             className="swatch"
             style={{ background: c }}
             aria-label={`Skin tone ${i + 1}`}
             aria-pressed={value.skin === c}
             onClick={() => update('skin', c)}
            />
           ))}
          </div>
         </fieldset>
         <fieldset>
          <legend>Hair color</legend>
          <div className="swatch-row">
           {hairs.map((c, i) => (
            <button
             key={c}
             className="swatch"
             style={{ background: c }}
             aria-label={`Hair color ${i + 1}`}
             aria-pressed={value.hair === c}
             onClick={() => update('hair', c)}
            />
           ))}
          </div>
         </fieldset>
         <fieldset>
          <legend>Hairstyle</legend>
          <div className="choice-row">
           {hairStyles.map(x => (
            <button key={x} aria-pressed={value.hairStyle === x} onClick={() => update('hairStyle', x)}>
             {x}
            </button>
           ))}
          </div>
         </fieldset>
         <fieldset>
          <legend>Eye color</legend>
          <div className="choice-row">
           {(Object.keys(eyeColors) as Appearance['eyes'][]).map(x => (
            <button key={x} aria-pressed={value.eyes === x} onClick={() => update('eyes', x)}>
             <i className="choice-dot" style={{ background: eyeColors[x] }} aria-hidden="true" />
             {x}
            </button>
           ))}
          </div>
         </fieldset>
         <fieldset>
          <legend>Clothes, Armor & Tech Gear</legend>
          <div className="choice-row">
           {(Object.keys(outfits) as Appearance['outfit'][]).map(x => (
            <button key={x} aria-pressed={value.outfit === x} onClick={() => update('outfit', x)} title={outfitLabels[x]}>
             <i className="choice-dot" style={{ background: outfits[x] }} aria-hidden="true" />
             {x}
            </button>
           ))}
          </div>
         </fieldset>
         <fieldset>
          <legend>Accessories & Headgear</legend>
          <div className="choice-row">
           {accessories.map(x => (
            <button key={x} aria-pressed={value.accessory === x} onClick={() => update('accessory', x)} title={accessoryLabels[x]}>
             {x}
            </button>
           ))}
          </div>
         </fieldset>
        </div>
       </>
      ) : (
       <div className="space-controls">
        <h2>Room Mood Variations</h2>
        <p>Your room atmosphere updates floors, architecture, and window views independently of the app theme.</p>
        <fieldset>
         <legend>Room mood</legend>
         <div className="mood-choices">
          {moods.map(x => (
           <button key={x} aria-pressed={value.mood === x} onClick={() => update('mood', x)}>
            <span className={`mood-sample ${x}`} aria-hidden="true" />
            <span>
             <strong>{x === 'cozy' ? 'Cozy (Default)' : x === 'medieval' ? 'Medieval Study' : 'Tech Gaming Room'}</strong>
             <small>{moodDescriptions[x]}</small>
            </span>
            {value.mood === x && <Icon name="check" />}
           </button>
          ))}
         </div>
        </fieldset>
        <h2 id="interface-settings">Obsidian, with your accent.</h2>
        <p>The app stays neutral. Colors personalize actions and the orbital R mark.</p>
        <fieldset>
         <legend>Interface accent</legend>
         <div className="color-options">
          {(Object.keys(accents) as Appearance['accent'][]).map(x => (
           <button key={x} aria-pressed={value.accent === x} onClick={() => update('accent', x)}>
            <i style={{ background: accents[x] }} />
            {x}
           </button>
          ))}
         </div>
        </fieldset>
        <label className="logo-select">
         Logo color
         <select value={value.logo} onChange={e => update('logo', e.target.value as Appearance['logo'])}>
          {Object.keys(accents).map(x => (
           <option key={x} value={x}>
            {x}
           </option>
          ))}
         </select>
        </label>
       </div>
      )}
     </section>
     <aside className="appearance-preview">
      <div className="preview-title">
       <h2>Preview</h2>
       <span>{dirty ? 'Unsaved' : 'Saved'}</span>
      </div>
      <div className="character-stage">
       <CharacterAlcove mood={value.mood} />
       <div className="stage-orbit" aria-hidden="true" />
       <PixelCharacter value={value} />
       <span className="stage-caption">
        {outfitLabels[value.outfit]} · {value.hairStyle}
       </span>
      </div>
      <div className="stage-toolbar">
       <button type="button" onClick={randomizeCharacter} title="Randomize character">
        <Icon name="shuffle" /> Randomize
       </button>
       <button
        type="button"
        disabled={!dirty}
        onClick={() => {
         setValue(saved)
         setNotice('Reverted to last saved appearance.')
        }}
       >
        Reset
       </button>
      </div>
      <div className="portrait-comparison">
       <div>
        <PixelCharacter value={value} portrait />
       </div>
       <span>
        <strong>One look. Everywhere.</strong>
        <small>Your portrait and room character match.</small>
       </span>
      </div>
      <button className="primary save-appearance" onClick={() => void save()} disabled={!dirty || saving}>
       <Icon name="check" />
       {saving ? 'Saving…' : 'Save appearance'}
      </button>
      <p className="save-feedback" role="status">
       {notice ||
        (dirty
         ? 'You have unsaved changes.'
         : account.session
           ? 'Your current look is saved to your account.'
           : 'Your current look is saved on this device.')}
      </p>
      <p className="local-disclaimer">
       {account.session
        ? 'Your character is visible to signed-in members. Your interface colors stay private.'
        : 'Local preview. Sign in to save your character across devices.'}
      </p>
      {account.session && (
       <button className="reload-appearance" disabled={saving} onClick={() => void reloadAccount()}>
        Reload from account
       </button>
      )}
     </aside>
    </div>
   </div>
  </main>
 )
}

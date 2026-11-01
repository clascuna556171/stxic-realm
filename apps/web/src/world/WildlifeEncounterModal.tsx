import { useEffect, useRef, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { errorText } from '../account-repository.ts'
import { client } from '../data.ts'
import {
  getPetSpecies,
  RARITY_LABELS,
  validatePetNickname,
  type UserPetsSnapshot,
  type WildlifeEncounter,
} from '../pets/pet-model.ts'
import { bondWildlifePet } from '../pets/pet-repository.ts'
import { PetSprite } from '../pets/PetSprite.tsx'
import '../pets/pets.css'

interface WildlifeEncounterModalProps {
  encounter: WildlifeEncounter
  onClose: () => void
  onBonded: (snapshot: UserPetsSnapshot) => void
}

export function WildlifeEncounterModal({
  encounter,
  onClose,
  onBonded,
}: WildlifeEncounterModalProps) {
  const species = getPetSpecies(encounter.species_id)
  const prompts = species?.bonding_prompts ?? [
    'Approach quietly and offer a calm greeting',
    'Share a gentle token of trust',
    'Welcome the visitor as a companion',
  ]
  const [step, setStep] = useState(0)
  const [nickname, setNickname] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const element = dialog.current
    element?.showModal()
    return () => {
      element?.close()
      queueMicrotask(() => {
        if (previous?.isConnected && !document.querySelector('dialog[open]')) previous.focus()
      })
    }
  }, [])

  const progressPct = Math.min(100, Math.round((step / 3) * 100))

  async function handleAdopt(e: FormEvent) {
    e.preventDefault()
    if (!client || busy || step < 3) return
    const validationErr = validatePetNickname(nickname)
    if (validationErr) {
      setError(validationErr)
      return
    }
    setBusy(true)
    setError('')
    try {
      const next = await bondWildlifePet(client, encounter.id, nickname)
      onBonded(next)
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  return createPortal(
    <dialog
      ref={dialog}
      className="wildlife-encounter-modal"
      aria-modal="true"
      aria-labelledby="wildlife-encounter-title"
      onCancel={e => { e.preventDefault(); if (!busy) onClose() }}
      onKeyDown={e => {
        if (e.key !== 'Tab') return
        const controls = [...e.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),[tabindex="0"]')].filter(el => el.getClientRects().length)
        const first = controls[0], last = controls.at(-1)
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus() }
      }}
      onClick={e => {
        if (e.target !== e.currentTarget || busy) return
        const bounds = e.currentTarget.getBoundingClientRect()
        if (e.clientX < bounds.left || e.clientX > bounds.right || e.clientY < bounds.top || e.clientY > bounds.bottom) onClose()
      }}
    >
      <div className="wildlife-encounter-dialog">
        <div className="pet-panel-header">
          <div>
            <span className={`pet-rarity-badge rarity-${encounter.rarity}`}>
              Wild Visitor · {RARITY_LABELS[encounter.rarity]}
            </span>
            <h3 id="wildlife-encounter-title">A wild {encounter.name} is visiting!</h3>
          </div>
          <button type="button" onClick={onClose} disabled={busy}>
            Close
          </button>
        </div>

        <div className="wildlife-encounter-stage">
          <PetSprite
            speciesId={encounter.species_id}
            state={step >= 3 ? 'happy' : step > 0 ? 'sit' : 'idle'}
            scale={3}
            label={`Wild ${encounter.name}`}
          />
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--realm-muted)' }}>
            {encounter.description}
          </p>
        </div>

        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.78rem',
              marginBottom: '0.35rem',
            }}
          >
            <span>Bonding trust</span>
            <span>{step} / 3</span>
          </div>
          <div className="wildlife-bonding-meter" aria-hidden="true">
            <div className="wildlife-bonding-fill" style={{ transform: `scaleX(${progressPct / 100})` }} />
          </div>
        </div>

        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}

        {step < 3 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
            <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--realm-muted)' }}>
              The {encounter.name} watches you curiously from your room. Complete a gentle bonding action to earn its trust:
            </p>
            <button
              type="button"
              className="primary"
              onClick={() => setStep(s => s + 1)}
            >
              ✦ {prompts[step]}
            </button>
          </div>
        ) : (
          <form onSubmit={handleAdopt} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--realm-text)' }}>
              The {encounter.name} trusts you completely and wishes to stay in your Realm!
            </p>
            <label style={{ fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              Optional nickname (up to 24 characters)
              <input
                type="text"
                maxLength={24}
                placeholder={encounter.name}
                value={nickname}
                onChange={e => setNickname(e.target.value)}
              />
            </label>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button type="button" onClick={onClose} disabled={busy}>
                Wait for later
              </button>
              <button type="submit" className="primary" disabled={busy}>
                {busy ? 'Adopting…' : `Adopt ${encounter.name}`}
              </button>
            </div>
          </form>
        )}
      </div>
    </dialog>, document.body,
  )
}

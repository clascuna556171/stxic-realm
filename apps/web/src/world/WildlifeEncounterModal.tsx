import { useState, type FormEvent } from 'react'
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

  return (
    <div
      className="wildlife-encounter-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wildlife-encounter-title"
      onClick={e => {
        if (e.target === e.currentTarget && !busy) onClose()
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
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#c4c7d8' }}>
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
            <div className="wildlife-bonding-fill" style={{ width: `${progressPct}%` }} />
          </div>
        </div>

        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}

        {step < 3 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
            <p style={{ margin: 0, fontSize: '0.84rem', color: '#aeb2c6' }}>
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
            <p style={{ margin: 0, fontSize: '0.84rem', color: '#b5d99c' }}>
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
    </div>
  )
}

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { errorText, getOwnHome } from '../account-repository.ts'
import { client } from '../data.ts'
import { describeHabitatProgress, evaluateRoomHabitats } from '../world/wildlife-engine.ts'
import {
  getPetSpecies,
  PERSONALITY_DESCRIPTIONS,
  PET_SPECIES_CATALOG,
  petDisplayName,
  RARITY_LABELS,
  validatePetNickname,
  type EquippedPetSummary,
  type OwnedPet,
  type PetAnimationState,
  type PetSpeciesId,
  type UserPetsSnapshot,
} from './pet-model.ts'
import {
  adoptStarterPet,
  equipPets,
  getUserPets,
  updatePetNickname,
} from './pet-repository.ts'
import { PetSprite } from './PetSprite.tsx'
import './pets.css'

interface PetCollectionProps {
  userId: string
  isOwn: boolean
  notifyOnLoad?: boolean
  roomObjects?: ReadonlyArray<{ id: string }>
  onBannerPetChange?: (pet: EquippedPetSummary | null) => void
  onHousePetsChange?: (pets: EquippedPetSummary[]) => void
}

export function PetCollection({
  userId,
  isOwn,
  notifyOnLoad = true,
  roomObjects,
  onBannerPetChange,
  onHousePetsChange,
}: PetCollectionProps) {
  const [snapshot, setSnapshot] = useState<UserPetsSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [subView, setSubView] = useState<'collection' | 'journal'>('collection')

  // Starter adoption state
  const [starterChoice, setStarterChoice] = useState<PetSpeciesId>('cat')
  const [starterNickname, setStarterNickname] = useState('')

  // Selected pet details state
  const [selectedSpeciesId, setSelectedSpeciesId] = useState<PetSpeciesId>('cat')
  const [previewState, setPreviewState] = useState<PetAnimationState>('idle')
  const [nicknameInput, setNicknameInput] = useState('')

  const lifecycle = useRef(0)
  const callbacks = useRef({onBannerPetChange,onHousePetsChange,notifyOnLoad})
  callbacks.current = {onBannerPetChange,onHousePetsChange,notifyOnLoad}
  const [savedObjects,setSavedObjects] = useState<ReadonlyArray<{id:string}> | null>(null)
  const [habitatError,setHabitatError] = useState('')

  const loadPets = useCallback(async () => {
    const ticket = ++lifecycle.current
    setLoading(true)
    setError('')
    try {
      if (!client || !userId) throw new Error('Sign in to load your companions, then try again.')
      const data = await getUserPets(client,userId)
      if (ticket !== lifecycle.current) return
      setSnapshot(data)
      setSelectedSpeciesId(previous => data.owned.some(p=>p.species_id===previous) ? previous : data.owned[0]?.species_id ?? 'cat')
      if (callbacks.current.notifyOnLoad) {
        callbacks.current.onBannerPetChange?.(data.equipment.banner_pet)
        callbacks.current.onHousePetsChange?.(data.equipment.house_pets)
      }
    } catch (e) {
      if (ticket === lifecycle.current) setError(errorText(e))
    } finally {
      if (ticket === lifecycle.current) setLoading(false)
    }
  },[userId])

  useEffect(() => {
    setSnapshot(null); setNotice(''); setBusy(false); setPreviewState('idle')
    void loadPets()
    return () => { lifecycle.current++ }
  },[loadPets])

  useEffect(() => {
    let active=true
    setSavedObjects(null); setHabitatError('')
    if (isOwn && roomObjects === undefined && client) {
      void getOwnHome(client,userId).then(home=>{if(active)setSavedObjects(home.layout.objects)})
        .catch(()=>{if(active)setHabitatError('Saved home habitats could not be loaded. Reopen this view to retry, or check your room in Home Studio.')})
    }
    return()=>{active=false}
  },[userId,isOwn,roomObjects])

  const ownedBySpecies = new Map<PetSpeciesId, OwnedPet>(
    (snapshot?.owned ?? []).map(p => [p.species_id, p]),
  )
  const hasStarter = (snapshot?.owned ?? []).some(p => p.is_starter)
  const selectedOwned = ownedBySpecies.get(selectedSpeciesId)
  const selectedSpecies = getPetSpecies(selectedSpeciesId) ?? PET_SPECIES_CATALOG[0]

  useEffect(() => {
    setNicknameInput(selectedOwned?.nickname ?? '')
  }, [selectedSpeciesId, selectedOwned?.nickname])

  function applySnapshot(next: UserPetsSnapshot, message: string, ticket: number) {
    if (ticket !== lifecycle.current) return
    setSnapshot(next)
    setNotice(message)
    setError('')
    callbacks.current.onBannerPetChange?.(next.equipment.banner_pet)
    callbacks.current.onHousePetsChange?.(next.equipment.house_pets)
  }

  async function handleAdoptStarter(e: FormEvent) {
    e.preventDefault()
    if (!client || busy || !isOwn) return
    const validationErr = validatePetNickname(starterNickname)
    if (validationErr) {
      setError(validationErr)
      return
    }
    const ticket = lifecycle.current
    setBusy(true)
    setError('')
    try {
      const next = await adoptStarterPet(client, starterChoice, starterNickname)
      if (ticket === lifecycle.current) setSelectedSpeciesId(starterChoice)
      applySnapshot(next, 'Starter companion welcomed to your Realm!', ticket)
    } catch (err) {
      if (ticket === lifecycle.current) setError(errorText(err))
    } finally {
      if (ticket === lifecycle.current) setBusy(false)
    }
  }

  async function handleToggleBanner(pet: OwnedPet) {
    if (!client || busy || !isOwn || !snapshot) return
    const ticket = lifecycle.current
    setBusy(true)
    setError('')
    try {
      const isEquipped = snapshot.equipment.banner_pet_id === pet.id
      const nextIds = isEquipped ? [] : [pet.id]
      const next = await equipPets(client, 'banner', nextIds)
      applySnapshot(
        next,
        isEquipped
          ? `${petDisplayName(pet)} removed from profile banner.`
          : `${petDisplayName(pet)} equipped to your profile banner.`,
        ticket,
      )
    } catch (err) {
      if (ticket === lifecycle.current) setError(errorText(err))
    } finally {
      if (ticket === lifecycle.current) setBusy(false)
    }
  }

  async function handleToggleHouse(pet: OwnedPet) {
    if (!client || busy || !isOwn || !snapshot) return
    const currentIds = snapshot.equipment.house_pet_ids ?? []
    const isEquipped = currentIds.includes(pet.id)
    if (!isEquipped && currentIds.length >= 3) {
      setError('Up to 3 pets can roam in your house at once. Unequip one first.')
      return
    }
    const ticket = lifecycle.current
    setBusy(true)
    setError('')
    try {
      const nextIds = isEquipped
        ? currentIds.filter(id => id !== pet.id)
        : [...currentIds, pet.id]
      const next = await equipPets(client, 'house', nextIds)
      applySnapshot(
        next,
        isEquipped
          ? `${petDisplayName(pet)} is resting in your collection.`
          : `${petDisplayName(pet)} is now roaming in your home.`,
        ticket,
      )
    } catch (err) {
      if (ticket === lifecycle.current) setError(errorText(err))
    } finally {
      if (ticket === lifecycle.current) setBusy(false)
    }
  }

  async function handleSaveNickname(e: FormEvent) {
    e.preventDefault()
    if (!client || busy || !isOwn || !selectedOwned) return
    const validationErr = validatePetNickname(nicknameInput)
    if (validationErr) {
      setError(validationErr)
      return
    }
    const ticket = lifecycle.current
    setBusy(true)
    setError('')
    try {
      const next = await updatePetNickname(client, selectedOwned.id, nicknameInput)
      applySnapshot(next, 'Companion nickname saved.', ticket)
    } catch (err) {
      if (ticket === lifecycle.current) setError(errorText(err))
    } finally {
      if (ticket === lifecycle.current) setBusy(false)
    }
  }

  const visibleCatalog = PET_SPECIES_CATALOG.filter(
    sp => sp.id !== 'triarch' || snapshot?.is_founder || ownedBySpecies.has('triarch'),
  )
  const roomHabitatCounts = evaluateRoomHabitats(roomObjects ?? savedObjects ?? [])

  if (loading) {
    return (
      <section className="pet-collection-panel" aria-label="Pet companions" aria-busy="true">
        <p role="status">Loading companion collection…</p>
      </section>
    )
  }

  if (!snapshot) return <section className="pet-collection-panel" aria-label="Pet companions">
    <h3>Companions could not be loaded</h3><p role="alert" className="error">{error}</p>
    <button type="button" onClick={()=>void loadPets()}>Try loading companions again</button>
  </section>

  return (
    <section className="pet-collection-panel" aria-label="Pets and Realm Wildlife">
      <div className="pet-panel-header">
        <div>
          <h3>{isOwn ? 'Your Companions & Wildlife' : 'Realm Companions'}</h3>
          <p>
            {isOwn
              ? 'Adopt a starter friend, attract wild creatures through room habitats, and equip companions to your home and banner.'
              : 'Companions discovered and cared for in this Realm.'}
          </p>
        </div>
        <div className="pet-subnav" role="group" aria-label="Companion views">
          <button
            type="button"
            aria-pressed={subView === 'collection'}
            onClick={() => setSubView('collection')}
          >
            Pet Collection ({snapshot?.owned.length ?? 0})
          </button>
          <button
            type="button"
            aria-pressed={subView === 'journal'}
            onClick={() => setSubView('journal')}
          >
            Wildlife Journal
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="profile-notice">
          {notice}
        </p>
      )}

      <p className="pet-equipment-summary">{snapshot.owned.length} companions · {snapshot.equipment.house_pet_ids.length} / 3 in house · {snapshot.equipment.banner_pet ? 'Banner companion equipped' : 'No banner companion'}</p>
      {snapshot.owned.length === 0 && <p className="pet-empty-copy">{isOwn ? 'Your collection is ready for its first companion. Choose a starter below.' : 'This resident has not welcomed any companions yet.'}</p>}
      {snapshot.active_encounter && isOwn && <p className="pet-visitor-notice" role="status">A {snapshot.active_encounter.name} is visiting your home. <a href={`/?home=${userId}`}>Visit home to bond</a></p>}
      {/* First-Time Starter Pet Adoption */}
      {isOwn && !hasStarter && (
        <div className="pet-starter-adoption-box" role="region" aria-label="Adopt a starter pet">
          <div>
            <strong>Choose Your Starter Companion</strong>
            <p className="muted">
              Every resident may freely adopt one starter pet. Your companion stays permanently in your collection.
            </p>
          </div>
          <div className="pet-starter-grid">
            {PET_SPECIES_CATALOG.filter(s => s.type === 'starter').map(starter => (
              <button
                key={starter.id}
                type="button"
                className="pet-starter-choice"
                disabled={busy}
                aria-pressed={starterChoice === starter.id}
                onClick={() => setStarterChoice(starter.id)}
              >
                <PetSprite speciesId={starter.id} state="idle" scale={2} />
                <strong>{starter.name}</strong>
                <small>{starter.description}</small>
              </button>
            ))}
          </div>
          <div className="pet-starter-controls">
            <label>
              Optional nickname (up to 24 chars)
              <input
                type="text"
                maxLength={24}
                placeholder={`e.g. ${starterChoice === 'cat' ? 'Miso' : starterChoice === 'slime' ? 'Dewdrop' : 'Bramble'}`}
                value={starterNickname}
                onChange={e => setStarterNickname(e.target.value)}
              />
            </label>
            <button
              type="button"
              className="primary"
              disabled={busy}
              onClick={e => void handleAdoptStarter(e as unknown as FormEvent)}
            >
              {busy ? 'Adopting…' : `Adopt ${getPetSpecies(starterChoice)?.name}`}
            </button>
          </div>
        </div>
      )}

      {subView === 'collection' ? (
        <>
          <div className="pet-collection-grid" role="list" aria-label="Pet species cards">
            {visibleCatalog.map(sp => {
              const owned = ownedBySpecies.get(sp.id)
              const isBannerEquipped = !!owned && snapshot?.equipment.banner_pet_id === owned.id
              const isHouseEquipped =
                !!owned && (snapshot?.equipment.house_pet_ids ?? []).includes(owned.id)
              const selected = selectedSpeciesId === sp.id

              return (
                <article
                  key={sp.id}
                  role="listitem"
                  className={`pet-card ${selected ? 'is-selected' : ''} ${!owned ? 'is-locked' : ''}`}
                >
                  <button type="button" className="pet-card-top pet-card-select" aria-pressed={selected} aria-label={`Inspect ${owned ? petDisplayName(owned) : sp.name}`} onClick={() => setSelectedSpeciesId(sp.id)}>
                    <div className="pet-card-stage">
                      <PetSprite
                        speciesId={sp.id}
                        state={selected ? previewState : 'idle'}
                        scale={2}
                        silhouette={!owned}
                        label={owned ? petDisplayName(owned) : `Undiscovered ${sp.name}`}
                      />
                    </div>
                    <div className="pet-card-meta">
                      <span className={`pet-rarity-badge rarity-${sp.rarity}`}>
                        {RARITY_LABELS[sp.rarity]}
                      </span>
                      <strong>{owned ? petDisplayName(owned) : sp.name}</strong>
                      <small>
                        {owned
                          ? `${sp.name}${sp.title ? ` · ${sp.title}` : ''} · ${owned.personality}`
                          : sp.discovery_origin}
                      </small>
                    </div>
                  </button>

                  {isOwn && owned && (
                    <div className="pet-card-actions" onClick={e => e.stopPropagation()}>
                      <button
                        type="button"
                        aria-pressed={isBannerEquipped}
                        disabled={busy}
                        onClick={() => void handleToggleBanner(owned)}
                      >
                        {isBannerEquipped ? 'On banner' : 'Equip Banner'}
                      </button>
                      <button
                        type="button"
                        aria-pressed={isHouseEquipped}
                        disabled={busy}
                        onClick={() => void handleToggleHouse(owned)}
                      >
                        {isHouseEquipped ? 'In house' : 'Display in House'}
                      </button>
                    </div>
                  )}
                </article>
              )
            })}
          </div>

          {/* Pet Details Inspector */}
          <div className="pet-details-drawer" aria-label="Selected companion details">
            <div className="pet-details-preview">
              <PetSprite
                speciesId={selectedSpecies.id}
                state={previewState}
                scale={selectedSpecies.id === 'triarch' ? 2 : 3}
                silhouette={!selectedOwned}
                label={selectedOwned ? petDisplayName(selectedOwned) : selectedSpecies.name}
              />
              {selectedOwned && (
                <div className="pet-anim-states" role="group" aria-label="Preview animation state">
                  {(['idle', 'walk', 'sit', 'sleep', 'happy'] as const).map(st => (
                    <button
                      key={st}
                      type="button"
                      aria-pressed={previewState === st}
                      onClick={() => setPreviewState(st)}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="pet-details-body">
              <div>
                <span className={`pet-rarity-badge rarity-${selectedSpecies.rarity}`}>
                  {RARITY_LABELS[selectedSpecies.rarity]}
                </span>
                <h4>
                  {selectedOwned ? petDisplayName(selectedOwned) : selectedSpecies.name}
                  {selectedSpecies.title ? ` — ${selectedSpecies.title}` : ''}
                </h4>
              </div>

              <p>{selectedOwned ? selectedSpecies.description : selectedSpecies.journal_clue}</p>

              {selectedOwned ? (
                <>
                  <p>
                    <strong>Personality:</strong> {selectedOwned.personality} —{' '}
                    {PERSONALITY_DESCRIPTIONS[selectedOwned.personality]}
                  </p>
                  <p>
                    <strong>Origin:</strong> {selectedSpecies.discovery_origin} · Joined{' '}
                    {new Date(selectedOwned.acquired_at).toLocaleDateString()} · Affection{' '}
                    {selectedOwned.affection_level}
                  </p>
                  {isOwn && (
                    <div className="pet-nickname-row">
                      <label>
                        Companion nickname
                        <input
                          type="text"
                          maxLength={24}
                          placeholder={selectedSpecies.name}
                          value={nicknameInput}
                          onChange={e => setNicknameInput(e.target.value)}
                        />
                      </label>
                      <button
                        type="button"
                        disabled={busy || nicknameInput.trim() === (selectedOwned.nickname ?? '')}
                        onClick={e => void handleSaveNickname(e as unknown as FormEvent)}
                      >
                        Save nickname
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <p className="muted">
                  Not yet in your collection. Check the Wildlife Journal for habitat discovery clues.
                </p>
              )}
            </div>
          </div>
        </>
      ) : (
        /* Wildlife Journal View */
        <div className="pet-collection-panel" aria-label="Wildlife Journal">
          <div className="wildlife-journal-summary">
            <span>
              <strong>Wildlife Discovery Progress:</strong>{' '}
              {(snapshot?.owned ?? []).filter(p => ['fox','wisp','bat','owl'].includes(p.species_id)).length} / 4 wildlife companions
            </span>
            <span>House Companions Equipped: {snapshot?.equipment.house_pet_ids.length ?? 0} / 3</span>
          </div>

          {isOwn && <p className="pet-journal-context">{habitatError || (roomObjects !== undefined || savedObjects ? 'Habitat counts reflect your saved home. Save changes in Home Studio to invite a visitor.' : 'Loading your saved home habitats…')}</p>}
          {!isOwn && <p className="pet-journal-context">Habitat requirements are shown below. This resident’s home arrangement is private.</p>}
          <div className="pet-collection-grid">
            {visibleCatalog.filter(sp=>sp.type==='wildlife'||sp.type==='achievement').map(sp => {
              const discovered = ownedBySpecies.has(sp.id)
              const progress = describeHabitatProgress(roomHabitatCounts, sp)
              return (
                <article
                  key={sp.id}
                  className={`pet-card ${!discovered ? 'is-locked' : ''}`}
                >
                  <div className="pet-card-top">
                    <div className="pet-card-stage">
                      <PetSprite
                        speciesId={sp.id}
                        state="idle"
                        scale={2}
                        silhouette={!discovered}
                      />
                    </div>
                    <div className="pet-card-meta">
                      <span className={`pet-rarity-badge rarity-${sp.rarity}`}>
                        {discovered ? 'Discovered' : 'Undiscovered'} · {RARITY_LABELS[sp.rarity]}
                      </span>
                      <strong>{discovered ? sp.name : '???'}</strong>
                      <small>{sp.discovery_origin}</small>
                    </div>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--realm-muted)' }}>
                    {discovered ? sp.description : sp.journal_clue}
                  </p>
                  {progress.length > 0 && (
                    <div className="wildlife-habitat-tags" aria-label="Habitat requirements">
                      {progress.map(req => (
                        <span
                          key={req.tag}
                          className={`habitat-tag-pill ${(roomObjects !== undefined || savedObjects) && req.met ? 'is-met' : ''}`}
                        >
                          {req.tag}: {roomObjects !== undefined || savedObjects ? `${req.current}/${req.required}` : `${req.required} needed`}
                        </span>
                      ))}
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        </div>
      )}
    </section>
  )
}

import { useEffect, useState } from 'react'
import { petDisplayName, type EquippedPetSummary, type PetAnimationState } from './pets/pet-model.ts'
import { PetSprite } from './pets/PetSprite.tsx'

interface ProfileBannerPetProps {
  pet: EquippedPetSummary | null | undefined
}

export function ProfileBannerPet({ pet }: ProfileBannerPetProps) {
  const [animState, setAnimState] = useState<PetAnimationState>(() =>
    pet?.species_id === 'triarch' ? 'happy' : 'idle',
  )
  const [offsetPct, setOffsetPct] = useState(74)
  const [reducedMotion, setReducedMotion] = useState(() =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false,
  )

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReducedMotion(media.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  // Greeting animation when viewing Triarch on the Founder's profile banner
  useEffect(() => {
    if (!pet) return
    if (pet.species_id === 'triarch' && !reducedMotion) {
      setAnimState('happy')
      const greetTimer = window.setTimeout(() => setAnimState('idle'), 1800)
      return () => window.clearTimeout(greetTimer)
    } else {
      setAnimState(reducedMotion ? 'sit' : 'idle')
    }
  }, [pet?.id, pet?.species_id, reducedMotion])

  // Lightweight banner edge wandering / resting cycle
  useEffect(() => {
    if (!pet || reducedMotion) {
      setAnimState('sit')
      return
    }
    const states: PetAnimationState[] =
      pet.personality === 'Sleepy'
        ? ['sit', 'sleep', 'idle', 'sit']
        : ['idle', 'walk', 'sit', 'idle']
    let step = 0
    const timer = window.setInterval(() => {
      if (document.hidden) return
      step = (step + 1) % states.length
      const next = states[step]
      setAnimState(next)
      if (next === 'walk') {
        setOffsetPct(prev => (prev > 68 ? 56 : 76))
      }
    }, 3600)
    return () => window.clearInterval(timer)
  }, [pet, reducedMotion])

  if (!pet) return null

  const displayName = petDisplayName(pet)
  const label = pet.title
    ? `${displayName} (${pet.name} · ${pet.title})`
    : `${displayName} (${pet.name})`

  return (
    <div
      className={`profile-banner-pet ${pet.species_id === 'triarch' ? 'is-triarch' : ''}`}
      style={{ left: `${offsetPct}%` }}
      role="group"
      aria-label={`Banner companion: ${label}`}
      title={label}
      onClick={() => {
        if (!reducedMotion) {
          setAnimState('happy')
          window.setTimeout(() => setAnimState('idle'), 1400)
        }
      }}
    >
      <PetSprite
        speciesId={pet.species_id}
        state={reducedMotion ? 'sit' : animState}
        scale={pet.species_id === 'triarch' ? 1.15 : 1.25}
        animate={!reducedMotion}
        label={label}
      />
      <span className="profile-banner-pet-tag" aria-hidden="true">
        {displayName}
      </span>
    </div>
  )
}

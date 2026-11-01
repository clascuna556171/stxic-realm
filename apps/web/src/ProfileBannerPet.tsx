import { useEffect, useRef, useState } from 'react'
import { petDisplayName, type EquippedPetSummary, type PetAnimationState } from './pets/pet-model.ts'
import type { Direction } from './world/room.ts'
import { PetSprite } from './pets/PetSprite.tsx'
import { getPetSpriteDimensions } from './pets/pet-sprites.ts'
import { bannerRoamBounds, nextBannerStop } from './pets/banner-roam.ts'
import { usePetMotion } from './pets/usePetMotion.ts'

export function ProfileBannerPet({ pet }: { pet: EquippedPetSummary | null | undefined }) {
  return pet ? <BannerCompanion key={pet.id} pet={pet} /> : null
}

function BannerCompanion({ pet }: { pet: EquippedPetSummary }) {
  const [pose, setPose] = useState<PetAnimationState>('sit')
  const [direction, setDirection] = useState<Direction>('down')
  const [held, setHeld] = useState(false)
  const [reacting, setReacting] = useState(false)
  const [bounds, setBounds] = useState<{ min: number; max: number } | null>(null)
  const { ref, reducedMotion, active } = usePetMotion<HTMLButtonElement>(pet.id)
  const position = useRef<number | null>(null)
  const step = useRef(0)
  const greeted = useRef(false)
  const reactionTimer = useRef<number | undefined>(undefined)
  const spriteWidth = getPetSpriteDimensions(pet.species_id).width * 2

  useEffect(() => {
    const parent = ref.current?.parentElement
    if (!parent) return
    const measure = () => setBounds(bannerRoamBounds(parent.clientWidth, spriteWidth))
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(parent)
    return () => observer.disconnect()
  }, [ref, spriteWidth])

  useEffect(() => {
    const element = ref.current
    if (!element || !bounds) return
    const x = Math.min(bounds.max, Math.max(bounds.min, position.current ?? bounds.max))
    position.current = x
    element.style.transform = `translate3d(${x}px, 0, 0)`
    let timer: number | undefined
    let animation: Animation | undefined
    let cancelled = false
    const rest = () => {
      setDirection('down')
      setPose(pet.personality === 'Sleepy' ? 'sleep' : step.current % 2 ? 'sit' : 'idle')
      timer = window.setTimeout(walk, pet.personality === 'Sleepy' ? 8000 : 2600 + step.current % 3 * 700)
    }
    const walk = () => {
      const from = position.current ?? bounds.max
      const to = nextBannerStop(from, bounds, step.current++, pet.personality)
      if (Math.abs(to - from) < 8) { rest(); return }
      setDirection(to < from ? 'left' : 'right')
      setPose('walk')
      // Constant ground speed on the compositor, without a frame loop.
      animation = element.animate([
        { transform: `translate3d(${from}px, 0, 0)` },
        { transform: `translate3d(${to}px, 0, 0)` },
      ], { duration: Math.abs(to - from) / (pet.personality === 'Playful' ? 32 : 23) * 1000, easing: 'linear', fill: 'forwards' })
      animation.onfinish = () => {
        if (cancelled) return
        position.current = to
        element.style.transform = `translate3d(${to}px, 0, 0)`
        animation?.cancel()
        animation = undefined
        rest()
      }
    }
    if (!active || held || reacting) {
      setDirection('down')
      setPose(reacting && active ? 'happy' : 'sit')
    } else if (!greeted.current && pet.species_id === 'triarch') {
      greeted.current = true
      setPose('happy')
      timer = window.setTimeout(rest, 1400)
    } else rest()
    return () => {
      cancelled = true
      window.clearTimeout(timer)
      // Freeze an interrupted walk at its visible position, not its destination.
      if (animation) {
        const stopped = new DOMMatrixReadOnly(getComputedStyle(element).transform).m41
        position.current = stopped
        animation.cancel()
        element.style.transform = `translate3d(${stopped}px, 0, 0)`
      }
    }
  }, [active, held, reacting, bounds, pet.personality, pet.species_id, ref])

  useEffect(() => () => window.clearTimeout(reactionTimer.current), [])
  const displayName = petDisplayName(pet)
  const label = pet.title ? `${displayName} (${pet.name} · ${pet.title})` : `${displayName} (${pet.name})`
  return (
    <button
      ref={ref}
      type="button"
      className={`profile-banner-pet ${pet.species_id === 'triarch' ? 'is-triarch' : ''}`}
      data-pose={reducedMotion ? 'sit' : pose}
      data-direction={direction}
      aria-label={`Greet banner companion: ${label}`}
      title={label}
      onPointerEnter={event => { if (event.pointerType === 'mouse') setHeld(true) }}
      onPointerLeave={() => { if (!ref.current?.matches(':focus-visible')) setHeld(false) }}
      onFocus={() => setHeld(true)}
      onBlur={() => setHeld(false)}
      onClick={() => {
        if (!active) return
        setReacting(true)
        window.clearTimeout(reactionTimer.current)
        reactionTimer.current = window.setTimeout(() => setReacting(false), 1400)
      }}
    >
      <span className="profile-banner-pet-shadow" aria-hidden="true" />
      <PetSprite speciesId={pet.species_id} state={reducedMotion ? 'sit' : pose} direction={direction} scale={2} animate={active} />
      <span className="profile-banner-pet-tag" aria-hidden="true">{displayName}</span>
    </button>
  )
}

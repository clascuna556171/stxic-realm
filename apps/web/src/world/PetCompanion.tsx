import { useState, useRef } from 'react'
import { VinylEngine } from './vinyl'
import { PixelPetAvatar, PixelHeart, PixelSparkle } from './pixel-icons'
import { trackHallmarkMilestone } from '../badges'
import './turntable.css'

export interface PetInfo {
  id: string
  name: string
  species: string
  petType: 'sylvester' | 'mochi' | 'pip'
  description: string
  purrType: 'cat' | 'bunny'
  reactions: string[]
}

export const PETS: Record<string, PetInfo> = {
  bed: {
    id: 'sylvester',
    name: 'Sylvester',
    species: 'Tuxedo Cat',
    petType: 'sylvester',
    description: 'Curled up on the soft linen duvet, breathing peacefully.',
    purrType: 'cat',
    reactions: [
      'purrs softly and curls his tail tighter around his paws.',
      'stretches his back legs and kneads the blanket happily.',
      'nuzzles your knuckles and lets out a contented rumbling purr.',
      'cracks open one sleepy golden eye and boops your fingers with his wet nose.',
    ],
  },
  sofa: {
    id: 'mochi',
    name: 'Mochi',
    species: 'White Kitten',
    petType: 'mochi',
    description: 'Nestled on the corner cushion, watching you with curious eyes.',
    purrType: 'cat',
    reactions: [
      'swishes her tiny fluffy tail and headbutts your palm.',
      'flips over onto her back, showing her soft pink belly beans.',
      'purrs enthusiastically like a tiny motorboat.',
      'chirps playfully and playfully bats at your wrist.',
    ],
  },
  desk: {
    id: 'pip',
    name: 'Pip',
    species: 'Lavender Desk Bunny',
    petType: 'pip',
    description: 'Resting quietly beside the steaming mug and mechanical keyboard.',
    purrType: 'bunny',
    reactions: [
      'wiggles their nose and twitches both ears in delight.',
      'hops closer and gently nibbles on your sleeve.',
      'lets out a tiny happy squeak and flops into a cozy loaf.',
      'nuzzles under your hand, demanding gentle forehead scratches.',
    ],
  },
}

interface Props {
  petKey: 'bed' | 'sofa' | 'desk'
}

export function PetCompanion({ petKey }: Props) {
  const pet = PETS[petKey]
  const [affection, setAffection] = useState(() => {
    try {
      return parseInt(localStorage.getItem(`stxic-realm:pet:${pet.id}`) || '0', 10)
    } catch {
      return 0
    }
  })
  const [currentReaction, setCurrentReaction] = useState<string | null>(null)
  const [heartMotes, setHeartMotes] = useState<{ id: number; kind: 'heart' | 'sparkle' }[]>([])
  const engineRef = useRef<VinylEngine | null>(null)
  const moteId = useRef(0)

  const handlePet = async () => {
    const nextAffection = affection + 1
    setAffection(nextAffection)
    trackHallmarkMilestone('self', 'pet', petKey)
    try {
      localStorage.setItem(`stxic-realm:pet:${pet.id}`, nextAffection.toString())
    } catch {}

    const reaction = pet.reactions[(nextAffection - 1) % pet.reactions.length]
    setCurrentReaction(`${pet.name} ${reaction}`)

    const id = ++moteId.current
    const kind = id % 3 === 0 ? 'sparkle' : 'heart'
    setHeartMotes(prev => [...prev, { id, kind }])
    setTimeout(() => {
      setHeartMotes(prev => prev.filter(m => m.id !== id))
    }, 1200)

    engineRef.current ??= new VinylEngine()
    if (pet.purrType === 'cat') {
      await engineRef.current.playPurr()
    } else {
      await engineRef.current.playChirp()
    }
  }

  return (
    <div className="pet-companion-card" aria-label={`Pet companion ${pet.name}`}>
      <div className="pet-info">
        <div className="pet-avatar" aria-hidden="true">
          <PixelPetAvatar pet={pet.petType} />
        </div>
        <div className="pet-details">
          <h4>{pet.name} the {pet.species}</h4>
          <p>{pet.description}</p>
          {currentReaction && (
            <p className="pet-reaction-bubble" role="status">
              {currentReaction}
            </p>
          )}
        </div>
      </div>

      <div style={{ position: 'relative' }}>
        <button
          className="pet-btn"
          onClick={handlePet}
          aria-label={`Pet ${pet.name}`}
        >
          <span>Pet {pet.name}</span>
          <span className="pet-affection-tag">({affection})</span>
        </button>

        {/* Floating Pixel Heart & Sparkle Motes */}
        <div className="pet-hearts" aria-hidden="true">
          {heartMotes.map(mote => (
            <span key={mote.id} className="floating-heart">
              {mote.kind === 'heart' ? <PixelHeart size={18} /> : <PixelSparkle size={18} />}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

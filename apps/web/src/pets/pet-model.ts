export type PetSpeciesId = 'cat' | 'slime' | 'pup' | 'fox' | 'wisp' | 'bat' | 'owl' | 'triarch'
export type PetCategoryType = 'starter' | 'wildlife' | 'achievement' | 'founder'
export type PetRarity = 'starter' | 'uncommon' | 'rare' | 'founder'
export type PetPersonality = 'Sleepy' | 'Curious' | 'Playful' | 'Shy' | 'Loyal' | 'Mischievous'
export type PetAnimationState = 'idle' | 'walk' | 'sit' | 'sleep' | 'happy'
export type HabitatTag = 'Forest' | 'Cozy' | 'Magical' | 'Ancient' | 'Dark' | 'Water' | 'Warm' | 'Light'

export interface PetSpecies {
  id: PetSpeciesId
  name: string
  title: string
  type: PetCategoryType
  rarity: PetRarity
  description: string
  discovery_origin: string
  habitat_requirements: Partial<Record<HabitatTag, number>>
  personality_pool: PetPersonality[]
  sprite_key: PetSpeciesId
  sort_order: number
  journal_clue: string
  bonding_prompts: [string, string, string]
}

export interface OwnedPet {
  id: string
  user_id: string
  species_id: PetSpeciesId
  name: string
  title: string
  type: PetCategoryType
  rarity: PetRarity
  description: string
  discovery_origin: string
  sprite_key: PetSpeciesId
  nickname: string | null
  personality: PetPersonality
  acquired_at: string
  is_starter: boolean
  affection_level: number
}

export interface EquippedPetSummary {
  id: string
  species_id: PetSpeciesId
  name: string
  title: string
  nickname: string | null
  rarity: PetRarity
  personality: PetPersonality
  sprite_key: PetSpeciesId
  affection_level: number
}

export interface WildlifeEncounter {
  id: string
  species_id: PetSpeciesId
  name: string
  rarity: PetRarity
  description: string
  discovery_origin: string
  sprite_key: PetSpeciesId
  status: 'active' | 'bonded' | 'expired'
  created_at: string
}

export interface UserPetEquipment {
  banner_pet_id: string | null
  house_pet_ids: string[]
  banner_pet: EquippedPetSummary | null
  house_pets: EquippedPetSummary[]
}

export interface UserPetsSnapshot {
  user_id: string
  own: boolean
  is_founder: boolean
  species: PetSpecies[]
  owned: OwnedPet[]
  equipment: UserPetEquipment
  active_encounter: WildlifeEncounter | null
}

export const PERSONALITY_DESCRIPTIONS: Record<PetPersonality, string> = {
  Sleepy: 'Often curls up for long naps near soft furniture and warm light.',
  Curious: 'Wanders from piece to piece, inspecting books, lamps, and corners.',
  Playful: 'Explores short routes around the room and celebrates on arrival.',
  Shy: 'Keeps its distance and seeks quiet edges when someone approaches.',
  Loyal: 'Stays close to your footsteps and watches over the room beside you.',
  Mischievous: 'Investigates desks, banners, and consoles with quick, alert steps.',
}

export const RARITY_LABELS: Record<PetRarity, string> = {
  starter: 'Starter',
  uncommon: 'Uncommon',
  rare: 'Rare',
  founder: 'Founder Exclusive',
}

export const PET_SPECIES_CATALOG: PetSpecies[] = [
  {
    id: 'cat',
    name: 'Village Cat',
    title: '',
    type: 'starter',
    rarity: 'starter',
    description: 'A warm tabby companion in a crimson scarf who curls up near hearth light and softly purrs.',
    discovery_origin: 'Free starter adoption',
    habitat_requirements: {},
    personality_pool: ['Sleepy', 'Curious', 'Loyal'],
    sprite_key: 'cat',
    sort_order: 1,
    journal_clue: 'Welcomed freely by any resident seeking a quiet hearthside friend.',
    bonding_prompts: ['Extend a slow hand to sniff', 'Scratch gently behind the ears', 'Fasten the crimson scarf'],
  },
  {
    id: 'slime',
    name: 'Tiny Slime',
    title: '',
    type: 'starter',
    rarity: 'starter',
    description: 'A translucent sky-blue droplet companion that bounces gently and releases tiny floating bubbles.',
    discovery_origin: 'Free starter adoption',
    habitat_requirements: {},
    personality_pool: ['Playful', 'Curious', 'Mischievous'],
    sprite_key: 'slime',
    sort_order: 2,
    journal_clue: 'Welcomed freely by any resident drawn to dewy, cheerful companions.',
    bonding_prompts: ['Offer a drop of cool water', 'Poke its bouncy crest gently', 'Watch it bubble with joy'],
  },
  {
    id: 'pup',
    name: 'Woodland Pup',
    title: '',
    type: 'starter',
    rarity: 'starter',
    description: 'A loyal floppy-eared pup with a traveler kerchief and tiny satchel, always eager to greet guests.',
    discovery_origin: 'Free starter adoption',
    habitat_requirements: {},
    personality_pool: ['Loyal', 'Playful', 'Curious'],
    sprite_key: 'pup',
    sort_order: 3,
    journal_clue: 'Welcomed freely by any resident ready for a steadfast companion.',
    bonding_prompts: ['Kneel down and call softly', 'Pat its fluffy head', 'Adjust its tiny travel pack'],
  },
  {
    id: 'fox',
    name: 'Moss Fox',
    title: '',
    type: 'wildlife',
    rarity: 'uncommon',
    description: 'A quiet woodland fox cloaked in soft moss and a wild white blossom, drawn to leafy, comfortable rooms.',
    discovery_origin: 'Forest & Cozy habitat visitor',
    habitat_requirements: { Forest: 2, Cozy: 1 },
    personality_pool: ['Shy', 'Curious', 'Sleepy'],
    sprite_key: 'fox',
    sort_order: 4,
    journal_clue: 'Attracted to rooms with at least two Forest touches and a Cozy place to rest.',
    bonding_prompts: ['Remain still as it steps closer', 'Offer a woodland berry', 'Brush the moss along its tail'],
  },
  {
    id: 'wisp',
    name: 'Crystal Wisp',
    title: '',
    type: 'wildlife',
    rarity: 'uncommon',
    description: 'An arcane amethyst prism orbited by starlight motes that drifts toward enchanted furnishings.',
    discovery_origin: 'Magical habitat visitor',
    habitat_requirements: { Magical: 2 },
    personality_pool: ['Curious', 'Playful', 'Mischievous'],
    sprite_key: 'wisp',
    sort_order: 5,
    journal_clue: 'Drawn to rooms resonating with at least two Magical furnishings or banners.',
    bonding_prompts: ['Hold out an open palm', 'Attune to its soft harmonic hum', 'Let its starlight orbit your hand'],
  },
  {
    id: 'bat',
    name: 'Cave Bat',
    title: '',
    type: 'wildlife',
    rarity: 'rare',
    description: 'A dusk-winged cavern dweller with royal-violet membranes that roosts near ancient, shadowy relics.',
    discovery_origin: 'Dark & Ancient habitat visitor',
    habitat_requirements: { Dark: 1, Ancient: 1 },
    personality_pool: ['Shy', 'Sleepy', 'Mischievous'],
    sprite_key: 'bat',
    sort_order: 6,
    journal_clue: 'Visits quiet rooms containing both Dark shadows and Ancient relics.',
    bonding_prompts: ['Dim the nearby glare', 'Offer a sweet night-fig', 'Let it perch beside your shoulder'],
  },
  {
    id: 'owl',
    name: 'Moon Owl',
    title: '',
    type: 'achievement',
    rarity: 'rare',
    description: 'A silver-plumed sentinel bearing a golden crescent crest, attracted to scholarly lore and moonlit lamps.',
    discovery_origin: 'Lore & Ancient Starlight discovery',
    habitat_requirements: { Ancient: 1, Magical: 1, Light: 1 },
    personality_pool: ['Loyal', 'Sleepy', 'Curious'],
    sprite_key: 'owl',
    sort_order: 7,
    journal_clue: 'Appears when Ancient knowledge, Magical aura, and warm Light converge in one room.',
    bonding_prompts: ['Bow respectfully to the sentinel', 'Share a quiet page of lore', 'Receive its moonlit gaze'],
  },
  {
    id: 'triarch',
    name: 'Triarch',
    title: 'The First Wyrm',
    type: 'founder',
    rarity: 'founder',
    description: 'A sovereign three-headed wyrm of charcoal scales, royal-purple wings, and antique gold horns. Each head watches a different horizon.',
    discovery_origin: 'Founder Exclusive grant',
    habitat_requirements: {},
    personality_pool: ['Loyal', 'Curious', 'Mischievous'],
    sprite_key: 'triarch',
    sort_order: 8,
    journal_clue: 'Bound exclusively to the Sovereign Architect of STXIC Realm.',
    bonding_prompts: ['Greet the left sentinel', 'Greet the right watcher', 'salute the sovereign center crown'],
  },
]

export function getPetSpecies(id: string): PetSpecies | undefined {
  return PET_SPECIES_CATALOG.find(s => s.id === id)
}

export function petDisplayName(pet: { name: string; nickname?: string | null }): string {
  const nick = pet.nickname?.trim()
  return nick ? nick : pet.name
}

export function validatePetNickname(input: string): string | null {
  const trimmed = input.trim().replace(/\s+/g, ' ')
  if (!trimmed) return null
  if (trimmed.length > 24) return 'Nickname must be 24 characters or fewer.'
  if (/[\x00-\x1F\x7F<>]/.test(trimmed)) return 'Nickname cannot contain control characters or angle brackets.'
  return null
}

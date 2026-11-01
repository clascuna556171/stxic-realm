import { PET_SPECIES_CATALOG, type HabitatTag, type PetSpecies } from '../pets/pet-model.ts'

export const ALL_HABITAT_TAGS: HabitatTag[] = [
  'Forest',
  'Cozy',
  'Magical',
  'Ancient',
  'Dark',
  'Water',
  'Warm',
  'Light',
]

export const FURNITURE_HABITAT_TAGS: Record<string, HabitatTag[]> = {
  // Core 10 room catalog items
  desk: ['Cozy', 'Light'],
  bookshelf: ['Ancient', 'Magical', 'Dark'],
  sofa: ['Cozy'],
  lantern: ['Magical', 'Light', 'Warm', 'Ancient'],
  banner: ['Ancient', 'Magical', 'Dark'],
  console: ['Magical', 'Light'],
  plant: ['Forest', 'Water'],
  bed: ['Cozy', 'Warm'],
  'coffee-table': ['Cozy', 'Warm'],
  'floor-lamp': ['Forest', 'Warm', 'Light'],
  // Named wildlife habitat decorations
  'mushroom-lamp': ['Forest', 'Warm'],
  'potted-fern': ['Forest'],
  'wooden-pet-bed': ['Cozy'],
  'crystal-lantern': ['Magical', 'Light'],
  'ancient-altar': ['Ancient', 'Magical'],
  'dark-candle': ['Dark', 'Ancient'],
}

export function getFurnitureHabitatTags(furnitureId: string): HabitatTag[] {
  return FURNITURE_HABITAT_TAGS[furnitureId] ?? []
}

export function evaluateRoomHabitats(objects: ReadonlyArray<{ id: string }>): Record<HabitatTag, number> {
  const counts: Record<HabitatTag, number> = {
    Forest: 0,
    Cozy: 0,
    Magical: 0,
    Ancient: 0,
    Dark: 0,
    Water: 0,
    Warm: 0,
    Light: 0,
  }
  const seenIds = new Set<string>()
  for (const obj of objects) {
    if (!obj || typeof obj.id !== 'string' || seenIds.has(obj.id)) continue
    seenIds.add(obj.id)
    const tags = FURNITURE_HABITAT_TAGS[obj.id]
    if (!tags) continue
    for (const tag of tags) {
      counts[tag] = (counts[tag] ?? 0) + 1
    }
  }
  return counts
}

export function meetsHabitatRequirements(
  counts: Record<HabitatTag, number>,
  requirements: Partial<Record<HabitatTag, number>>,
): boolean {
  const entries = Object.entries(requirements) as [HabitatTag, number][]
  if (entries.length === 0) return false
  return entries.every(([tag, minRequired]) => (counts[tag] ?? 0) >= minRequired)
}

export function findEligibleWildlifeSpecies(
  objects: ReadonlyArray<{ id: string }>,
  ownedSpeciesIds: Iterable<string> = [],
): PetSpecies[] {
  const owned = new Set(ownedSpeciesIds)
  const counts = evaluateRoomHabitats(objects)
  return PET_SPECIES_CATALOG.filter(
    species =>
      (species.type === 'wildlife' || species.type === 'achievement') &&
      species.id !== 'triarch' &&
      !owned.has(species.id) &&
      meetsHabitatRequirements(counts, species.habitat_requirements),
  ).sort((a, b) => a.sort_order - b.sort_order)
}

export function describeHabitatProgress(
  counts: Record<HabitatTag, number>,
  species: PetSpecies,
): { tag: HabitatTag; current: number; required: number; met: boolean }[] {
  const entries = Object.entries(species.habitat_requirements) as [HabitatTag, number][]
  return entries.map(([tag, required]) => {
    const current = counts[tag] ?? 0
    return {
      tag,
      current,
      required,
      met: current >= required,
    }
  })
}

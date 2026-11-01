import type { EquippedPetSummary, WildlifeEncounter } from '../pets/pet-model.ts'

export function readRoomPets(snapshot: {
  house_pets?: EquippedPetSummary[]
  wildlife_encounter?: WildlifeEncounter | null
}) {
  // An empty/absent projection is authoritative, never a request to reuse another visit's pets.
  return { housePets: snapshot.house_pets ?? [], wildlife: snapshot.wildlife_encounter ?? null }
}

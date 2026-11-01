import type { SupabaseClient } from '@supabase/supabase-js'
import { rpc } from '../account-repository.ts'
import type { PetSpeciesId, UserPetsSnapshot, WildlifeEncounter } from './pet-model.ts'

// Account companions always reflect server state. Schema outages must never create local ownership.
async function petRpc<T>(db: SupabaseClient, name: string, args?: Record<string, unknown>): Promise<T> {
  try {
    return await rpc<T>(db, name, args)
  } catch (error) {
    const detail = error as { code?: string; message?: string }
    if (detail.code === 'PGRST202' || /schema cache|Could not find the function/i.test(detail.message ?? '')) {
      throw Object.assign(new Error('Companions are temporarily unavailable. Ask the Realm administrator to apply the pets migrations and refresh the API schema, then retry.'), { code: detail.code, cause: error })
    }
    throw error
  }
}

export function getUserPets(db: SupabaseClient, userId?: string): Promise<UserPetsSnapshot> {
  return petRpc(db, 'get_user_pets', userId ? { p_user: userId } : {})
}
export function adoptStarterPet(db: SupabaseClient, speciesId: PetSpeciesId, nickname?: string | null): Promise<UserPetsSnapshot> {
  return petRpc(db, 'adopt_starter_pet', { p_species_id: speciesId, p_nickname: nickname?.trim() || null })
}
export function evaluateWildlifeEncounter(db: SupabaseClient, ownerId?: string): Promise<WildlifeEncounter | null> {
  return petRpc(db, 'evaluate_wildlife_encounter', ownerId ? { p_owner: ownerId } : {})
}
export function bondWildlifePet(db: SupabaseClient, encounterId: string, nickname?: string | null): Promise<UserPetsSnapshot> {
  return petRpc(db, 'bond_wildlife_pet', { p_encounter_id: encounterId, p_nickname: nickname?.trim() || null })
}
export function equipPets(db: SupabaseClient, slot: 'banner' | 'house', petIds: string[]): Promise<UserPetsSnapshot> {
  return petRpc(db, 'equip_pet', { p_slot: slot, p_pet_ids: petIds })
}
export function updatePetNickname(db: SupabaseClient, petId: string, nickname: string | null): Promise<UserPetsSnapshot> {
  return petRpc(db, 'update_pet_nickname', { p_pet_id: petId, p_nickname: nickname?.trim() || null })
}
export function interactWithPet(db: SupabaseClient, petId: string): Promise<{ id: string; species_id: PetSpeciesId; nickname: string | null; affection_level: number }> {
  return petRpc(db, 'interact_with_pet', { p_pet_id: petId })
}
export function grantFounderPet(db: SupabaseClient, userId?: string): Promise<unknown> {
  return petRpc(db, 'grant_founder_pet', userId ? { p_user_id: userId } : {})
}

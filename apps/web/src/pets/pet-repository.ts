import type { SupabaseClient } from '@supabase/supabase-js'
import { errorText, rpc } from '../account-repository.ts'
import {
  PET_SPECIES_CATALOG,
  getPetSpecies,
  type EquippedPetSummary,
  type OwnedPet,
  type PetPersonality,
  type PetSpeciesId,
  type UserPetsSnapshot,
  type WildlifeEncounter,
} from './pet-model.ts'

const FALLBACK_KEY_PREFIX = 'stxic-realm:pets-fallback:v1:'

function isSchemaCacheError(err: unknown): boolean {
  const msg = errorText(err)
  return msg.includes('schema cache') || msg.includes('Could not find the function')
}

function readLocalFallback(userId: string): UserPetsSnapshot {
  const key = `${FALLBACK_KEY_PREFIX}${userId || 'local'}`
  try {
    const raw = localStorage.getItem(key)
    if (raw) {
      const parsed = JSON.parse(raw) as UserPetsSnapshot
      if (parsed && Array.isArray(parsed.owned) && parsed.equipment) {
        return parsed
      }
    }
  } catch {}

  const triarchSpecies = getPetSpecies('triarch')!
  const now = new Date().toISOString()
  const triarchOwned: OwnedPet = {
    id: '00000000-0000-4000-8000-000000000777',
    user_id: userId || 'local',
    species_id: 'triarch',
    name: triarchSpecies.name,
    title: triarchSpecies.title,
    type: triarchSpecies.type,
    rarity: triarchSpecies.rarity,
    description: triarchSpecies.description,
    discovery_origin: triarchSpecies.discovery_origin,
    sprite_key: 'triarch',
    nickname: 'Triarch',
    personality: 'Loyal',
    acquired_at: now,
    is_starter: false,
    affection_level: 1,
  }
  const triarchSummary: EquippedPetSummary = {
    id: triarchOwned.id,
    species_id: 'triarch',
    name: triarchOwned.name,
    title: triarchOwned.title,
    nickname: triarchOwned.nickname,
    rarity: triarchOwned.rarity,
    personality: triarchOwned.personality,
    sprite_key: 'triarch',
    affection_level: 1,
  }

  const initial: UserPetsSnapshot = {
    user_id: userId || 'local',
    own: true,
    is_founder: true,
    species: PET_SPECIES_CATALOG,
    owned: [triarchOwned],
    equipment: {
      banner_pet_id: triarchOwned.id,
      house_pet_ids: [triarchOwned.id],
      banner_pet: triarchSummary,
      house_pets: [triarchSummary],
    },
    active_encounter: null,
  }
  saveLocalFallback(userId, initial)
  return initial
}

function saveLocalFallback(userId: string, snapshot: UserPetsSnapshot) {
  try {
    localStorage.setItem(`${FALLBACK_KEY_PREFIX}${userId || 'local'}`, JSON.stringify(snapshot))
  } catch {}
}

function toSummary(p: OwnedPet): EquippedPetSummary {
  return {
    id: p.id,
    species_id: p.species_id,
    name: p.name,
    title: p.title,
    nickname: p.nickname,
    rarity: p.rarity,
    personality: p.personality,
    sprite_key: p.sprite_key,
    affection_level: p.affection_level,
  }
}

export async function getUserPets(db: SupabaseClient, userId?: string): Promise<UserPetsSnapshot> {
  try {
    return await rpc<UserPetsSnapshot>(db, 'get_user_pets', userId ? { p_user: userId } : {})
  } catch (err) {
    if (isSchemaCacheError(err)) {
      return readLocalFallback(userId || 'local')
    }
    throw err
  }
}

export async function adoptStarterPet(
  db: SupabaseClient,
  speciesId: PetSpeciesId,
  nickname?: string | null,
): Promise<UserPetsSnapshot> {
  try {
    return await rpc<UserPetsSnapshot>(db, 'adopt_starter_pet', {
      p_species_id: speciesId,
      p_nickname: nickname?.trim() || null,
    })
  } catch (err) {
    if (!isSchemaCacheError(err)) throw err
    const snap = readLocalFallback('local')
    const sp = getPetSpecies(speciesId)
    if (!sp || sp.type !== 'starter') throw new Error('Choose a valid starter pet species.')
    if (snap.owned.some(p => p.is_starter)) return snap
    const newPet: OwnedPet = {
      id: crypto.randomUUID(),
      user_id: snap.user_id,
      species_id: sp.id,
      name: sp.name,
      title: sp.title,
      type: sp.type,
      rarity: sp.rarity,
      description: sp.description,
      discovery_origin: sp.discovery_origin,
      sprite_key: sp.sprite_key,
      nickname: nickname?.trim() || null,
      personality: (sp.personality_pool[0] ?? 'Curious') as PetPersonality,
      acquired_at: new Date().toISOString(),
      is_starter: true,
      affection_level: 0,
    }
    snap.owned.push(newPet)
    if (snap.equipment.house_pet_ids.length < 3) {
      snap.equipment.house_pet_ids.push(newPet.id)
      snap.equipment.house_pets.push(toSummary(newPet))
    }
    if (!snap.equipment.banner_pet_id) {
      snap.equipment.banner_pet_id = newPet.id
      snap.equipment.banner_pet = toSummary(newPet)
    }
    saveLocalFallback('local', snap)
    return snap
  }
}

export async function evaluateWildlifeEncounter(
  db: SupabaseClient,
  ownerId?: string,
): Promise<WildlifeEncounter | null> {
  try {
    return await rpc<WildlifeEncounter | null>(
      db,
      'evaluate_wildlife_encounter',
      ownerId ? { p_owner: ownerId } : {},
    )
  } catch (err) {
    if (isSchemaCacheError(err)) {
      const snap = readLocalFallback(ownerId || 'local')
      if (!snap.active_encounter) {
        const fox = getPetSpecies('fox')!
        if (!snap.owned.some(p => p.species_id === 'fox')) {
          snap.active_encounter = {
            id: crypto.randomUUID(),
            species_id: 'fox',
            name: fox.name,
            rarity: fox.rarity,
            description: fox.description,
            discovery_origin: fox.discovery_origin,
            sprite_key: 'fox',
            status: 'active',
            created_at: new Date().toISOString(),
          }
          saveLocalFallback(ownerId || 'local', snap)
        }
      }
      return snap.active_encounter
    }
    throw err
  }
}

export async function bondWildlifePet(
  db: SupabaseClient,
  encounterId: string,
  nickname?: string | null,
): Promise<UserPetsSnapshot> {
  try {
    return await rpc<UserPetsSnapshot>(db, 'bond_wildlife_pet', {
      p_encounter_id: encounterId,
      p_nickname: nickname?.trim() || null,
    })
  } catch (err) {
    if (!isSchemaCacheError(err)) throw err
    const snap = readLocalFallback('local')
    const enc = snap.active_encounter
    if (enc) {
      const sp = getPetSpecies(enc.species_id)!
      const newPet: OwnedPet = {
        id: crypto.randomUUID(),
        user_id: snap.user_id,
        species_id: sp.id,
        name: sp.name,
        title: sp.title,
        type: sp.type,
        rarity: sp.rarity,
        description: sp.description,
        discovery_origin: sp.discovery_origin,
        sprite_key: sp.sprite_key,
        nickname: nickname?.trim() || null,
        personality: (sp.personality_pool[0] ?? 'Curious') as PetPersonality,
        acquired_at: new Date().toISOString(),
        is_starter: false,
        affection_level: 0,
      }
      snap.owned.push(newPet)
      snap.active_encounter = null
      if (snap.equipment.house_pet_ids.length < 3) {
        snap.equipment.house_pet_ids.push(newPet.id)
        snap.equipment.house_pets.push(toSummary(newPet))
      }
      saveLocalFallback('local', snap)
    }
    return snap
  }
}

export async function equipPets(
  db: SupabaseClient,
  slot: 'banner' | 'house',
  petIds: string[],
): Promise<UserPetsSnapshot> {
  try {
    return await rpc<UserPetsSnapshot>(db, 'equip_pet', {
      p_slot: slot,
      p_pet_ids: petIds,
    })
  } catch (err) {
    if (!isSchemaCacheError(err)) throw err
    const snap = readLocalFallback('local')
    const matching = petIds
      .map(id => snap.owned.find(p => p.id === id))
      .filter((p): p is OwnedPet => Boolean(p))
    if (slot === 'banner') {
      const first = matching[0] ?? null
      snap.equipment.banner_pet_id = first?.id ?? null
      snap.equipment.banner_pet = first ? toSummary(first) : null
    } else {
      const capped = matching.slice(0, 3)
      snap.equipment.house_pet_ids = capped.map(p => p.id)
      snap.equipment.house_pets = capped.map(toSummary)
    }
    saveLocalFallback('local', snap)
    return snap
  }
}

export async function updatePetNickname(
  db: SupabaseClient,
  petId: string,
  nickname: string | null,
): Promise<UserPetsSnapshot> {
  try {
    return await rpc<UserPetsSnapshot>(db, 'update_pet_nickname', {
      p_pet_id: petId,
      p_nickname: nickname?.trim() || null,
    })
  } catch (err) {
    if (!isSchemaCacheError(err)) throw err
    const snap = readLocalFallback('local')
    const clean = nickname?.trim() || null
    for (const pet of snap.owned) {
      if (pet.id === petId) pet.nickname = clean
    }
    if (snap.equipment.banner_pet?.id === petId) {
      snap.equipment.banner_pet.nickname = clean
    }
    for (const hp of snap.equipment.house_pets) {
      if (hp.id === petId) hp.nickname = clean
    }
    saveLocalFallback('local', snap)
    return snap
  }
}

export async function interactWithPet(
  db: SupabaseClient,
  petId: string,
): Promise<{ id: string; species_id: PetSpeciesId; nickname: string | null; affection_level: number }> {
  try {
    return await rpc(db, 'interact_with_pet', { p_pet_id: petId })
  } catch (err) {
    if (!isSchemaCacheError(err)) throw err
    const snap = readLocalFallback('local')
    const pet = snap.owned.find(p => p.id === petId) ?? snap.owned[0]
    if (pet) {
      pet.affection_level += 1
      saveLocalFallback('local', snap)
      return {
        id: pet.id,
        species_id: pet.species_id,
        nickname: pet.nickname,
        affection_level: pet.affection_level,
      }
    }
    return { id: petId, species_id: 'cat', nickname: null, affection_level: 1 }
  }
}

export async function grantFounderPet(db: SupabaseClient, userId?: string): Promise<unknown> {
  try {
    return await rpc(db, 'grant_founder_pet', userId ? { p_user_id: userId } : {})
  } catch (err) {
    if (isSchemaCacheError(err)) {
      return readLocalFallback(userId || 'local').owned.find(p => p.species_id === 'triarch') ?? null
    }
    throw err
  }
}

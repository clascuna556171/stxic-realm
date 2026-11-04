import type { BannerShroudId, BannerAnthemId } from './profile-model'

export type BannerShroudMeta = {
  id: BannerShroudId
  name: string
  description: string
}

export type BannerAnthemMeta = {
  id: BannerAnthemId
  name: string
  subtitle: string
  trackKey?: string
}

export const BANNER_SHROUDS: readonly BannerShroudMeta[] = [
  { id: 'none', name: 'No Shroud', description: 'Clean banner with no atmospheric effects' },
  { id: 'crows', name: 'Crows & Feathers', description: 'Dark raven feather motes and distant crow silhouettes drifting across the sky' },
  { id: 'embers', name: 'Crimson Embers', description: 'Warm fiery ash and glowing sparks rising from the bottom seam' },
  { id: 'mist', name: 'Midnight Mist', description: 'Rolling layers of soft low-contrast pixel fog' },
  { id: 'stardust', name: 'Stardust Shimmer', description: 'Crisp diamond astral motes pulsing with celestial light' },
]

export const BANNER_ANTHEMS: readonly BannerAnthemMeta[] = [
  { id: 'none', name: 'No Anthem', subtitle: 'Silent banner' },
  { id: 'midnight-vinyl', name: 'Obsidian Midnight', subtitle: 'Lo-Fi chords & sub-bass', trackKey: 'obsidian-lofi' },
  { id: 'lofi-hearth', name: 'Hearthside 8-Bit', subtitle: 'Cozy campfire & chiptune', trackKey: 'campfire-chiptune' },
  { id: 'starlight-drift', name: 'Cosmic Meadow', subtitle: 'Celestial Rhodes & stars', trackKey: 'starlight-meadow' },
  { id: 'obsidian-groove', name: 'Cyberpunk Drizzle', subtitle: 'Rain textures & tape keys', trackKey: 'neon-rain' },
  { id: 'custom', name: 'Custom Audio', subtitle: 'Your 20-second audio track' },
]

export function getAnthemMeta(id?: string | null): BannerAnthemMeta {
  return BANNER_ANTHEMS.find(a => a.id === id) ?? BANNER_ANTHEMS[0]
}

export function getShroudMeta(id?: string | null): BannerShroudMeta {
  return BANNER_SHROUDS.find(s => s.id === id) ?? BANNER_SHROUDS[0]
}

export function getLocalBannerCosmetics(userId: string): { banner_shroud?: BannerShroudId; banner_anthem?: BannerAnthemId } | null {
  if (typeof window === 'undefined' || !window.localStorage || !userId) return null
  try {
    const raw = window.localStorage.getItem(`stxic-realm:profile-cosmetics:${userId}`)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveLocalBannerCosmetics(userId: string, shroud?: BannerShroudId, anthem?: BannerAnthemId): void {
  if (typeof window === 'undefined' || !window.localStorage || !userId) return
  try {
    window.localStorage.setItem(`stxic-realm:profile-cosmetics:${userId}`, JSON.stringify({ banner_shroud: shroud, banner_anthem: anthem }))
  } catch {
    // ignore storage quota errors
  }
}


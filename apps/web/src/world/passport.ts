/**
 * STXIC Realm — Spatial Traveler Passport & Stamp Book
 * 
 * Collectible spatial mementos from visited homes and personal halls.
 * Self-contained local storage persistence with deterministic room emblem generation.
 */

export interface RoomStamp {
  id: string
  roomId: string
  roomName: string
  ownerName: string
  badge: StampBadge
  ink: StampInk
  mood: string
  date: string
  note?: string
}

export type StampBadge = 'paw' | 'star' | 'heart' | 'mug' | 'flame' | 'coin' | 'gem' | 'moon'
export type StampInk = 'gold' | 'cyan' | 'rose' | 'emerald' | 'obsidian'

export const STAMP_BADGES: Record<StampBadge, { name: string; description: string }> = {
  paw: { name: 'Cat Paw', description: 'Left by a feline companion admirer' },
  star: { name: 'Cosmic Star', description: 'Starlight traveler memento' },
  heart: { name: 'Pixel Heart', description: 'Warm friend visited this hearth' },
  mug: { name: 'Steaming Mug', description: 'Shared quiet tea or coffee' },
  flame: { name: 'Cozy Flame', description: 'Warmed hands by the fire' },
  coin: { name: 'Lucky Coin', description: 'Brought good fortune to the space' },
  gem: { name: 'Prism Gem', description: 'Rare obsidian explorer hallmark' },
  moon: { name: 'Midnight Crescent', description: 'Late night realm wanderer' },
}

export const STAMP_INKS: Record<StampInk, { name: string; hex: string; bg: string }> = {
  gold: { name: 'Obsidian Gold', hex: '#fbbf24', bg: '#451a03' },
  cyan: { name: 'Cyber Cyan', hex: '#22d3ee', bg: '#083344' },
  rose: { name: 'Rose Quartz', hex: '#f472b6', bg: '#500724' },
  emerald: { name: 'Verdant Green', hex: '#34d399', bg: '#064e3b' },
  obsidian: { name: 'Starlit Violet', hex: '#a78bfa', bg: '#2e1065' },
}

const STORAGE_KEY = 'stxic-realm:passport:v1'

export function getPassportStamps(): RoomStamp[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function savePassportStamp(stamp: Omit<RoomStamp, 'id' | 'date'>): RoomStamp {
  const existing = getPassportStamps()
  const today = new Date().toISOString().slice(0, 10)
  const duplicate = existing.find(s => s.roomId === stamp.roomId && s.date.slice(0, 10) === today)
  if (duplicate) return duplicate

  const newStamp: RoomStamp = {
    ...stamp,
    id: `stamp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    date: new Date().toISOString(),
  }

  const updated = [newStamp, ...existing].slice(0, 50)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  } catch {}
  return newStamp
}

/**
 * Generate a deterministic emblem for a room.
 */
export function generateRoomEmblem(roomId: string, mood: string): { badge: StampBadge; ink: StampInk } {
  const badges: StampBadge[] = ['star', 'moon', 'gem', 'paw', 'flame', 'mug']
  const inks: StampInk[] = ['gold', 'cyan', 'rose', 'emerald', 'obsidian']
  
  let hash = 0
  for (let i = 0; i < roomId.length; i++) {
    hash = (hash << 5) - hash + roomId.charCodeAt(i)
    hash |= 0
  }
  hash = Math.abs(hash)

  const badge = badges[hash % badges.length]
  const ink = mood === 'tech' ? 'cyan' : mood === 'nature' ? 'emerald' : inks[(hash >> 3) % inks.length]
  return { badge, ink }
}

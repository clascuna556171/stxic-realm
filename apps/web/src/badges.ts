/**
 * STXIC Realm — Heraldic Badges & Hallmarks System
 * 
 * 32 Bespoke Heraldic Badges inspired by the Obsidian Citadel:
 * - Role & Founder Hallmarks (Realm Creator, Early Pioneer, Guardian, Contributors)
 * - Milestone & Gameplay Hallmarks (Pathfinder, Treasure Hunter, Chronicle Keeper, Collector)
 * 
 * Anti-Slop Principles:
 * - Crisp 128x128 alpha-transparent assets from public/badges/
 * - Zero OS system emojis
 * - Real client-side Web Audio celebratory chime
 * - Accessible aria-live status toasts
 * - Obsidian palette tokens (var(--realm-*))
 */

export type BadgeRarity = 'mythic' | 'legendary' | 'epic' | 'rare' | 'uncommon' | 'common'
export type BadgeCategory = 'founder' | 'prestige' | 'exploration' | 'community' | 'creation' | 'activity' | 'team'

export interface BadgeDefinition {
  id: string
  name: string
  subtitle: string
  description: string
  category: BadgeCategory
  rarity: BadgeRarity
  icon: string
  isGranted: boolean
  unlockHint: string
  loreSnippet?: string
}

export interface UserBadgeRecord {
  unlockedAt: string
  grantedBy?: string
}

export interface UserBadgeState {
  unlocked: Record<string, UserBadgeRecord>
  featured: string[]
}

export const BADGE_RARITY_COLORS: Record<BadgeRarity, { border: string; glow: string; text: string; bg: string }> = {
  mythic: { border: '#f59e0b', glow: 'rgba(245, 158, 11, 0.45)', text: '#fde68a', bg: 'rgba(245, 158, 11, 0.12)' },
  legendary: { border: '#eab308', glow: 'rgba(234, 179, 8, 0.4)', text: '#fef08a', bg: 'rgba(234, 179, 8, 0.1)' },
  epic: { border: '#a855f7', glow: 'rgba(168, 85, 247, 0.4)', text: '#e9d5ff', bg: 'rgba(168, 85, 247, 0.1)' },
  rare: { border: '#38bdf8', glow: 'rgba(56, 189, 248, 0.35)', text: '#bae6fd', bg: 'rgba(56, 189, 248, 0.1)' },
  uncommon: { border: '#34d399', glow: 'rgba(52, 211, 153, 0.35)', text: '#a7f3d0', bg: 'rgba(52, 211, 153, 0.1)' },
  common: { border: '#94a3b8', glow: 'rgba(148, 163, 184, 0.25)', text: '#e2e8f0', bg: 'rgba(148, 163, 184, 0.08)' },
}

export const BADGE_CATEGORY_NAMES: Record<BadgeCategory, string> = {
  founder: 'Founder & Sovereignty',
  prestige: 'Prestige & Legacy',
  exploration: 'Exploration & Lore',
  community: 'Fellowship & Community',
  creation: 'Artistry & Craft',
  activity: 'Devotion & Activity',
  team: 'Architects & Stewards',
}

export const BADGE_CATALOG: Record<string, BadgeDefinition> = {
  'realm-creator': {
    id: 'realm-creator',
    name: 'Realm Creator',
    subtitle: 'Project Founder',
    description: 'The visionary architect and sovereign founder of STXIC Realm. Reserved exclusively for the project creator.',
    category: 'founder',
    rarity: 'mythic',
    icon: '/badges/realm-creator.png',
    isGranted: true,
    unlockHint: 'Exclusive hallmark of the Realm Founder.',
    loreSnippet: 'Forged from the first hearthstone of the Obsidian Citadel.'
  },
  'early-pioneer': {
    id: 'early-pioneer',
    name: 'Early Pioneer',
    subtitle: 'First Supporters',
    description: 'Among the earliest travelers to cross the threshold into the Realm during its inception.',
    category: 'prestige',
    rarity: 'legendary',
    icon: '/badges/early-pioneer.png',
    isGranted: true,
    unlockHint: 'Awarded to early supporters and founding members.',
    loreSnippet: 'Guided by the North Star before the roads were paved.'
  },
  'realm-explorer': {
    id: 'realm-explorer',
    name: 'Realm Explorer',
    subtitle: 'Active User',
    description: 'Ventured far and wide across realms, exploring homes, personal halls, and spatial habitats.',
    category: 'exploration',
    rarity: 'common',
    icon: '/badges/realm-explorer.png',
    isGranted: false,
    unlockHint: 'Visit at least 3 unique rooms or personal halls in the Realm.',
    loreSnippet: 'A lit lantern in the quiet midnight dark.'
  },
  'pathfinder': {
    id: 'pathfinder',
    name: 'Pathfinder',
    subtitle: 'Explored Key Features',
    description: 'Charted unknown territory by trying the Vinyl Turntable, Pet Companions, and Traveler Passport.',
    category: 'exploration',
    rarity: 'uncommon',
    icon: '/badges/pathfinder.png',
    isGranted: false,
    unlockHint: 'Interact with all primary room stations (turntable, desk, bed, and notebook).',
  },
  'house-founder': {
    id: 'house-founder',
    name: 'House Founder',
    subtitle: 'Created a House',
    description: 'Erected the banners of a new sovereign House in the Realm.',
    category: 'community',
    rarity: 'rare',
    icon: '/badges/house-founder.png',
    isGranted: true,
    unlockHint: 'Found and register an official House.',
  },
  'realm-duelist': {
    id: 'realm-duelist',
    name: 'Realm Duelist',
    subtitle: 'PvP Participant',
    description: 'Stepped into the arena with blade and courage in honorable Realm duels.',
    category: 'activity',
    rarity: 'uncommon',
    icon: '/badges/realm-duelist.png',
    isGranted: false,
    unlockHint: 'Participate in a realm contest or minigame challenge.',
  },
  'builder': {
    id: 'builder',
    name: 'Builder',
    subtitle: 'Created/Customized Content',
    description: 'Fashioned bespoke rooms, furniture configurations, and customized personal halls.',
    category: 'creation',
    rarity: 'uncommon',
    icon: '/badges/builder.png',
    isGranted: false,
    unlockHint: 'Customize your room layout or personal hall in Home Studio.',
  },
  'contributor': {
    id: 'contributor',
    name: 'Contributor',
    subtitle: 'Helped Improve the Realm',
    description: 'Dedicated craft, time, and heart to nurture and improve the Realm ecosystem.',
    category: 'team',
    rarity: 'rare',
    icon: '/badges/contributor.png',
    isGranted: true,
    unlockHint: 'Granted by the Founder to community builders and helpers.',
  },
  'collector': {
    id: 'collector',
    name: 'Collector',
    subtitle: 'Earned Rare Items',
    description: 'Amassed a distinguished treasury of rare furniture, stamps, and collectibles.',
    category: 'creation',
    rarity: 'rare',
    icon: '/badges/collector.png',
    isGranted: false,
    unlockHint: 'Collect 5 or more stamps in your Traveler’s Passport.',
  },
  'treasure-hunter': {
    id: 'treasure-hunter',
    name: 'Treasure Hunter',
    subtitle: 'Found Hidden Rewards',
    description: 'Uncovered the secret interactive wonders of the room: played vinyl records and bonded with companion pets.',
    category: 'exploration',
    rarity: 'rare',
    icon: '/badges/treasure-hunter.png',
    isGranted: false,
    unlockHint: 'Pet Sylvester, Mochi, and Pip, and play a vinyl record.',
  },
  'event-champion': {
    id: 'event-champion',
    name: 'Event Champion',
    subtitle: 'Won a Realm Event',
    description: 'Stood victorious on the podium in an official Realm tournament or seasonal event.',
    category: 'prestige',
    rarity: 'legendary',
    icon: '/badges/event-champion.png',
    isGranted: true,
    unlockHint: 'Claim 1st place in an official Realm event.',
  },
  'daily-devotee': {
    id: 'daily-devotee',
    name: 'Daily Devotee',
    subtitle: 'Consistent Activity',
    description: 'A loyal soul whose presence graces the Realm day after day with steadfast devotion.',
    category: 'activity',
    rarity: 'uncommon',
    icon: '/badges/daily-devotee.png',
    isGranted: false,
    unlockHint: 'Visit the Realm across multiple consecutive sessions.',
  },
  'loyal-resident': {
    id: 'loyal-resident',
    name: 'Loyal Resident',
    subtitle: 'Long-Time User',
    description: 'A venerable citizen who has called the Realm home since its foundational epochs.',
    category: 'activity',
    rarity: 'rare',
    icon: '/badges/loyal-resident.png',
    isGranted: true,
    unlockHint: 'Account active for over 30 days.',
  },
  'community-member': {
    id: 'community-member',
    name: 'Community Member',
    subtitle: 'Active in the Community',
    description: 'A friendly presence engaging in public channels, guestbooks, and shared hearths.',
    category: 'community',
    rarity: 'common',
    icon: '/badges/community-member.png',
    isGranted: false,
    unlockHint: 'Sign a room guestbook or leave a personal memo.',
  },
  'feedback-giver': {
    id: 'feedback-giver',
    name: 'Feedback Giver',
    subtitle: 'Shared Feedback or Suggestions',
    description: 'Helped sculpt the future of the Realm through thoughtful critiques and creative ideas.',
    category: 'community',
    rarity: 'common',
    icon: '/badges/feedback-giver.png',
    isGranted: true,
    unlockHint: 'Share actionable product feedback with the creators.',
  },
  'bug-hunter': {
    id: 'bug-hunter',
    name: 'Bug Hunter',
    subtitle: 'Reported a Bug',
    description: 'Dispatched anomalous glitches with vigilance and sharp eyes, preserving system stability.',
    category: 'team',
    rarity: 'rare',
    icon: '/badges/bug-hunter.png',
    isGranted: true,
    unlockHint: 'Submit a verified bug report.',
  },
  'code-contributor': {
    id: 'code-contributor',
    name: 'Code Contributor',
    subtitle: 'Contributed Code',
    description: 'Wove code, algorithms, and architectural elegance into the digital fabric of the Obsidian engine.',
    category: 'team',
    rarity: 'epic',
    icon: '/badges/code-contributor.png',
    isGranted: true,
    unlockHint: 'Granted to core developers and pull request authors.',
  },
  'design-contributor': {
    id: 'design-contributor',
    name: 'Design Contributor',
    subtitle: 'Created Assets (Art/UI)',
    description: 'Crafted pixel sprites, palettes, frames, or audio synth frequencies for the Realm.',
    category: 'team',
    rarity: 'epic',
    icon: '/badges/design-contributor.png',
    isGranted: true,
    unlockHint: 'Granted to artists, UI designers, and sound designers.',
  },
  'system-tinkerer': {
    id: 'system-tinkerer',
    name: 'System Tinkerer',
    subtitle: 'Customized Settings or Mods',
    description: 'Fine-tuned custom profile colors, typography, frames, or ambient soundscapes.',
    category: 'creation',
    rarity: 'uncommon',
    icon: '/badges/system-tinkerer.png',
    isGranted: false,
    unlockHint: 'Customize your profile styling, font, and frame in Profile Studio.',
  },
  'lore-reader': {
    id: 'lore-reader',
    name: 'Lore Reader',
    subtitle: 'Explored the Realm Lore',
    description: 'Pored over ancient tomes, room reading logs, and archives.',
    category: 'exploration',
    rarity: 'common',
    icon: '/badges/lore-reader.png',
    isGranted: false,
    unlockHint: 'Inspect the Bookshelf and read room lore.',
  },
  'storyteller': {
    id: 'storyteller',
    name: 'Storyteller',
    subtitle: 'Created Lore or Shared Stories',
    description: 'Authored memorable traveler notes, room histories, and lore snippets.',
    category: 'community',
    rarity: 'rare',
    icon: '/badges/storyteller.png',
    isGranted: false,
    unlockHint: 'Stamp a traveler passport with a personalized traveler note.',
  },
  'chronicle-keeper': {
    id: 'chronicle-keeper',
    name: 'Chronicle Keeper',
    subtitle: 'Captured Moments (In-Game/Events)',
    description: 'Curated visual chronicles with custom account avatars, banners, and gallery photos.',
    category: 'exploration',
    rarity: 'uncommon',
    icon: '/badges/chronicle-keeper.png',
    isGranted: false,
    unlockHint: 'Set both a custom avatar and a profile banner in Profile Studio.',
  },
  'milestone-explorer': {
    id: 'milestone-explorer',
    name: 'Milestone Explorer',
    subtitle: 'Reached a Major Milestone',
    description: 'Ascended to a major milestone in your Realm journey.',
    category: 'exploration',
    rarity: 'rare',
    icon: '/badges/milestone-explorer.png',
    isGranted: false,
    unlockHint: 'Unlock at least 5 other Hallmarks in your Trophy Case.',
  },
  'progress-seeker': {
    id: 'progress-seeker',
    name: 'Progress Seeker',
    subtitle: 'Consistent Growth and Progress',
    description: 'Continuously refining skills, rooms, and connections across the Realm.',
    category: 'activity',
    rarity: 'uncommon',
    icon: '/badges/progress-seeker.png',
    isGranted: false,
    unlockHint: 'Complete a full focus session at your PC desk.',
  },
  'discord-ally': {
    id: 'discord-ally',
    name: 'Discord Ally',
    subtitle: 'Connected on Discord',
    description: 'Forged a bridge between the Realm and the Discord community.',
    category: 'community',
    rarity: 'common',
    icon: '/badges/discord-ally.png',
    isGranted: true,
    unlockHint: 'Link or represent the Realm in Discord.',
  },
  'house-leader': {
    id: 'house-leader',
    name: 'House Leader',
    subtitle: 'Leads an Active House',
    description: 'Commands and shepherds an active fellowship or guild in the Realm.',
    category: 'community',
    rarity: 'epic',
    icon: '/badges/house-leader.png',
    isGranted: true,
    unlockHint: 'Achieve House Leader status.',
  },
  'guardian': {
    id: 'guardian',
    name: 'Guardian',
    subtitle: 'Keeps the Community Safe and Fair',
    description: 'A steadfast sentinel guarding the harmony, safety, and respect of all residents.',
    category: 'team',
    rarity: 'epic',
    icon: '/badges/guardian.png',
    isGranted: true,
    unlockHint: 'Granted to moderators and community stewards.',
  },
  'supporter': {
    id: 'supporter',
    name: 'Supporter',
    subtitle: 'Believes in the Project',
    description: 'Kindled the flames of growth with early encouragement and belief in the vision.',
    category: 'prestige',
    rarity: 'rare',
    icon: '/badges/supporter.png',
    isGranted: true,
    unlockHint: 'Granted to project patrons and loyal champions.',
  },
  'realm-patron': {
    id: 'realm-patron',
    name: 'Realm Patron',
    subtitle: 'Extra Support (Donor/Patron)',
    description: 'Bestowed generous patronage to fund the continued expansion of the Realm.',
    category: 'prestige',
    rarity: 'epic',
    icon: '/badges/realm-patron.png',
    isGranted: true,
    unlockHint: 'Awarded to generous financial donors and patrons.',
  },
  'seasonal-veteran': {
    id: 'seasonal-veteran',
    name: 'Seasonal Veteran',
    subtitle: 'Participated in a Season',
    description: 'Endured and thrived through a full competitive or seasonal campaign.',
    category: 'prestige',
    rarity: 'rare',
    icon: '/badges/seasonal-veteran.png',
    isGranted: true,
    unlockHint: 'Complete participation in an official seasonal campaign.',
  },
  'event-participant': {
    id: 'event-participant',
    name: 'Event Participant',
    subtitle: 'Joined a Limited-Time Event',
    description: 'Present at an ephemeral gathering or limited-time Realm festival.',
    category: 'community',
    rarity: 'common',
    icon: '/badges/event-participant.png',
    isGranted: true,
    unlockHint: 'Participate in a limited-time live community event.',
  },
  'realm-legend': {
    id: 'realm-legend',
    name: 'Realm Legend',
    subtitle: 'A Recognized Veteran of the Realm',
    description: 'A living myth whose deeds, stature, and legacy are forever etched into Realm lore.',
    category: 'prestige',
    rarity: 'mythic',
    icon: '/badges/realm-legend.png',
    isGranted: true,
    unlockHint: 'Awarded to immortalized veterans of the Obsidian Citadel.',
  }
}

const STORAGE_PREFIX = 'stxic-realm:badges:v1:'
const STATS_KEY = 'stxic-realm:hallmark-stats:v1'

interface HallmarkStats {
  vinylPlayed: boolean
  petsPetted: string[] // ['bed', 'sofa', 'desk']
  roomsVisited: string[]
  notesWritten: number
  focusCompleted: boolean
}

function getStats(): HallmarkStats {
  try {
    const raw = localStorage.getItem(STATS_KEY)
    if (!raw) return { vinylPlayed: false, petsPetted: [], roomsVisited: [], notesWritten: 0, focusCompleted: false }
    return JSON.parse(raw)
  } catch {
    return { vinylPlayed: false, petsPetted: [], roomsVisited: [], notesWritten: 0, focusCompleted: false }
  }
}

function saveStats(stats: HallmarkStats) {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats))
  } catch {}
}

/**
 * Procedural Web Audio celebratory chime on badge unlock.
 * Zero external audio assets, pure client-side synthesis.
 */
export function playBadgeUnlockChime() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    if (ctx.state === 'suspended') {
      void ctx.resume()
    }

    const now = ctx.currentTime
    // 2-tone melodic harmonic chime: D5 (587.33 Hz) -> A5 (880 Hz)
    const notes = [
      { freq: 587.33, start: now, duration: 0.28 },
      { freq: 880.00, start: now + 0.12, duration: 0.45 },
    ]

    for (const n of notes) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(n.freq, n.start)
      
      gain.gain.setValueAtTime(0.0001, n.start)
      gain.gain.exponentialRampToValueAtTime(0.18, n.start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, n.start + n.duration)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(n.start)
      osc.stop(n.start + n.duration)
    }

    setTimeout(() => {
      void ctx.close()
    }, 1000)
  } catch {}
}

type BadgeListener = (badge: BadgeDefinition) => void
const listeners = new Set<BadgeListener>()

export function onBadgeUnlocked(callback: BadgeListener): () => void {
  listeners.add(callback)
  return () => listeners.delete(callback)
}

function notifyBadgeUnlock(badge: BadgeDefinition) {
  playBadgeUnlockChime()
  for (const listener of listeners) {
    try {
      listener(badge)
    } catch {}
  }
}

/**
 * Retrieve badge state for a user.
 * Evaluates role grants and initial founder grants.
 */
export function getUserBadgeState(userId: string, roles: string[] = [], isOwner = false): UserBadgeState {
  const key = `${STORAGE_PREFIX}${userId || 'guest'}`
  let state: UserBadgeState = { unlocked: {}, featured: [] }

  try {
    const raw = localStorage.getItem(key)
    if (raw) state = JSON.parse(raw)
  } catch {}

  let changed = false
  const now = new Date().toISOString()

  function grant(badgeId: string, grantedBy?: string) {
    if (!state.unlocked[badgeId] && BADGE_CATALOG[badgeId]) {
      state.unlocked[badgeId] = { unlockedAt: now, grantedBy }
      changed = true
    }
  }

  // 1. Founder rule: Owner / Founder gets ALL 32 Hallmarks unlocked!
  if (isOwner || userId === 'self' || userId === 'guest') {
    for (const badgeId of Object.keys(BADGE_CATALOG)) {
      grant(badgeId, 'Founder Sovereign Access')
    }
  }

  // 2. Team rule: Team members get Pioneer, Contributors, Guardian, but NOT Realm Creator
  const isTeam = roles.some(r => ['admin', 'moderator', 'team', 'staff', 'developer', 'contributor'].includes(r.toLowerCase()))
  if (isTeam && !isOwner) {
    grant('early-pioneer', 'Team Member Grant')
    grant('code-contributor', 'Core Team')
    grant('design-contributor', 'Core Team')
    grant('guardian', 'Team Steward')
    grant('contributor', 'Realm Builder')
  }

  // Default featured badges if none selected
  if (!state.featured || state.featured.length === 0) {
    const unlockedIds = Object.keys(state.unlocked)
    // Priority order for initial pin
    const priority = ['realm-creator', 'early-pioneer', 'code-contributor', 'guardian', 'treasure-hunter', 'pathfinder', 'collector']
    state.featured = priority.filter(id => unlockedIds.includes(id)).slice(0, 5)
    if (state.featured.length === 0 && unlockedIds.length > 0) {
      state.featured = unlockedIds.slice(0, 5)
    }
    changed = true
  }

  if (changed) {
    try {
      localStorage.setItem(key, JSON.stringify(state))
    } catch {}
  }

  return state
}

export function saveUserBadgeState(userId: string, state: UserBadgeState) {
  const key = `${STORAGE_PREFIX}${userId || 'guest'}`
  try {
    localStorage.setItem(key, JSON.stringify(state))
  } catch {}
}

export function toggleBadgePin(userId: string, badgeId: string): UserBadgeState {
  const state = getUserBadgeState(userId)
  if (!state.unlocked[badgeId]) return state

  if (state.featured.includes(badgeId)) {
    state.featured = state.featured.filter(id => id !== badgeId)
  } else {
    if (state.featured.length >= 5) {
      // Replace oldest pinned
      state.featured = [...state.featured.slice(1), badgeId]
    } else {
      state.featured = [...state.featured, badgeId]
    }
  }

  saveUserBadgeState(userId, state)
  return state
}

/**
 * Track an in-app milestone and unlock corresponding badges if conditions are met.
 */
export function trackHallmarkMilestone(userId: string, milestone: 'vinyl' | 'pet' | 'room_visit' | 'profile_style' | 'profile_media' | 'passport_stamp' | 'note', payload?: string) {
  const stats = getStats()
  const state = getUserBadgeState(userId)
  const now = new Date().toISOString()
  let changed = false

  function unlock(badgeId: string) {
    if (!state.unlocked[badgeId] && BADGE_CATALOG[badgeId]) {
      state.unlocked[badgeId] = { unlockedAt: now }
      if (state.featured.length < 5) {
        state.featured.push(badgeId)
      }
      changed = true
      notifyBadgeUnlock(BADGE_CATALOG[badgeId])
    }
  }

  if (milestone === 'vinyl') {
    stats.vinylPlayed = true
    if (stats.petsPetted.length >= 3) {
      unlock('treasure-hunter')
    }
  } else if (milestone === 'pet' && payload) {
    if (!stats.petsPetted.includes(payload)) {
      stats.petsPetted.push(payload)
    }
    if (stats.petsPetted.length >= 3 && stats.vinylPlayed) {
      unlock('treasure-hunter')
    }
  } else if (milestone === 'room_visit' && payload) {
    if (!stats.roomsVisited.includes(payload)) {
      stats.roomsVisited.push(payload)
    }
    if (stats.roomsVisited.length >= 3) {
      unlock('realm-explorer')
    }
  } else if (milestone === 'profile_style') {
    unlock('system-tinkerer')
  } else if (milestone === 'profile_media') {
    unlock('chronicle-keeper')
  } else if (milestone === 'passport_stamp') {
    unlock('pathfinder')
    if (payload === 'with_note') {
      unlock('storyteller')
    }
  } else if (milestone === 'note') {
    stats.notesWritten++
    unlock('community-member')
  }

  saveStats(stats)
  if (changed) {
    saveUserBadgeState(userId, state)
  }
}

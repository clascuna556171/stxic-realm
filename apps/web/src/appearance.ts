export const APPEARANCE_KEY = 'stxic-realm:appearance:v1'
export const accents = { obsidian: '#dedee6', sage: '#a6d8bc', ocean: '#a8d8e2', clay: '#f0bd9c', violet: '#d2b9f5', mist: '#e9e8df' } as const
export const skins = ['#f3c9ae', '#d9a27f', '#b87954', '#805039', '#493022'] as const
export const hairs = ['#282126', '#584038', '#a46a42', '#d9bb7c', '#d9d9d5'] as const
export const outfits = { everyday: '#777b91', medieval: '#785949', tech: '#435d71' } as const
export const hairStyles = ['short', 'long', 'curly', 'swept'] as const
export const accessories = ['none', 'glasses', 'headphones', 'crown'] as const
export const eyeColors = { dark:'#282126', brown:'#684832', blue:'#426c85', green:'#4d7351' } as const
export const moods = ['cozy', 'medieval', 'tech'] as const
export type Appearance = { accent: keyof typeof accents; logo: keyof typeof accents; skin: typeof skins[number]; hair: typeof hairs[number]; outfit: keyof typeof outfits; hairStyle: typeof hairStyles[number]; accessory: typeof accessories[number]; eyes: keyof typeof eyeColors; mood: typeof moods[number] }
export const defaults: Appearance = { accent:'obsidian', logo:'mist', skin:skins[1], hair:hairs[0], outfit:'everyday', hairStyle:'short', accessory:'none', eyes:'dark', mood:'cozy' }
export function parseAppearance(raw: string | null): Appearance {
  try {
    const v = JSON.parse(raw ?? '{}') as Partial<Appearance>
    return { accent: v.accent && Object.hasOwn(accents,v.accent) ? v.accent : defaults.accent, logo: v.logo && Object.hasOwn(accents,v.logo) ? v.logo : defaults.logo, skin: skins.includes(v.skin as typeof skins[number]) ? v.skin! : defaults.skin, hair: hairs.includes(v.hair as typeof hairs[number]) ? v.hair! : defaults.hair, outfit: v.outfit && Object.hasOwn(outfits,v.outfit) ? v.outfit : defaults.outfit, hairStyle: hairStyles.includes(v.hairStyle as typeof hairStyles[number]) ? v.hairStyle! : defaults.hairStyle, accessory: accessories.includes(v.accessory as typeof accessories[number]) ? v.accessory! : defaults.accessory, eyes: v.eyes && Object.hasOwn(eyeColors,v.eyes) ? v.eyes : defaults.eyes, mood: moods.includes(v.mood as typeof moods[number]) ? v.mood! : defaults.mood }
  } catch { return { ...defaults } }
}
let accountAppearance: Appearance | null = null
export function setAccountAppearance(value: Appearance | null) { accountAppearance = value ? { ...value } : null }
export function readAppearance(): Appearance { if(accountAppearance) return { ...accountAppearance }; try { return parseAppearance(localStorage.getItem(APPEARANCE_KEY)) } catch { return { ...defaults } } }
export function applyAppearance(value: Appearance) { document.documentElement.style.setProperty('--realm-accent',accents[value.accent]); document.documentElement.style.setProperty('--realm-logo',accents[value.logo]) }

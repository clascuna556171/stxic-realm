export const frameShapes = ['circle', 'rounded-square', 'square'] as const
export type FrameShape = typeof frameShapes[number]
export const frameIds = ['dark-realm', 'royal-legend', 'nature-spirit', 'cyber-core', 'minimal-mono', 'cozy-friends'] as const
export type FrameId = typeof frameIds[number]
export type FrameCollection = {
 id: FrameId; name: string; description: string; category: string; material: string
 palette: readonly [string, string, string]; assets: Record<FrameShape, string>
 effect: 'ember' | 'glimmer' | 'firefly' | 'pulse' | 'sparkle' | 'twinkle'; available: boolean
}
const collection = (id: FrameId, name: string, description: string, category: string, material: string, palette: FrameCollection['palette'], effect: FrameCollection['effect']): FrameCollection => ({
 id, name, description, category, material, palette, effect, available: true,
 assets: Object.fromEntries(frameShapes.map(shape => [shape, `/profile-frames/${id}-${shape}.svg`])) as Record<FrameShape, string>,
})
// Order intentionally moves from dark materials to light, playful ones.
export const frameCatalog: readonly FrameCollection[] = [
 collection('dark-realm', 'Dark Realm', 'Blackened steel. A heart of crimson.', 'Dark fantasy', 'Obsidian · garnet', ['#242631', '#ab3045', '#d6c5c5'], 'ember'),
 collection('royal-legend', 'Royal Legend', 'A little ceremony for your everyday.', 'High fantasy', 'Gilded brass · sapphire', ['#d7ac54', '#315b8b', '#fff0b6'], 'glimmer'),
 collection('nature-spirit', 'Nature Spirit', 'Something wild, quietly taking root.', 'Woodland', 'Willow · fern · moonflower', ['#667f40', '#c9d88a', '#93e8d5'], 'firefly'),
 collection('cyber-core', 'Cyber Core', 'Precision hardware. After-hours light.', 'Future tech', 'Titanium · cyan circuitry', ['#51dceb', '#9293f0', '#333f56'], 'pulse'),
 collection('minimal-mono', 'Minimal Mono', 'Just enough detail. Room to be you.', 'Minimal', 'Porcelain · ink', ['#f3f0e5', '#999da3', '#22252c'], 'sparkle'),
 collection('cozy-friends', 'Cozy Friends', 'A small circle of very good company.', 'Playful', 'Peach enamel · lilac charms', ['#f3a5b2', '#c8b4ee', '#ffe2ae'], 'twinkle'),
]
export function getFrame(id: unknown) { return frameCatalog.find(frame => frame.id === id && frame.available) }
export function frameShape(value: unknown): FrameShape { return value === 'rounded' || value === 'rounded-square' ? 'rounded-square' : value === 'square' ? 'square' : 'circle' }
export function frameSelection(style?: {frame_id?: unknown; avatar_shape?: unknown; frame_effects?: unknown}) {
 return {frameId: getFrame(style?.frame_id)?.id ?? 'none', frameShape: frameShape(style?.avatar_shape), showEffects: style?.frame_effects === true}
}
export function validateFrameCatalog(catalog: readonly FrameCollection[] = frameCatalog) {
 const ids = new Set<string>(), assets = new Set<string>()
 for (const item of catalog) {
  if (!frameIds.includes(item.id) || ids.has(item.id) || !item.name || !item.description || item.palette.some(color => !/^#[0-9a-f]{6}$/i.test(color))) throw new Error('Invalid frame collection')
  ids.add(item.id)
  for (const shape of frameShapes) {
   const path = item.assets[shape]
   if (!path || !path.startsWith('/profile-frames/') || assets.has(path)) throw new Error('Missing or duplicate frame artwork')
   assets.add(path)
  }
 }
 return true
}
validateFrameCatalog()

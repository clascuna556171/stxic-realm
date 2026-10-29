import type { Appearance } from '../appearance.ts'

export const HALL = { width: 768, height: 512, tile: 32, columns: 24, rows: 16 } as const
export const HALL_STORAGE_PREFIX = 'stxic-realm:hall:v1:'
export const hallThemes = ['cozy', 'medieval', 'tech'] as const
export const doorStyles = ['oak', 'stone', 'portal'] as const
export type DoorStyle = typeof doorStyles[number]
export const hallCatalog = [
 { kind: 'round-table', name: 'Gathering table', width: 3, height: 2, description: 'A round oak table, books and a warm drink.' },
 { kind: 'hearth', name: 'Stone hearth', width: 3, height: 3, description: 'Carved stone, stacked logs and a small fire.' },
 { kind: 'bookshelf', name: 'Library shelf', width: 2, height: 2, description: 'Well-worn books, climbing ivy and collected curios.' },
 { kind: 'sofa', name: 'Reading sofa', width: 3, height: 2, description: 'Soft cushions and a sleeping companion.' },
 { kind: 'plant', name: 'Potted fern', width: 1, height: 1, description: 'A little life between the stone and timber.' },
 { kind: 'lantern', name: 'Brass lantern', width: 1, height: 1, description: 'A warm pool of light wherever you place it.' },
 { kind: 'banner', name: 'Heraldic banner', width: 1, height: 1, description: 'Woven cloth and a brass Realm crest.' },
 { kind: 'desk', name: 'Project desk', width: 3, height: 2, description: 'A place for your next idea.' },
 { kind: 'console', name: 'Music console', width: 1, height: 1, description: 'A record player and a little modern magic.' },
 { kind: 'floor-lamp', name: 'Reading lamp', width: 1, height: 1, description: 'A shaded lamp for a quiet corner.' },
] as const
export type HallKind = typeof hallCatalog[number]['kind']
export type HallPiece = { id: string; kind: HallKind; x: number; y: number }
export type HallLayout = { version: 1; theme: Appearance['mood']; doors: [DoorStyle, DoorStyle, DoorStyle]; rug: boolean; greenery: boolean; pieces: HallPiece[] }

export const hallStorageKey = (user?: string) => HALL_STORAGE_PREFIX + (user ?? 'guest')
export function starterHall(theme: Appearance['mood'] = 'cozy'): HallLayout {
 return { version: 1, theme, doors: theme === 'tech' ? ['portal', 'portal', 'portal'] : ['oak', 'stone', 'oak'], rug: true, greenery: true, pieces: [
  { id: 'library-west', kind: 'bookshelf', x: 2, y: 7 },
  { id: 'library-east', kind: 'bookshelf', x: 20, y: 7 },
  { id: 'hearth-east', kind: 'hearth', x: 18, y: 11 },
  { id: 'gathering-west', kind: 'round-table', x: 4, y: 11 },
  { id: 'reading-west', kind: 'sofa', x: 2, y: 9 },
  { id: 'fern-west', kind: 'plant', x: 2, y: 13 },
  { id: 'fern-east', kind: 'plant', x: 21, y: 13 },
  { id: 'lantern-west', kind: 'lantern', x: 8, y: 10 },
  { id: 'lantern-east', kind: 'lantern', x: 16, y: 10 },
 ] }
}

export function hallPlacementError(layout: HallLayout): string | null {
 const cells = new Set<string>(), ids = new Set<string>()
 if (layout.pieces.length > 32) return 'A hall can hold up to 32 components.'
 for (const piece of layout.pieces) {
  const item = hallCatalog.find(c => c.kind === piece.kind)
  if (!item || typeof piece.id !== 'string' || !/^[a-zA-Z0-9-]{1,80}$/.test(piece.id) || ids.has(piece.id)) return 'Unknown or duplicate hall component.'
  ids.add(piece.id)
  if (!Number.isInteger(piece.x) || !Number.isInteger(piece.y) || piece.x < 1 || piece.y < 7 || piece.x + item.width > 23 || piece.y + item.height > 15) return `${item.name} must fit on the hall floor (rows 8–15).`
  for (let y = piece.y; y < piece.y + item.height; y++) for (let x = piece.x; x < piece.x + item.width; x++) {
   // A full central aisle and the landing immediately in front of each door stay open.
   if (x >= 10 && x <= 13 || y <= 8 && [5, 6, 11, 12, 17, 18].includes(x)) return 'Keep the central aisle and door landings clear.'
   const cell = `${x},${y}`
   if (cells.has(cell)) return 'Hall components cannot overlap.'
   cells.add(cell)
  }
 }
 return null
}

export function parseHall(raw: string | null): HallLayout | null {
 try {
  const value = JSON.parse(raw ?? 'null') as HallLayout
  if (!value || value.version !== 1 || !hallThemes.includes(value.theme) || !Array.isArray(value.doors) || value.doors.length !== 3 || value.doors.some(d => !doorStyles.includes(d)) || typeof value.rug !== 'boolean' || typeof value.greenery !== 'boolean' || !Array.isArray(value.pieces) || value.pieces.some(p => !p || typeof p !== 'object') || hallPlacementError(value)) return null
  // Only recognized fields enter the render/save path.
  return { version: 1, theme: value.theme, doors: [...value.doors], rug: value.rug, greenery: value.greenery, pieces: value.pieces.map(p => ({ id: p.id, kind: p.kind, x: p.x, y: p.y })) }
 } catch { return null }
}

export function placeHallPiece(layout: HallLayout, piece: HallPiece): { layout: HallLayout; error: string | null } {
 const next = { ...layout, pieces: layout.pieces.some(p => p.id === piece.id) ? layout.pieces.map(p => p.id === piece.id ? { ...piece } : p) : [...layout.pieces, { ...piece }] }
 const error = hallPlacementError(next)
 return { layout: error ? layout : next, error }
}
export function firstHallPosition(layout: HallLayout, kind: HallKind): HallPiece | null {
 for (let y = 7; y < 15; y++) for (let x = 1; x < 23; x++) {
  const piece = { id: 'new-component', kind, x, y }
  if (!placeHallPiece(layout, piece).error) return piece
 }
 return null
}

export type HallHistory = { past: HallLayout[]; present: HallLayout; future: HallLayout[] }
export function editHall(history: HallHistory, next: HallLayout): HallHistory {
 if (JSON.stringify(history.present) === JSON.stringify(next) || !parseHall(JSON.stringify(next))) return history
 return { past: [...history.past, history.present].slice(-50), present: next, future: [] }
}
export function travelHall(history: HallHistory, direction: 'undo' | 'redo'): HallHistory {
 if (direction === 'undo') return history.past.length ? { past: history.past.slice(0, -1), present: history.past.at(-1)!, future: [history.present, ...history.future] } : history
 return history.future.length ? { past: [...history.past, history.present], present: history.future[0], future: history.future.slice(1) } : history
}

export interface RealmTheme {
  id: string
  name: string
  category: 'default' | 'color'
  colorScheme: 'light' | 'dark'
  previewBg: string
  previewSurface: string
  previewAccent: string
  description: string
  variables: Record<string, string>
}

export const THEMES: RealmTheme[] = [
  // Default Themes
  {
    id: 'light',
    name: 'Light',
    category: 'default',
    colorScheme: 'light',
    previewBg: '#f2f3f5',
    previewSurface: '#ffffff',
    previewAccent: '#5865f2',
    description: 'Clean, high-contrast light mode',
    variables: {
      '--realm-bg': '#f2f3f5',
      '--realm-surface': '#ffffff',
      '--realm-raised': '#e3e5e8',
      '--realm-inset': '#ebedef',
      '--realm-line': '#d1d4db',
      '--realm-text': '#060607',
      '--realm-muted': '#4e5058',
      '--realm-accent': '#5865f2',
      '--realm-on-accent': '#ffffff',
      '--realm-selected': 'rgba(0, 0, 0, 0.08)',
      '--realm-save-btn-bg': '#23a55a',
      '--realm-save-btn-text': '#ffffff',
      '--realm-save-btn-hover': '#1f8b4c',
      '--realm-action-btn-bg': '#23a55a',
      '--realm-action-btn-text': '#ffffff',
      '--realm-action-btn-hover': '#1f8b4c',
    },
  },
  {
    id: 'ash',
    name: 'Ash',
    category: 'default',
    colorScheme: 'dark',
    previewBg: '#2b2d31',
    previewSurface: '#313338',
    previewAccent: '#5865f2',
    description: 'Smooth charcoal gray medium theme',
    variables: {
      '--realm-bg': '#2b2d31',
      '--realm-surface': '#313338',
      '--realm-raised': '#383a40',
      '--realm-inset': '#1e1f22',
      '--realm-line': '#3f4147',
      '--realm-text': '#dbdee1',
      '--realm-muted': '#949ba4',
      '--realm-accent': '#5865f2',
      '--realm-on-accent': '#ffffff',
      '--realm-selected': 'rgba(255, 255, 255, 0.08)',
      '--realm-save-btn-bg': '#23a55a',
      '--realm-save-btn-text': '#ffffff',
      '--realm-save-btn-hover': '#1f8b4c',
      '--realm-action-btn-bg': '#23a55a',
      '--realm-action-btn-text': '#ffffff',
      '--realm-action-btn-hover': '#1f8b4c',
    },
  },
  {
    id: 'dark',
    name: 'Dark',
    category: 'default',
    colorScheme: 'dark',
    previewBg: '#101115',
    previewSurface: '#18191f',
    previewAccent: '#dedee6',
    description: 'Classic dark Realm theme',
    variables: {
      '--realm-bg': '#101115',
      '--realm-surface': '#18191f',
      '--realm-raised': '#22242d',
      '--realm-inset': '#14151a',
      '--realm-line': '#30323d',
      '--realm-text': '#ececf1',
      '--realm-muted': '#a6a8b7',
      '--realm-accent': '#dedee6',
      '--realm-on-accent': '#101115',
      '--realm-selected': 'rgba(255, 255, 255, 0.08)',
      '--realm-save-btn-bg': '#23a55a',
      '--realm-save-btn-text': '#ffffff',
      '--realm-save-btn-hover': '#1f8b4c',
      '--realm-action-btn-bg': '#23a55a',
      '--realm-action-btn-text': '#ffffff',
      '--realm-action-btn-hover': '#1f8b4c',
    },
  },
  {
    id: 'onyx',
    name: 'Onyx',
    category: 'default',
    colorScheme: 'dark',
    previewBg: '#000000',
    previewSurface: '#0c0d10',
    previewAccent: '#ffffff',
    description: 'Pitch black OLED theme',
    variables: {
      '--realm-bg': '#000000',
      '--realm-surface': '#0c0d10',
      '--realm-raised': '#16171d',
      '--realm-inset': '#050507',
      '--realm-line': '#202129',
      '--realm-text': '#f5f5f7',
      '--realm-muted': '#8a8b94',
      '--realm-accent': '#ffffff',
      '--realm-on-accent': '#000000',
      '--realm-selected': 'rgba(255, 255, 255, 0.12)',
      '--realm-save-btn-bg': '#23a55a',
      '--realm-save-btn-text': '#ffffff',
      '--realm-save-btn-hover': '#1f8b4c',
      '--realm-action-btn-bg': '#23a55a',
      '--realm-action-btn-text': '#ffffff',
      '--realm-action-btn-hover': '#1f8b4c',
    },
  },
  // Color Themes
  {
    id: 'forest-green',
    name: 'Forest Green',
    category: 'color',
    colorScheme: 'dark',
    previewBg: '#0a140d',
    previewSurface: '#122217',
    previewAccent: '#2ecc71',
    description: 'Deep ancient pine and mossy evergreen atmosphere',
    variables: {
      '--realm-bg': '#0a140d',
      '--realm-surface': '#122217',
      '--realm-raised': '#1b3223',
      '--realm-inset': '#070f0a',
      '--realm-line': '#274732',
      '--realm-text': '#e3f3e6',
      '--realm-muted': '#7fa588',
      '--realm-accent': '#2ecc71',
      '--realm-on-accent': '#05180c',
      '--realm-selected': 'rgba(46, 204, 113, 0.14)',
      '--realm-save-btn-bg': '#2ecc71',
      '--realm-save-btn-text': '#ffffff',
      '--realm-save-btn-hover': '#27ae60',
      '--realm-action-btn-bg': '#2ecc71',
      '--realm-action-btn-text': '#ffffff',
      '--realm-action-btn-hover': '#27ae60',
    },
  },
  {
    id: 'ocean-blue',
    name: 'Ocean Blue',
    category: 'color',
    colorScheme: 'dark',
    previewBg: '#08101e',
    previewSurface: '#0f1d32',
    previewAccent: '#38bdf8',
    description: 'Twilight oceanic abyss and phosphorescent deep navy',
    variables: {
      '--realm-bg': '#08101e',
      '--realm-surface': '#0f1d32',
      '--realm-raised': '#162b47',
      '--realm-inset': '#050b15',
      '--realm-line': '#213f68',
      '--realm-text': '#e1edfd',
      '--realm-muted': '#7c9ec3',
      '--realm-accent': '#38bdf8',
      '--realm-on-accent': '#031726',
      '--realm-selected': 'rgba(56, 189, 248, 0.14)',
      '--realm-save-btn-bg': '#0284c7',
      '--realm-save-btn-text': '#ffffff',
      '--realm-save-btn-hover': '#0369a1',
      '--realm-action-btn-bg': '#0284c7',
      '--realm-action-btn-text': '#ffffff',
      '--realm-action-btn-hover': '#0369a1',
    },
  },
  {
    id: 'gothic-red',
    name: 'Gothic Red',
    category: 'color',
    colorScheme: 'dark',
    previewBg: '#15080a',
    previewSurface: '#220e12',
    previewAccent: '#e63946',
    description: 'Vampiric velvet noir and deep gothic blood-crimson',
    variables: {
      '--realm-bg': '#15080a',
      '--realm-surface': '#220e12',
      '--realm-raised': '#32151b',
      '--realm-inset': '#0d0406',
      '--realm-line': '#4a1e27',
      '--realm-text': '#fce8eb',
      '--realm-muted': '#b47e88',
      '--realm-accent': '#e63946',
      '--realm-on-accent': '#ffffff',
      '--realm-selected': 'rgba(230, 57, 70, 0.16)',
      '--realm-save-btn-bg': '#e63946',
      '--realm-save-btn-text': '#ffffff',
      '--realm-save-btn-hover': '#c92a37',
      '--realm-action-btn-bg': '#e63946',
      '--realm-action-btn-text': '#ffffff',
      '--realm-action-btn-hover': '#c92a37',
    },
  },
]

export const THEME_STORAGE_KEY = 'stxic-realm:theme'

export function getActiveTheme(): string {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY)
    if (saved && THEMES.some(t => t.id === saved)) return saved
  } catch {}
  return 'dark'
}

export function applyTheme(themeId: string) {
  const theme = THEMES.find(t => t.id === themeId) || THEMES.find(t => t.id === 'dark')!
  const root = document.documentElement
  root.setAttribute('data-theme', theme.id)
  root.style.colorScheme = theme.colorScheme
  Object.entries(theme.variables).forEach(([k, v]) => {
    root.style.setProperty(k, v)
  })
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme.id)
  } catch {}
  window.dispatchEvent(new CustomEvent('realm:theme-change', { detail: theme.id }))
}

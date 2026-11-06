import {useState, useEffect} from 'react'
import {WorkspaceNav} from './WorkspaceNav'
import {Icon} from './Icon'
import {THEMES, getActiveTheme, applyTheme, type RealmTheme} from './theme'
import './appearance-theme.css'
import {GlassToggle} from './GlassToggle'

export default function AppearanceTheme() {
  const [selectedTheme, setSelectedTheme] = useState<string>(() => getActiveTheme())

  useEffect(() => {
    const onThemeChange = (e: Event) => {
      const detail = (e as CustomEvent)?.detail
      if (typeof detail === 'string') setSelectedTheme(detail)
    }
    window.addEventListener('realm:theme-change', onThemeChange)
    return () => window.removeEventListener('realm:theme-change', onThemeChange)
  }, [])

  function handleSelectTheme(themeId: string) {
    setSelectedTheme(themeId)
    applyTheme(themeId)
  }

  const defaultThemes = THEMES.filter(t => t.category === 'default')
  const colorThemes = THEMES.filter(t => t.category === 'color')

  return (
    <main className="workspace-page appearance-theme-page">
      <WorkspaceNav current="settings" />
      <header className="workspace-header">
        <strong>Appearance Theme</strong>
        <a href="/?settings">
          Back to settings <Icon name="back" />
        </a>
      </header>

      <div className="appearance-theme-content">
        <div className="appearance-theme-intro">
          <h1>Appearance Theme</h1>
          <p className="muted">Customize the colors and visual mood of Realm on this device.</p>
        </div>

        <GlassToggle showIcon/>
        {/* Default Themes */}
        <section className="theme-group-section" aria-labelledby="default-themes-title">
          <h2 id="default-themes-title" className="theme-group-title">Default Themes</h2>
          <div className="theme-tile-grid default-themes-grid" role="radiogroup" aria-label="Default Themes">
            {defaultThemes.map(t => {
              const isSelected = selectedTheme === t.id
              return (
                <button
                  type="button"
                  key={t.id}
                  role="radio"
                  aria-checked={isSelected}
                  className={`theme-card ${isSelected ? 'is-selected' : ''}`}
                  onClick={() => handleSelectTheme(t.id)}
                >
                  <div
                    className={`theme-tile-preview tile-${t.id}`}
                    style={{
                      background: t.previewSurface,
                      borderColor: isSelected ? 'var(--realm-accent, #5865f2)' : t.variables['--realm-line'],
                    }}
                  >
                    <div className="theme-tile-inner-strip" style={{ background: t.previewBg }} />
                    {isSelected && (
                      <span className="theme-checked-badge" aria-hidden="true">
                        <Icon name="check" />
                      </span>
                    )}
                  </div>
                  <span className="theme-card-name">{t.name}</span>
                </button>
              )
            })}
          </div>
        </section>

        {/* Color Themes */}
        <section className="theme-group-section" aria-labelledby="color-themes-title">
          <h2 id="color-themes-title" className="theme-group-title">Color Themes</h2>
          <div className="theme-tile-grid color-themes-grid" role="radiogroup" aria-label="Color Themes">
            {colorThemes.map(t => {
              const isSelected = selectedTheme === t.id
              return (
                <button
                  type="button"
                  key={t.id}
                  role="radio"
                  aria-checked={isSelected}
                  className={`theme-card color-theme-card ${isSelected ? 'is-selected' : ''}`}
                  onClick={() => handleSelectTheme(t.id)}
                >
                  <div
                    className={`theme-tile-preview color-preview tile-${t.id}`}
                    style={{
                      background: t.previewSurface,
                      borderColor: isSelected ? t.previewAccent : t.variables['--realm-line'],
                    }}
                  >
                    <div className="theme-color-layers">
                      <div className="color-layer-bg" style={{ background: t.previewBg }} />
                      <div className="color-layer-accent" style={{ background: t.previewAccent }} />
                    </div>
                    {isSelected && (
                      <span className="theme-checked-badge" style={{ background: t.previewAccent }} aria-hidden="true">
                        <Icon name="check" />
                      </span>
                    )}
                  </div>
                  <div className="theme-card-text">
                    <strong className="theme-card-name">{t.name}</strong>
                    <small className="theme-card-desc muted">{t.description}</small>
                  </div>
                </button>
              )
            })}
          </div>
        </section>
      </div>
    </main>
  )
}

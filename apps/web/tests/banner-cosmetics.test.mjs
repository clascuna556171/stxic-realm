import test from 'node:test'
import assert from 'node:assert/strict'
import { BANNER_SHROUDS, BANNER_ANTHEMS, getAnthemMeta, getShroudMeta } from '../src/banner-cosmetics.ts'
import { VINYL_CATALOG } from '../src/world/vinyl.ts'

test('banner shroud catalog contains valid unique ids and descriptions', () => {
  const ids = BANNER_SHROUDS.map(s => s.id)
  assert.equal(new Set(ids).size, BANNER_SHROUDS.length, 'Shroud IDs must be unique')
  assert.ok(ids.includes('none'), 'Must contain none')
  assert.ok(ids.includes('crows'), 'Must contain crows')
  assert.ok(ids.includes('embers'), 'Must contain embers')
  assert.ok(ids.includes('mist'), 'Must contain mist')
  assert.ok(ids.includes('stardust'), 'Must contain stardust')

  for (const shroud of BANNER_SHROUDS) {
    assert.ok(shroud.name.length > 0, `Shroud ${shroud.id} must have a name`)
    assert.ok(shroud.description.length > 0, `Shroud ${shroud.id} must have a description`)
  }
})

test('banner anthem catalog contains valid tracks and valid vinyl key mappings', () => {
  const ids = BANNER_ANTHEMS.map(a => a.id)
  assert.equal(new Set(ids).size, BANNER_ANTHEMS.length, 'Anthem IDs must be unique')
  assert.ok(ids.includes('none'))
  assert.ok(ids.includes('midnight-vinyl'))
  assert.ok(ids.includes('lofi-hearth'))
  assert.ok(ids.includes('starlight-drift'))
  assert.ok(ids.includes('obsidian-groove'))
  assert.ok(ids.includes('custom'))

  const vinylIds = new Set(VINYL_CATALOG.map(v => v.id))
  for (const anthem of BANNER_ANTHEMS) {
    assert.ok(anthem.name.length > 0, `Anthem ${anthem.id} must have a name`)
    if (anthem.trackKey) {
      assert.ok(vinylIds.has(anthem.trackKey), `Anthem trackKey ${anthem.trackKey} must exist in VINYL_CATALOG`)
    }
  }
})

test('getAnthemMeta resolves correctly and falls back to none for unknown/null', () => {
  assert.equal(getAnthemMeta('midnight-vinyl').id, 'midnight-vinyl')
  assert.equal(getAnthemMeta('unknown-track').id, 'none')
  assert.equal(getAnthemMeta(null).id, 'none')
  assert.equal(getAnthemMeta(undefined).id, 'none')
  assert.equal(getAnthemMeta('custom').id, 'custom')
  assert.equal(getShroudMeta('crows').id, 'crows')
  assert.equal(getShroudMeta(null).id, 'none')
})

test('profile shroud entrance transitions are defined for all shroud cosmetics with reduced motion support', async () => {
  const { readFileSync } = await import('node:fs')
  const { resolve } = await import('node:path')
  const css = readFileSync(resolve(import.meta.dirname, '../src/account-profile.css'), 'utf8')

  // Verify card entrance pulse classes
  assert.ok(css.includes('.account-profile-card.shroud-entering'), 'Must have base shroud-entering card rule')
  assert.ok(css.includes('.account-profile-card.shroud-crows.shroud-entering'), 'Must have crows entrance pulse')
  assert.ok(css.includes('.account-profile-card.shroud-embers.shroud-entering'), 'Must have embers entrance pulse')
  assert.ok(css.includes('.account-profile-card.shroud-mist.shroud-entering'), 'Must have mist entrance pulse')
  assert.ok(css.includes('.account-profile-card.shroud-stardust.shroud-entering'), 'Must have stardust entrance pulse')

  // Verify signature entrance particle bursts
  assert.ok(css.includes('.shroud-crow-swoop'), 'Must have crow swoop entrance element')
  assert.ok(css.includes('.shroud-feather-burst'), 'Must have feather burst flurry')
  assert.ok(css.includes('.shroud-ember-burst'), 'Must have ember spark burst')
  assert.ok(css.includes('.shroud-mist-veil'), 'Must have parting mist veil')
  assert.ok(css.includes('.shroud-stardust-streak'), 'Must have celestial streak sweep')
  assert.ok(css.includes('.shroud-star-burst'), 'Must have blooming star burst')

  // Verify studio preview button
  assert.ok(css.includes('.profile-preview-reveal-btn'), 'Must have studio reveal preview button style')

  // Verify reduced-motion protection suppresses entrance bursts
  const reducedMotionIndex = css.lastIndexOf('@media (prefers-reduced-motion: reduce)')
  assert.ok(reducedMotionIndex !== -1, 'Must contain reduced motion query')
  const reducedSlice = css.slice(reducedMotionIndex)
  assert.ok(reducedSlice.includes('.account-profile-card.shroud-entering'), 'Reduced motion must suppress card entrance pulse')
  assert.ok(reducedSlice.includes('.shroud-crow-swoop'), 'Reduced motion must hide crow swoop')
  assert.ok(reducedSlice.includes('.shroud-mist-veil'), 'Reduced motion must hide mist veil')
})

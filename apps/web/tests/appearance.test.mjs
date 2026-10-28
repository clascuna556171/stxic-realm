import test from 'node:test'
import assert from 'node:assert/strict'
import { defaults, parseAppearance } from '../src/appearance.ts'

test('appearance settings round trip and reject invalid values', () => {
  const saved = { ...defaults, accent:'ocean', logo:'violet', outfit:'medieval', mood:'tech' }
  assert.deepEqual(parseAppearance(JSON.stringify(saved)), saved)
  assert.deepEqual(parseAppearance('{'), defaults)
  assert.deepEqual(parseAppearance(JSON.stringify({accent:'unknown', skin:'red', outfit:'other', mood:'bad'})), defaults)
})


test('older saved appearances gain defaults for new character options', () => {
 const old = { accent:'ocean', logo:'violet', skin: defaults.skin, hair: defaults.hair, outfit:'medieval', mood:'tech' }
 assert.deepEqual(parseAppearance(JSON.stringify(old)), { ...old, hairStyle:'short', eyes:'dark', accessory:'none' })
 const broken = { ...old, hairStyle:'invalid', accessory:'invalid', eyes:'invalid' }
 assert.deepEqual(parseAppearance(JSON.stringify(broken)), { ...old, hairStyle:'short', eyes:'dark', accessory:'none' })
})

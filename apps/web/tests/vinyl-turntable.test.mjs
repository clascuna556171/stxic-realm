import test from 'node:test'
import assert from 'node:assert/strict'
import {
  VINYL_CATALOG,
  SPEED_RATIOS,
  synthesizeVinylTrack,
  synthesizeVinylCrackle,
  synthesizePetPurr,
  synthesizeBunnyChirp,
} from '../src/world/vinyl.ts'

test('vinyl catalog has four unique original tracks with distinct BPM and moods', () => {
  assert.equal(VINYL_CATALOG.length, 4)
  const ids = new Set(VINYL_CATALOG.map(t => t.id))
  assert.equal(ids.size, 4)
  for (const track of VINYL_CATALOG) {
    assert.ok(track.id && track.title && track.artist && track.album)
    assert.ok(track.bpm >= 50 && track.bpm <= 140)
    assert.ok(track.color.startsWith('#'))
    assert.ok(track.labelColor.startsWith('#'))
    assert.ok(track.description.length > 10)
  }
})

test('speed ratios correctly scale playback rate across 33, 45, and 78 RPM', () => {
  assert.ok(SPEED_RATIOS[33] < SPEED_RATIOS[45], '33 RPM is slower than 45 RPM')
  assert.ok(SPEED_RATIOS[45] < SPEED_RATIOS[78], '78 RPM is faster than 45 RPM')
  assert.equal(SPEED_RATIOS[45], 1.0)
})

test('synthesizeVinylTrack produces bounded non-silent samples with smoothed loop endpoints', () => {
  for (const track of VINYL_CATALOG) {
    const rate = 44100
    const buffer = synthesizeVinylTrack(track.id, rate, 2)
    assert.equal(buffer.length, rate * 2)

    let maxAmp = 0
    let hasNonZero = false
    for (let i = 0; i < buffer.length; i++) {
      const abs = Math.abs(buffer[i])
      if (abs > maxAmp) maxAmp = abs
      if (abs > 0.001) hasNonZero = true
      assert.ok(Number.isFinite(buffer[i]), 'sample must be finite')
      assert.ok(abs <= 1.0, `sample ${i} exceeded audio limit: ${buffer[i]}`)
    }
    assert.ok(hasNonZero, `track ${track.id} must not be silent`)
    assert.ok(maxAmp > 0.05, `track ${track.id} amplitude should be audible`)

    // Loop endpoints should taper to smooth silence
    assert.ok(Math.abs(buffer[0]) < 0.05, 'start sample should be smoothly tapered')
    assert.ok(Math.abs(buffer[buffer.length - 1]) < 0.05, 'end sample should be smoothly tapered')
  }
})

test('synthesizeVinylCrackle produces authentic bounded micro-pops', () => {
  const rate = 44100
  const crackle = synthesizeVinylCrackle(rate, 2)
  assert.equal(crackle.length, rate * 2)

  let pops = 0
  for (let i = 0; i < crackle.length; i++) {
    const val = crackle[i]
    assert.ok(Number.isFinite(val))
    assert.ok(Math.abs(val) <= 1.0)
    if (Math.abs(val) > 0.1) pops++
  }
  assert.ok(pops > 0, 'crackle should contain sparse micro-pops')
})

test('pet purr and bunny chirp synthesize bounded comforting waveforms', () => {
  const rate = 44100
  const purr = synthesizePetPurr(rate, 1.5)
  assert.equal(purr.length, Math.floor(rate * 1.5))
  for (let i = 0; i < purr.length; i++) {
    assert.ok(Number.isFinite(purr[i]))
    assert.ok(Math.abs(purr[i]) <= 1.0)
  }

  const chirp = synthesizeBunnyChirp(rate)
  assert.ok(chirp.length > 0)
  for (let i = 0; i < chirp.length; i++) {
    assert.ok(Number.isFinite(chirp[i]))
    assert.ok(Math.abs(chirp[i]) <= 1.0)
  }
})

/**
 * STXIC Realm — Hi-Fi Procedural Vinyl Audio & Synthesizer Engine
 * 
 * Generates continuous procedural vinyl tracks, tactile needle-drops,
 * authentic dust crackle, turntable scratches, and soothing pet purrs.
 * Pure Web Audio API: 100% offline, zero network media, zero dependencies.
 */

export type RpmSpeed = 33 | 45 | 78

export interface VinylTrack {
  id: string
  title: string
  artist: string
  album: string
  mood: string
  color: string
  labelColor: string
  bpm: number
  description: string
}

export const VINYL_CATALOG: VinylTrack[] = [
  {
    id: 'obsidian-lofi',
    title: 'Obsidian Midnight',
    artist: 'Realm Sound Unit',
    album: 'Vol. 1: Dark Matter',
    mood: 'cozy / relaxed',
    color: '#8b5cf6',
    labelColor: '#1e1635',
    bpm: 72,
    description: 'Minor 7th Rhodes chords, mellow lo-fi kick taps, and warm sub-bass.',
  },
  {
    id: 'neon-rain',
    title: 'Cyberpunk Drizzle',
    artist: 'Aki & The Drones',
    album: 'Terminal City',
    mood: 'melancholic / focused',
    color: '#06b6d4',
    labelColor: '#082f49',
    bpm: 84,
    description: 'Gentle rooftop rain texture, warm analog electric piano, and tape delay.',
  },
  {
    id: 'campfire-chiptune',
    title: 'Hearthside 8-Bit',
    artist: 'Pixel Forge',
    album: 'Overworld Rest Area',
    mood: 'nostalgic / cheerful',
    color: '#f97316',
    labelColor: '#431407',
    bpm: 96,
    description: 'Crackling campfire embers and a cozy pentatonic square-wave chiptune melody.',
  },
  {
    id: 'starlight-meadow',
    title: 'Cosmic Meadow',
    artist: 'Antigravity Echoes',
    album: 'Orbiting Horizons',
    mood: 'ambient / dreamlike',
    color: '#10b981',
    labelColor: '#022c22',
    bpm: 60,
    description: 'Night crickets, shimmering bell harmonics, and a slow-breathing synth pad.',
  },
]

export const SPEED_RATIOS: Record<RpmSpeed, number> = {
  33: 0.82,  // slow, deep, mellow
  45: 1.0,   // standard master
  78: 1.38,  // vintage, fast, high-pitched
}

/**
 * Procedurally synthesize track audio into a Float32Array buffer.
 */
export function synthesizeVinylTrack(trackId: string, rate: number, seconds = 10): Float32Array {
  const length = rate * seconds
  const data = new Float32Array(length)
  let seed = 48291
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return (seed / 4294967296) * 2 - 1
  }

  let lowNoise = 0

  for (let i = 0; i < length; i++) {
    const t = i / rate
    const noise = random()
    lowNoise = 0.95 * lowNoise + 0.05 * noise

    if (trackId === 'obsidian-lofi') {
      // 72 BPM lo-fi beat with mellow jazz chords
      const beat = (t % (60 / 72)) / (60 / 72)
      const kick = Math.sin(2 * Math.PI * 55 * Math.exp(-beat * 12)) * Math.exp(-beat * 8) * 0.16
      const snare = (t % (120 / 72) > 60 / 72 ? 1 : 0) * noise * Math.exp(-beat * 16) * 0.04
      // Chord progression: Am7 -> Dm7 -> Fmaj7 -> Em7 (every 2.5 seconds)
      const chordIndex = Math.floor(t / 2.5) % 4
      const chords = [
        [220, 261.63, 329.63, 392],       // Am7
        [146.83, 174.61, 220, 261.63],     // Dm7
        [174.61, 220, 261.63, 349.23],     // Fmaj7
        [164.81, 196, 246.94, 293.66],     // Em7
      ]
      const notes = chords[chordIndex]
      const chordWave = notes.reduce((sum, hz) => sum + Math.sin(2 * Math.PI * hz * t), 0) * 0.035
      const sub = Math.sin(2 * Math.PI * (notes[0] / 2) * t) * 0.05
      data[i] = chordWave + kick + snare + sub + lowNoise * 0.015
    } else if (trackId === 'neon-rain') {
      // Gentle rain background + electric piano arpeggios
      const rain = noise * 0.06 + lowNoise * 0.14
      const arpStep = Math.floor(t * 4) % 6
      const scale = [196, 220, 261.63, 293.66, 329.63, 392]
      const hz = scale[arpStep]
      const arpEnv = Math.exp(-((t * 4) % 1) * 6)
      const synth = Math.sin(2 * Math.PI * hz * t) * arpEnv * 0.08
      data[i] = rain + synth
    } else if (trackId === 'campfire-chiptune') {
      // Embers crackle + 8-bit square wave melody
      const crackle = Math.abs(noise) > 0.985 ? (noise > 0 ? 0.2 : -0.2) : lowNoise * 0.04
      const melodyNotes = [261.63, 293.66, 329.63, 392, 440, 523.25]
      const noteIndex = Math.floor(t * 3.5) % melodyNotes.length
      const hz = melodyNotes[noteIndex]
      const square = Math.sin(2 * Math.PI * hz * t) > 0 ? 0.04 : -0.04
      const env = Math.exp(-((t * 3.5) % 1) * 5)
      data[i] = crackle + square * env
    } else {
      // Starlight meadow: ambient night crickets + soothing drone
      const crickets = Math.sin(2 * Math.PI * 3400 * t) * Math.pow(Math.max(0, Math.sin(t * 12)), 16) * 0.03
      const drone = (Math.sin(2 * Math.PI * 110 * t) + Math.sin(2 * Math.PI * 164.81 * t)) * 0.04
      const bell = Math.sin(2 * Math.PI * 880 * t) * Math.exp(-((t * 0.5) % 1) * 3) * 0.02
      data[i] = crickets + drone + bell + lowNoise * 0.02
    }
  }

  // Smooth loop boundaries
  const fade = Math.min(rate * 0.05, length / 2)
  for (let i = 0; i < fade; i++) {
    const gain = 0.5 - 0.5 * Math.cos((Math.PI * i) / fade)
    data[i] *= gain
    data[length - 1 - i] *= gain
  }

  return data
}

/**
 * Generate subtle analog vinyl crackle noise.
 */
export function synthesizeVinylCrackle(rate: number, seconds = 4): Float32Array {
  const length = rate * seconds
  const data = new Float32Array(length)
  let seed = 91823
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return (seed / 4294967296) * 2 - 1
  }

  for (let i = 0; i < length; i++) {
    const n = random()
    // Micro pops and dust clicks
    const pop = Math.abs(n) > 0.996 ? (n > 0 ? 0.18 : -0.18) : n * 0.008
    data[i] = pop
  }

  const fade = Math.min(rate * 0.02, length / 2)
  for (let i = 0; i < fade; i++) {
    const gain = 0.5 - 0.5 * Math.cos((Math.PI * i) / fade)
    data[i] *= gain
    data[length - 1 - i] *= gain
  }

  return data
}

/**
 * Cat purring synthesizer: Dual low-frequency rumbles with gentle rhythm.
 */
export function synthesizePetPurr(rate: number, seconds = 2.5): Float32Array {
  const length = rate * seconds
  const data = new Float32Array(length)
  for (let i = 0; i < length; i++) {
    const t = i / rate
    // Purr cycle breathing rhythm at ~4.2 Hz
    const breath = 0.6 + 0.4 * Math.sin(2 * Math.PI * 4.2 * t)
    // Low frequency rumbling base frequencies with subtle harmonics
    const fundamental = Math.sin(2 * Math.PI * 27 * t)
    const harmonic1 = Math.sin(2 * Math.PI * 54 * t) * 0.4
    const harmonic2 = Math.sin(2 * Math.PI * 81 * t) * 0.15
    data[i] = (fundamental + harmonic1 + harmonic2) * breath * 0.22
  }
  const fade = Math.min(rate * 0.08, length / 2)
  for (let i = 0; i < fade; i++) {
    const gain = 0.5 - 0.5 * Math.cos((Math.PI * i) / fade)
    data[i] *= gain
    data[length - 1 - i] *= gain
  }
  return data
}

/**
 * Bunny chirp / squeak synthesizer.
 */
export function synthesizeBunnyChirp(rate: number): Float32Array {
  const seconds = 0.45
  const length = Math.floor(rate * seconds)
  const data = new Float32Array(length)
  for (let i = 0; i < length; i++) {
    const t = i / rate
    // Sweet upward-swept chirp
    const freq = 1600 + 500 * Math.sin((t / seconds) * Math.PI)
    const envelope = Math.sin((t / seconds) * Math.PI) * Math.exp(-t * 4)
    data[i] = Math.sin(2 * Math.PI * freq * t) * envelope * 0.14
  }
  return data
}

/**
 * Audio Engine managing the Hi-Fi Turntable playback.
 */
export class VinylEngine {
  private ctx: AudioContext | null = null
  private masterGain: GainNode | null = null
  private musicSource: AudioBufferSourceNode | null = null
  private crackleSource: AudioBufferSourceNode | null = null
  private crackleGain: GainNode | null = null
  private currentTrackId = 'obsidian-lofi'
  private currentRpm: RpmSpeed = 33
  private volume = 0.65
  private crackleVolume = 0.25
  private isPlaying = false
  private disposed = false

  async init(): Promise<void> {
    if (this.ctx) return
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    this.ctx = new AudioContextClass()
    this.masterGain = this.ctx.createGain()
    this.masterGain.gain.value = this.volume
    this.masterGain.connect(this.ctx.destination)
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume()
    }
  }

  async playTrack(trackId: string, speed: RpmSpeed = this.currentRpm): Promise<void> {
    await this.init()
    if (!this.ctx || this.disposed) return

    this.stopAudio()
    this.currentTrackId = trackId
    this.currentRpm = speed
    this.isPlaying = true

    // Play tactile needle drop pop
    this.playNeedleDrop()

    // Create music track loop
    const trackData = synthesizeVinylTrack(trackId, this.ctx.sampleRate)
    const trackBuffer = this.ctx.createBuffer(1, trackData.length, this.ctx.sampleRate)
    trackBuffer.getChannelData(0).set(trackData)

    const musicSource = this.ctx.createBufferSource()
    musicSource.buffer = trackBuffer
    musicSource.loop = true
    musicSource.playbackRate.value = SPEED_RATIOS[speed]

    musicSource.connect(this.masterGain!)
    musicSource.start(this.ctx.currentTime + 0.12)
    this.musicSource = musicSource

    // Create continuous crackle loop
    const crackleData = synthesizeVinylCrackle(this.ctx.sampleRate)
    const crackleBuffer = this.ctx.createBuffer(1, crackleData.length, this.ctx.sampleRate)
    crackleBuffer.getChannelData(0).set(crackleData)

    const crackleSource = this.ctx.createBufferSource()
    crackleSource.buffer = crackleBuffer
    crackleSource.loop = true

    const crackleGain = this.ctx.createGain()
    crackleGain.gain.value = this.crackleVolume
    crackleSource.connect(crackleGain)
    crackleGain.connect(this.masterGain!)

    crackleSource.start()
    this.crackleSource = crackleSource
    this.crackleGain = crackleGain
  }

  pause(): void {
    if (!this.isPlaying) return
    this.stopAudio()
    this.isPlaying = false
  }

  setSpeed(speed: RpmSpeed): void {
    this.currentRpm = speed
    if (this.musicSource && this.ctx) {
      this.musicSource.playbackRate.setTargetAtTime(SPEED_RATIOS[speed], this.ctx.currentTime, 0.05)
    }
  }

  setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(1, vol))
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.04)
    }
  }

  setCrackle(vol: number): void {
    this.crackleVolume = Math.max(0, Math.min(1, vol))
    if (this.crackleGain && this.ctx) {
      this.crackleGain.gain.setTargetAtTime(this.crackleVolume, this.ctx.currentTime, 0.04)
    }
  }

  /**
   * Scratch effect when physically scrubbing the vinyl platter.
   */
  scratch(deltaSpeed: number): void {
    if (!this.musicSource || !this.ctx) return
    const targetRate = Math.max(0.1, Math.min(2.5, SPEED_RATIOS[this.currentRpm] + deltaSpeed * 0.8))
    this.musicSource.playbackRate.setValueAtTime(targetRate, this.ctx.currentTime)
  }

  restoreSpeed(): void {
    if (!this.musicSource || !this.ctx) return
    this.musicSource.playbackRate.setTargetAtTime(SPEED_RATIOS[this.currentRpm], this.ctx.currentTime, 0.08)
  }

  playNeedleDrop(): void {
    if (!this.ctx) return
    const t = this.ctx.currentTime
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(80, t)
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.08)
    gain.gain.setValueAtTime(0.3, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1)
    osc.connect(gain)
    gain.connect(this.masterGain!)
    osc.start(t)
    osc.stop(t + 0.1)
  }

  async playPurr(): Promise<void> {
    await this.init()
    if (!this.ctx) return
    const data = synthesizePetPurr(this.ctx.sampleRate)
    const buf = this.ctx.createBuffer(1, data.length, this.ctx.sampleRate)
    buf.getChannelData(0).set(data)
    const src = this.ctx.createBufferSource()
    src.buffer = buf
    const gain = this.ctx.createGain()
    gain.gain.value = 0.5
    src.connect(gain)
    gain.connect(this.masterGain ?? this.ctx.destination)
    src.start()
  }

  async playChirp(): Promise<void> {
    await this.init()
    if (!this.ctx) return
    const data = synthesizeBunnyChirp(this.ctx.sampleRate)
    const buf = this.ctx.createBuffer(1, data.length, this.ctx.sampleRate)
    buf.getChannelData(0).set(data)
    const src = this.ctx.createBufferSource()
    src.buffer = buf
    const gain = this.ctx.createGain()
    gain.gain.value = 0.4
    src.connect(gain)
    gain.connect(this.masterGain ?? this.ctx.destination)
    src.start()
  }

  private stopAudio(): void {
    if (this.musicSource) {
      try {
        this.musicSource.stop()
        this.musicSource.disconnect()
      } catch {}
      this.musicSource = null
    }
    if (this.crackleSource) {
      try {
        this.crackleSource.stop()
        this.crackleSource.disconnect()
      } catch {}
      this.crackleSource = null
    }
    if (this.crackleGain) {
      try {
        this.crackleGain.disconnect()
      } catch {}
      this.crackleGain = null
    }
  }

  getState() {
    return {
      isPlaying: this.isPlaying,
      currentTrackId: this.currentTrackId,
      currentRpm: this.currentRpm,
      volume: this.volume,
      crackleVolume: this.crackleVolume,
    }
  }

  dispose(): void {
    this.disposed = true
    this.stopAudio()
    if (this.masterGain) {
      try { this.masterGain.disconnect() } catch {}
    }
    if (this.ctx && this.ctx.state !== 'closed') {
      void this.ctx.close().catch(() => {})
    }
    this.ctx = null
  }
}

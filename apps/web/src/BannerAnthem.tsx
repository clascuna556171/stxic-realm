import { memo, useEffect, useRef, useState, useCallback } from 'react'
import type { BannerAnthemId } from './profile-model'
import { synthesizeVinylTrack, synthesizeVinylCrackle } from './world/vinyl'
import { getCustomAnthemBuffer } from './banner-audio'
import { BANNER_ANTHEMS, getAnthemMeta } from './banner-cosmetics'

export type BannerAnthemProps = {
  anthem?: BannerAnthemId | string | null
  userId: string
  compact?: boolean
}

export const BannerAnthem = memo(function BannerAnthem({ anthem, userId, compact = false }: BannerAnthemProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [status, setStatus] = useState<string>('')
  const audioCtxRef = useRef<AudioContext | null>(null)
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null)
  const crackleNodeRef = useRef<AudioBufferSourceNode | null>(null)
  const gainNodeRef = useRef<GainNode | null>(null)
  const aliveRef = useRef(true)

  const stopAudio = useCallback(() => {
    if (gainNodeRef.current && audioCtxRef.current) {
      const now = audioCtxRef.current.currentTime
      gainNodeRef.current.gain.setValueAtTime(gainNodeRef.current.gain.value, now)
      gainNodeRef.current.gain.linearRampToValueAtTime(0.001, now + 0.3)
      setTimeout(() => {
        try {
          sourceNodeRef.current?.stop()
          crackleNodeRef.current?.stop()
          sourceNodeRef.current?.disconnect()
          crackleNodeRef.current?.disconnect()
        } catch {}
        sourceNodeRef.current = null
        crackleNodeRef.current = null
        if (aliveRef.current) setIsPlaying(false)
      }, 350)
    } else {
      sourceNodeRef.current?.stop()
      crackleNodeRef.current?.stop()
      sourceNodeRef.current = null
      crackleNodeRef.current = null
      setIsPlaying(false)
    }
  }, [])

  const startAudio = useCallback(async () => {
    if (!anthem || anthem === 'none') return
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      let ctx = audioCtxRef.current
      if (!ctx || ctx.state === 'closed') {
        ctx = new AudioCtx({ sampleRate: 22050 })
        audioCtxRef.current = ctx
      }
      if (ctx.state === 'suspended') {
        await ctx.resume()
      }

      // Gain setup
      const masterGain = ctx.createGain()
      masterGain.gain.setValueAtTime(0.001, ctx.currentTime)
      masterGain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 0.5)
      masterGain.connect(ctx.destination)
      gainNodeRef.current = masterGain

      let audioBuffer: AudioBuffer | null = null

      if (anthem === 'custom') {
        audioBuffer = await getCustomAnthemBuffer(userId, ctx)
        if (!audioBuffer) {
          // Fallback to obsidian-lofi if no custom audio stored on this client
          const samples = synthesizeVinylTrack('obsidian-lofi', ctx.sampleRate, 10)
          audioBuffer = ctx.createBuffer(1, samples.length, ctx.sampleRate)
          audioBuffer.getChannelData(0).set(samples)
          setStatus('(Default preview)')
        }
      } else {
        const meta = getAnthemMeta(anthem)
        const trackKey = meta.trackKey || 'obsidian-lofi'
        const samples = synthesizeVinylTrack(trackKey, ctx.sampleRate, 10)
        audioBuffer = ctx.createBuffer(1, samples.length, ctx.sampleRate)
        audioBuffer.getChannelData(0).set(samples)
      }

      // Synthesize subtle crackle
      const crackleSamples = synthesizeVinylCrackle(ctx.sampleRate, 4)
      const crackleBuffer = ctx.createBuffer(1, crackleSamples.length, ctx.sampleRate)
      crackleBuffer.getChannelData(0).set(crackleSamples)

      const trackSource = ctx.createBufferSource()
      trackSource.buffer = audioBuffer
      trackSource.loop = true
      trackSource.connect(masterGain)

      const crackleSource = ctx.createBufferSource()
      crackleSource.buffer = crackleBuffer
      crackleSource.loop = true
      const crackleGain = ctx.createGain()
      crackleGain.gain.value = 0.15
      crackleSource.connect(crackleGain)
      crackleGain.connect(masterGain)

      trackSource.start()
      crackleSource.start()

      sourceNodeRef.current = trackSource
      crackleNodeRef.current = crackleSource
      setIsPlaying(true)
    } catch {
      setIsPlaying(false)
    }
  }, [anthem, userId])

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (isPlaying) {
      stopAudio()
    } else {
      void startAudio()
    }
  }

  // Pause on hidden tabs
  useEffect(() => {
    const handleVis = () => {
      if (document.hidden && isPlaying) {
        stopAudio()
      }
    }
    document.addEventListener('visibilitychange', handleVis)
    return () => {
      document.removeEventListener('visibilitychange', handleVis)
    }
  }, [isPlaying, stopAudio])

  // Stop when unmounting or anthem changes
  useEffect(() => {
    aliveRef.current = true
    return () => {
      aliveRef.current = false
      stopAudio()
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        void audioCtxRef.current.close().catch(() => {})
      }
    }
  }, [anthem, stopAudio])

  if (!anthem || anthem === 'none') return null

  const meta = getAnthemMeta(anthem)

  return (
    <div className={`banner-anthem-container ${compact ? 'is-compact' : ''}`}>
      <button
        type="button"
        className={`banner-anthem-badge ${isPlaying ? 'is-playing' : ''}`}
        onClick={togglePlay}
        aria-label={isPlaying ? `Pause anthem: ${meta.name}` : `Play anthem: ${meta.name}`}
        title={`${isPlaying ? 'Pause' : 'Play'} anthem: ${meta.name} ${status}`}
      >
        <span className="banner-anthem-disc-icon" aria-hidden="true">
          <svg viewBox="0 0 20 20" className="anthem-vinyl-svg">
            <circle cx="10" cy="10" r="9" fill="#14151a" stroke="#d4af37" strokeWidth="1" />
            <circle cx="10" cy="10" r="6" fill="none" stroke="#2c2d38" strokeWidth="0.8" />
            <circle cx="10" cy="10" r="3.5" fill="#a83244" />
            <circle cx="10" cy="10" r="1.2" fill="#d4af37" />
          </svg>
        </span>
        <span className="banner-anthem-waves" aria-hidden="true">
          <span className="anthem-wave-bar bar-1" />
          <span className="anthem-wave-bar bar-2" />
          <span className="anthem-wave-bar bar-3" />
        </span>
        <span className="banner-anthem-info">
          <span className="banner-anthem-title">{meta.name}</span>
        </span>
      </button>
    </div>
  )
})

import { useEffect, useRef, useState } from 'react'
import { VINYL_CATALOG, VinylEngine, type RpmSpeed, type VinylTrack } from './vinyl'
import { trackHallmarkMilestone } from '../badges'
import './turntable.css'

interface Props {
  initialTrackId?: string
  onPlaybackChange?: (isPlaying: boolean, track: VinylTrack) => void
}

export function VinylTurntable({ initialTrackId = 'obsidian-lofi', onPlaybackChange }: Props) {
  const engine = useRef<VinylEngine | null>(null)
  const [selectedTrack, setSelectedTrack] = useState<VinylTrack>(() =>
    VINYL_CATALOG.find(t => t.id === initialTrackId) ?? VINYL_CATALOG[0]
  )
  const [isPlaying, setIsPlaying] = useState(false)
  const [rpm, setRpm] = useState<RpmSpeed>(33)
  const [volume, setVolume] = useState(0.65)
  const [crackle, setCrackle] = useState(0.25)
  const [scratchAngle, setScratchAngle] = useState(0)
  const isDragging = useRef(false)
  const lastMousePos = useRef({ x: 0, y: 0 })

  useEffect(() => {
    engine.current = new VinylEngine()
    return () => {
      engine.current?.dispose()
      engine.current = null
    }
  }, [])

  const togglePlay = async () => {
    if (!engine.current) return
    if (isPlaying) {
      engine.current.pause()
      setIsPlaying(false)
      onPlaybackChange?.(false, selectedTrack)
    } else {
      await engine.current.playTrack(selectedTrack.id, rpm)
      setIsPlaying(true)
      trackHallmarkMilestone('self', 'vinyl')
      onPlaybackChange?.(true, selectedTrack)
    }
  }

  const selectTrack = async (track: VinylTrack) => {
    setSelectedTrack(track)
    if (isPlaying && engine.current) {
      await engine.current.playTrack(track.id, rpm)
      onPlaybackChange?.(true, track)
    }
  }

  const changeRpm = (speed: RpmSpeed) => {
    setRpm(speed)
    engine.current?.setSpeed(speed)
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value)
    setVolume(val)
    engine.current?.setVolume(val)
  }

  const handleCrackleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value)
    setCrackle(val)
    engine.current?.setCrackle(val)
  }

  // Interactive turntable scrub / scratch on platter
  const onPointerDown = (e: React.PointerEvent) => {
    isDragging.current = true
    lastMousePos.current = { x: e.clientX, y: e.clientY }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return
    const dx = e.clientX - lastMousePos.current.x
    const dy = e.clientY - lastMousePos.current.y
    const delta = (dx + dy) * 0.8
    setScratchAngle(prev => prev + delta)
    engine.current?.scratch(delta * 0.04)
    lastMousePos.current = { x: e.clientX, y: e.clientY }
  }

  const onPointerUp = (e: React.PointerEvent) => {
    if (!isDragging.current) return
    isDragging.current = false
    engine.current?.restoreSpeed()
    try {
      ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {}
  }

  return (
    <div className="turntable-deck" aria-label="Hi-Fi Vinyl Turntable">
      {/* Platter & Tonearm */}
      <div className="turntable-platter-area">
        <div
          className="turntable-platter"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          title="Drag to scratch the record"
          tabIndex={0}
          role="slider"
          aria-label="Vinyl platter turntable"
          aria-valuenow={isPlaying ? 1 : 0}
        >
          <div
            className={`vinyl-disc rpm-${rpm} ${isPlaying ? 'is-spinning' : ''}`}
            style={{ transform: `rotate(${scratchAngle}deg)` }}
          >
            <div className="vinyl-grooves" />
            <div
              className="vinyl-label"
              style={{
                background: selectedTrack.labelColor,
                borderColor: selectedTrack.color,
              }}
            >
              <span className="vinyl-label-title">{selectedTrack.title}</span>
              <span className="vinyl-label-sub">{rpm} RPM · {selectedTrack.bpm} BPM</span>
            </div>
            <div className="vinyl-spindle" />
          </div>
        </div>

        {/* Mechanical Tonearm */}
        <div className={`tonearm ${isPlaying ? 'is-playing' : ''}`}>
          <div className="tonearm-base" />
          <div className="tonearm-weight" />
          <div className="tonearm-rod" />
          <div className="tonearm-head" />
        </div>
      </div>

      {/* Hardware Controls Bar */}
      <div className="turntable-controls">
        <button
          className={`cue-play-btn ${isPlaying ? 'is-playing' : ''}`}
          onClick={togglePlay}
          aria-pressed={isPlaying}
        >
          <span className="cue-play-led" aria-hidden="true" />
          {isPlaying ? '⏸ Lift Needle (Pause)' : '▶ Drop Needle (Play)'}
        </button>

        {/* 6-Bar Active Equalizer */}
        <div className={`turntable-eq ${isPlaying ? 'is-active' : ''}`} aria-hidden="true">
          <div className="eq-bar" />
          <div className="eq-bar" />
          <div className="eq-bar" />
          <div className="eq-bar" />
          <div className="eq-bar" />
          <div className="eq-bar" />
        </div>

        {/* Speed Selector */}
        <div className="rpm-selector" role="group" aria-label="Playback speed RPM">
          {([33, 45, 78] as RpmSpeed[]).map(speed => (
            <button
              key={speed}
              className={`rpm-btn ${rpm === speed ? 'is-active' : ''}`}
              onClick={() => changeRpm(speed)}
              aria-pressed={rpm === speed}
            >
              {speed === 33 ? '33 ⅓' : speed}
            </button>
          ))}
        </div>
      </div>

      {/* Sliders for Volume and Vinyl Dust Crackle */}
      <div className="turntable-sliders">
        <label className="turntable-slider-label">
          <span>Master Volume</span>
          <span className="slider-value">{Math.round(volume * 100)}%</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={handleVolumeChange}
            aria-label="Turntable Volume"
            className="turntable-slider-input"
          />
        </label>
        <label className="turntable-slider-label">
          <span>Vinyl Dust Crackle</span>
          <span className="slider-value">{Math.round(crackle * 100)}%</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={crackle}
            onChange={handleCrackleChange}
            aria-label="Vinyl Dust Crackle"
            className="turntable-slider-input"
          />
        </label>
      </div>

      {/* 2x2 Balanced Record Crate */}
      <div className="turntable-crate-section">
        <h4 className="crate-heading">
          Vinyl Record Crate
        </h4>
        <div className="record-crate" role="listbox" aria-label="Record Crate">
          {VINYL_CATALOG.map((track, idx) => (
            <div
              key={track.id}
              role="option"
              aria-selected={selectedTrack.id === track.id}
              tabIndex={0}
              className={`record-sleeve ${selectedTrack.id === track.id ? 'is-selected' : ''}`}
              onClick={() => selectTrack(track)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') selectTrack(track) }}
            >
              <div className="sleeve-header">
                <span className="sleeve-number">0{idx + 1}</span>
                <span className="sleeve-badge" style={{ color: track.color }}>
                  {track.mood}
                </span>
              </div>
              <span className="sleeve-title">{track.title}</span>
              <span className="sleeve-artist">{track.artist}</span>
              <span className="sleeve-desc">{track.description}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

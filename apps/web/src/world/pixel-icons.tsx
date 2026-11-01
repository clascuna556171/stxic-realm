import type { StampBadge } from './passport'

/**
 * Pixel-art SVGs that strictly match STXIC Realm's 16-bit retro aesthetic.
 * Replaces all generic OS emojis with authentic game art.
 */

export function PixelPetAvatar({ pet }: { pet: 'sylvester' | 'mochi' | 'pip' }) {
  if (pet === 'sylvester') {
    // Sylvester the Tuxedo Cat sleeping curled up
    return (
      <svg width="40" height="40" viewBox="0 0 20 20" shapeRendering="crispEdges" aria-hidden="true">
        {/* Shadow */}
        <rect x="3" y="15" width="14" height="2" fill="#13111c" />
        {/* Black body */}
        <rect x="4" y="8" width="12" height="7" fill="#24222f" />
        <rect x="5" y="7" width="10" height="9" fill="#1c1a27" />
        <rect x="3" y="10" width="2" height="4" fill="#1c1a27" />
        {/* Ears */}
        <rect x="4" y="5" width="2" height="3" fill="#1c1a27" />
        <rect x="8" y="5" width="2" height="3" fill="#1c1a27" />
        <rect x="5" y="6" width="1" height="1" fill="#ec4899" />
        <rect x="8" y="6" width="1" height="1" fill="#ec4899" />
        {/* Closed sleeping eyes */}
        <rect x="5" y="9" width="2" height="1" fill="#facc15" />
        <rect x="8" y="9" width="2" height="1" fill="#facc15" />
        {/* White chest & paws */}
        <rect x="6" y="11" width="4" height="4" fill="#f8fafc" />
        <rect x="11" y="13" width="2" height="2" fill="#f8fafc" />
        {/* Curled tail with white tip */}
        <rect x="15" y="10" width="2" height="5" fill="#1c1a27" />
        <rect x="14" y="9" width="2" height="2" fill="#f8fafc" />
      </svg>
    )
  }

  if (pet === 'mochi') {
    // Mochi the White Kitten sitting alert
    return (
      <svg width="40" height="40" viewBox="0 0 20 20" shapeRendering="crispEdges" aria-hidden="true">
        {/* Shadow */}
        <rect x="4" y="16" width="12" height="2" fill="#13111c" />
        {/* Fluffy white body */}
        <rect x="6" y="8" width="8" height="8" fill="#f8fafc" />
        <rect x="5" y="9" width="10" height="6" fill="#f1f5f9" />
        {/* Ears with pink interior */}
        <rect x="5" y="5" width="3" height="3" fill="#f8fafc" />
        <rect x="12" y="5" width="3" height="3" fill="#f8fafc" />
        <rect x="6" y="6" width="1" height="2" fill="#f472b6" />
        <rect x="13" y="6" width="1" height="2" fill="#f472b6" />
        {/* Big curious eyes */}
        <rect x="6" y="10" width="2" height="2" fill="#0284c7" />
        <rect x="12" y="10" width="2" height="2" fill="#0284c7" />
        <rect x="6" y="10" width="1" height="1" fill="#ffffff" />
        <rect x="12" y="10" width="1" height="1" fill="#ffffff" />
        {/* Cute pink nose */}
        <rect x="9" y="12" width="2" height="1" fill="#fb7185" />
        {/* Little tail */}
        <rect x="14" y="13" width="2" height="3" fill="#f8fafc" />
        <rect x="15" y="12" width="2" height="2" fill="#f8fafc" />
      </svg>
    )
  }

  // Pip the Lavender Desk Bunny
  return (
    <svg width="40" height="40" viewBox="0 0 20 20" shapeRendering="crispEdges" aria-hidden="true">
      {/* Shadow */}
      <rect x="4" y="16" width="12" height="2" fill="#13111c" />
      {/* Lavender bunny body */}
      <rect x="5" y="9" width="10" height="7" fill="#a78bfa" />
      <rect x="6" y="8" width="8" height="8" fill="#c4b5fd" />
      {/* Tall twitchy ears */}
      <rect x="6" y="3" width="2" height="6" fill="#a78bfa" />
      <rect x="12" y="3" width="2" height="6" fill="#a78bfa" />
      <rect x="7" y="4" width="1" height="4" fill="#f472b6" />
      <rect x="13" y="4" width="1" height="4" fill="#f472b6" />
      {/* Dark little eyes */}
      <rect x="7" y="10" width="1" height="2" fill="#1e1b4b" />
      <rect x="12" y="10" width="1" height="2" fill="#1e1b4b" />
      {/* White nose & cheeks */}
      <rect x="9" y="12" width="2" height="1" fill="#ffffff" />
      <rect x="9" y="11" width="2" height="1" fill="#fb7185" />
      {/* Cotton ball tail */}
      <rect x="3" y="13" width="2" height="2" fill="#ffffff" />
    </svg>
  )
}

export function PixelHeart({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" shapeRendering="crispEdges" aria-hidden="true">
      <rect x="2" y="1" width="3" height="2" fill="#f43f5e" />
      <rect x="7" y="1" width="3" height="2" fill="#f43f5e" />
      <rect x="1" y="3" width="10" height="3" fill="#f43f5e" />
      <rect x="2" y="6" width="8" height="2" fill="#f43f5e" />
      <rect x="3" y="8" width="6" height="2" fill="#f43f5e" />
      <rect x="4" y="10" width="4" height="1" fill="#f43f5e" />
      <rect x="5" y="11" width="2" height="1" fill="#f43f5e" />
      {/* Shimmer glint */}
      <rect x="2" y="3" width="2" height="2" fill="#fda4af" />
    </svg>
  )
}

export function PixelSparkle({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" shapeRendering="crispEdges" aria-hidden="true">
      <rect x="5" y="1" width="2" height="10" fill="#fef08a" />
      <rect x="1" y="5" width="10" height="2" fill="#fef08a" />
      <rect x="4" y="4" width="4" height="4" fill="#ffffff" />
    </svg>
  )
}

export function PixelStampIcon({ badge, color = 'currentColor', size = 20 }: { badge: StampBadge; color?: string; size?: number }) {
  switch (badge) {
    case 'paw':
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden="true">
          {/* Main paw pad */}
          <rect x="5" y="8" width="6" height="5" fill={color} />
          <rect x="4" y="9" width="8" height="3" fill={color} />
          {/* 4 toe beans */}
          <rect x="3" y="5" width="2" height="2" fill={color} />
          <rect x="6" y="3" width="2" height="2" fill={color} />
          <rect x="9" y="3" width="2" height="2" fill={color} />
          <rect x="12" y="5" width="2" height="2" fill={color} />
        </svg>
      )
    case 'star':
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden="true">
          <rect x="7" y="1" width="2" height="14" fill={color} />
          <rect x="1" y="7" width="14" height="2" fill={color} />
          <rect x="4" y="4" width="8" height="8" fill={color} />
          <rect x="6" y="6" width="4" height="4" fill="#ffffff" />
        </svg>
      )
    case 'heart':
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden="true">
          <rect x="3" y="3" width="4" height="3" fill={color} />
          <rect x="9" y="3" width="4" height="3" fill={color} />
          <rect x="2" y="5" width="12" height="4" fill={color} />
          <rect x="4" y="9" width="8" height="2" fill={color} />
          <rect x="6" y="11" width="4" height="2" fill={color} />
          <rect x="7" y="13" width="2" height="1" fill={color} />
        </svg>
      )
    case 'mug':
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden="true">
          {/* Cup */}
          <rect x="3" y="6" width="7" height="8" fill={color} />
          <rect x="2" y="7" width="9" height="6" fill={color} />
          {/* Handle */}
          <rect x="10" y="7" width="3" height="4" fill={color} />
          <rect x="10" y="8" width="1" height="2" fill="#13111c" />
          {/* Steam wisps */}
          <rect x="4" y="2" width="1" height="2" fill={color} />
          <rect x="7" y="1" width="1" height="3" fill={color} />
        </svg>
      )
    case 'flame':
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden="true">
          <rect x="7" y="2" width="2" height="3" fill={color} />
          <rect x="6" y="5" width="4" height="4" fill={color} />
          <rect x="4" y="8" width="8" height="5" fill={color} />
          <rect x="5" y="13" width="6" height="2" fill={color} />
          {/* Core */}
          <rect x="7" y="9" width="2" height="3" fill="#ffffff" />
        </svg>
      )
    case 'coin':
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden="true">
          <rect x="4" y="2" width="8" height="12" fill={color} />
          <rect x="2" y="4" width="12" height="8" fill={color} />
          <rect x="7" y="5" width="2" height="6" fill="#13111c" />
          <rect x="6" y="7" width="4" height="2" fill="#13111c" />
        </svg>
      )
    case 'gem':
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden="true">
          <rect x="5" y="2" width="6" height="2" fill={color} />
          <rect x="3" y="4" width="10" height="3" fill={color} />
          <rect x="4" y="7" width="8" height="4" fill={color} />
          <rect x="6" y="11" width="4" height="2" fill={color} />
          <rect x="7" y="13" width="2" height="1" fill={color} />
          <rect x="6" y="5" width="4" height="3" fill="#ffffff" />
        </svg>
      )
    case 'moon':
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden="true">
          <rect x="5" y="2" width="6" height="2" fill={color} />
          <rect x="4" y="4" width="6" height="8" fill={color} />
          <rect x="5" y="12" width="6" height="2" fill={color} />
          <rect x="10" y="4" width="2" height="2" fill={color} />
          <rect x="10" y="10" width="2" height="2" fill={color} />
          <rect x="8" y="5" width="2" height="6" fill="#13111c" />
        </svg>
      )
  }
}

export function PixelWaterDrop({ size = 20, color = '#9bd6e3' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden="true">
      <rect x="7" y="2" width="2" height="2" fill={color} />
      <rect x="6" y="4" width="4" height="2" fill={color} />
      <rect x="5" y="6" width="6" height="2" fill={color} />
      <rect x="4" y="8" width="8" height="4" fill={color} />
      <rect x="5" y="12" width="6" height="2" fill={color} />
      <rect x="7" y="14" width="2" height="1" fill={color} />
      <rect x="6" y="7" width="2" height="3" fill="#ffffff" />
    </svg>
  )
}

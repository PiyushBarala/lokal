import React from 'react'
import { useAppSettings } from '../contexts/AppSettingsContext'
import type { ArtworkShape } from '../contexts/AppSettingsContext'

/**
 * Deterministic color gradient from any seed string.
 * Returns a CSS `background` value (linear-gradient).
 */
export function artGradient(seed: string): string {
  // DJB2-style hash
  let h = 5381
  for (const c of (seed || '?')) h = ((h << 5) + h + c.charCodeAt(0)) | 0
  h = Math.abs(h)

  const hue1 = h % 360
  const hue2 = (hue1 + 40 + ((h >> 8) % 80)) % 360
  return `linear-gradient(135deg, hsl(${hue1},60%,32%), hsl(${hue2},70%,18%))`
}

/** Compute border-radius from shape setting */
function shapeToRadius(shape: ArtworkShape, forceShape?: ArtworkShape): string {
  const s = forceShape ?? shape
  switch (s) {
    case 'square':  return '4px'
    case 'circle':  return '50%'
    case 'rounded':
    default:        return '8px'
  }
}

interface ArtworkCellProps {
  artworkPath: string | null | undefined
  /** Used to derive the fallback gradient color and initial letter */
  seed: string
  className?: string
  /** Extra inline styles (e.g. borderRadius override) */
  style?: React.CSSProperties
  /**
   * Override the global shape setting for this specific cell.
   * Use this when you always want a fixed shape (e.g. artist avatars always circle).
   */
  forceShape?: ArtworkShape
  /**
   * When true and shape === 'circle', the artwork will slowly spin.
   * Pass isPlaying from playerStore.
   */
  isPlaying?: boolean
}

/**
 * Shows album artwork if available, otherwise a deterministic
 * gradient with the first letter of `seed`.
 * Shape is driven by the global AppSettings (artworkShape),
 * overridable per-instance via `forceShape`.
 */
export function ArtworkCell({ artworkPath, seed, className = '', style, forceShape, isPlaying }: ArtworkCellProps) {
  const { settings } = useAppSettings()
  const letter = (seed || '?').trim()[0]?.toUpperCase() ?? '♪'

  const activeShape = forceShape ?? settings.artworkShape
  const borderRadius = shapeToRadius(settings.artworkShape, forceShape)
  const isSpinning = activeShape === 'circle' && isPlaying

  const sharedStyle: React.CSSProperties = {
    borderRadius,
    transition: 'border-radius 0.3s ease',
    ...style,
  }

  const spinClass = isSpinning ? 'animate-spin-slow' : ''

  if (artworkPath) {
    return (
      <img
        src={'lokal://media/' + artworkPath.replace(/\\/g, '/')}
        alt=""
        className={`object-cover flex-shrink-0 ${spinClass} ${className}`}
        style={sharedStyle}
        onError={(e) => {
          const img = e.target as HTMLImageElement
          const div = document.createElement('div')
          div.style.cssText = img.style.cssText
          div.style.background = artGradient(seed)
          div.style.display = 'flex'
          div.style.alignItems = 'center'
          div.style.justifyContent = 'center'
          div.style.color = 'rgba(255,255,255,0.6)'
          div.style.fontWeight = 'bold'
          div.style.fontSize = '1.1em'
          div.style.borderRadius = borderRadius
          div.textContent = letter
          div.className = img.className
          img.parentNode?.replaceChild(div, img)
        }}
      />
    )
  }

  return (
    <div
      className={`flex-shrink-0 flex items-center justify-center font-bold text-white/60 select-none ${spinClass} ${className}`}
      style={{ background: artGradient(seed), ...sharedStyle }}
    >
      {letter}
    </div>
  )
}

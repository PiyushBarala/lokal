import React from 'react'

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

interface ArtworkCellProps {
  artworkPath: string | null | undefined
  /** Used to derive the fallback gradient color and initial letter */
  seed: string
  className?: string
  /** Extra inline styles (e.g. borderRadius override) */
  style?: React.CSSProperties
}

/**
 * Shows album artwork if available, otherwise a deterministic
 * gradient with the first letter of `seed` — like Apple Music / YouTube Music.
 */
export function ArtworkCell({ artworkPath, seed, className = '', style }: ArtworkCellProps) {
  const letter = (seed || '?').trim()[0]?.toUpperCase() ?? '♪'

  if (artworkPath) {
    return (
      <img
        src={'lokal://media/' + artworkPath.replace(/\\/g, '/')}
        alt=""
        className={`object-cover flex-shrink-0 ${className}`}
        style={style}
        onError={(e) => {
          // On load error, swap to the gradient div
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
          div.textContent = letter
          div.className = img.className
          img.parentNode?.replaceChild(div, img)
        }}
      />
    )
  }

  return (
    <div
      className={`flex-shrink-0 flex items-center justify-center font-bold text-white/60 select-none ${className}`}
      style={{ background: artGradient(seed), ...style }}
    >
      {letter}
    </div>
  )
}

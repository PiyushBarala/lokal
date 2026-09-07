/**
 * Utility to extract a rich, moody Spotify-like dominant background color
 * from an album artwork image.
 */

// Cache extracted colors by artwork path to avoid re-drawing canvas
const colorCache = new Map<string, string>()

// Fallback color when no artwork is available or on error
const DEFAULT_COLOR = '#121212'

/**
 * Generate a deterministic rich dark tone from a seed string (e.g. song title)
 */
export function getSeedColor(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash)
  }
  const h = Math.abs(hash % 360)
  return hslToHex(h, 55, 16)
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0)
        break
      case g:
        h = (b - r) / d + 2
        break
      case b:
        h = (r - g) / d + 4
        break
    }
    h /= 6
  }

  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)]
}

function hslToHex(h: number, s: number, l: number): string {
  l /= 100
  const a = (s * Math.min(l, 1 - l)) / 100
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

/**
 * Generates an organic trio of colors from a dominant hex color
 * for the fluid animated background gradient mesh.
 */
export function getGradientPalette(hex: string): { primary: string; secondary: string; tertiary: string } {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.substring(0, 2), 16) || 35
  const g = parseInt(clean.substring(2, 4), 16) || 35
  const b = parseInt(clean.substring(4, 6), 16) || 35
  const [h, s, l] = rgbToHsl(r, g, b)

  const primary = hslToHex(h, Math.min(80, Math.max(50, s + 10)), Math.min(28, Math.max(16, l + 6)))
  const secondary = hslToHex((h + 48) % 360, Math.min(85, Math.max(55, s + 20)), Math.min(32, Math.max(18, l + 8)))
  const tertiary = hslToHex((h + 135) % 360, Math.min(75, Math.max(45, s + 15)), Math.min(26, Math.max(14, l + 4)))

  return { primary, secondary, tertiary }
}


/**
 * Extract dominant vibrant dark background color from an image path
 */
export function extractDominantColor(artworkPath: string | null, seed?: string): Promise<string> {
  if (!artworkPath) {
    return Promise.resolve(seed ? getSeedColor(seed) : DEFAULT_COLOR)
  }

  if (colorCache.has(artworkPath)) {
    return Promise.resolve(colorCache.get(artworkPath)!)
  }

  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = 'lokal://media/' + artworkPath.replace(/\\/g, '/')

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        if (!ctx) {
          resolve(seed ? getSeedColor(seed) : DEFAULT_COLOR)
          return
        }

        canvas.width = 32
        canvas.height = 32
        ctx.drawImage(img, 0, 0, 32, 32)

        const { data } = ctx.getImageData(0, 0, 32, 32)
        let totalR = 0, totalG = 0, totalB = 0, count = 0
        let maxSaturation = -1
        let bestHue = 0

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i]
          const g = data[i + 1]
          const b = data[i + 2]
          const a = data[i + 3]

          if (a < 128) continue
          // Skip pure black or pure white pixels
          const brightness = (r + g + b) / 3
          if (brightness < 20 || brightness > 235) continue

          const [h, s, l] = rgbToHsl(r, g, b)

          // Favor vibrant colors over muddy greys
          if (s > maxSaturation) {
            maxSaturation = s
            bestHue = h
          }

          totalR += r
          totalG += g
          totalB += b
          count++
        }

        let hex: string
        if (maxSaturation > 25) {
          // Use the most vibrant hue, styled to a dark, moody background (L: 16-20%, S: 55-65%)
          hex = hslToHex(bestHue, Math.min(65, Math.max(45, maxSaturation)), 18)
        } else if (count > 0) {
          const [h, s] = rgbToHsl(totalR / count, totalG / count, totalB / count)
          hex = hslToHex(h, Math.max(30, s), 17)
        } else {
          hex = seed ? getSeedColor(seed) : DEFAULT_COLOR
        }

        colorCache.set(artworkPath, hex)
        resolve(hex)
      } catch (e) {
        resolve(seed ? getSeedColor(seed) : DEFAULT_COLOR)
      }
    }

    img.onerror = () => {
      resolve(seed ? getSeedColor(seed) : DEFAULT_COLOR)
    }
  })
}

import { create } from 'zustand'

// ── EQ Band Frequencies ──────────────────────────────────────────────────────
export const EQ_BANDS = [
  { freq: 32,    label: '32',   type: 'lowshelf'  as BiquadFilterType },
  { freq: 64,    label: '64',   type: 'peaking'   as BiquadFilterType },
  { freq: 125,   label: '125',  type: 'peaking'   as BiquadFilterType },
  { freq: 250,   label: '250',  type: 'peaking'   as BiquadFilterType },
  { freq: 500,   label: '500',  type: 'peaking'   as BiquadFilterType },
  { freq: 1000,  label: '1K',   type: 'peaking'   as BiquadFilterType },
  { freq: 2000,  label: '2K',   type: 'peaking'   as BiquadFilterType },
  { freq: 4000,  label: '4K',   type: 'peaking'   as BiquadFilterType },
  { freq: 8000,  label: '8K',   type: 'peaking'   as BiquadFilterType },
  { freq: 16000, label: '16K',  type: 'highshelf' as BiquadFilterType },
]

export const EQ_MIN = -12
export const EQ_MAX = 12

// ── Preset definitions ────────────────────────────────────────────────────────
// 10 values corresponding to the 10 bands above (32Hz → 16kHz)
export interface EqPreset {
  name: string
  gains: number[] // length 10
}

export const EQ_PRESETS: EqPreset[] = [
  { name: 'Flat',         gains: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  { name: 'Rock',         gains: [5, 4, 3, -1, -2, 0, 2, 4, 5, 6] },
  { name: 'Pop',          gains: [-1, 2, 4, 5, 3, 0, -1, -1, -1, -1] },
  { name: 'Dance',        gains: [6, 5, 2, 0, -2, -3, 0, 4, 5, 5] },
  { name: 'Electronic',   gains: [5, 4, 1, -2, -3, 1, 2, 4, 5, 6] },
  { name: 'Jazz',         gains: [3, 2, 0, 2, -2, -2, 0, 1, 2, 3] },
  { name: 'Classical',    gains: [4, 3, 2, 0, -2, -2, 0, 2, 3, 4] },
  { name: 'Vocal',        gains: [-2, -2, 0, 3, 5, 5, 3, 1, 0, -1] },
  { name: 'R&B',          gains: [6, 5, 4, 1, -2, -1, 2, 3, 4, 4] },
  { name: 'Hip-Hop',      gains: [6, 5, 2, 1, -1, -1, 1, 2, 3, 3] },
  { name: 'Acoustic',     gains: [3, 2, 2, 3, 3, 2, 1, 2, 3, 3] },
  { name: 'Bass Boost',   gains: [8, 7, 5, 2, 0, 0, 0, 0, 0, 0] },
  { name: 'Treble Boost', gains: [0, 0, 0, 0, 0, 0, 2, 5, 7, 8] },
  { name: 'Bass & Treble',gains: [7, 5, 2, 0, -1, -1, 0, 2, 5, 7] },
]

// ── LocalStorage key ──────────────────────────────────────────────────────────
const STORAGE_KEY = 'lokal:eq'

function loadFromStorage(): { gains: number[]; enabled: boolean; presetName: string } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        gains: Array.isArray(parsed.gains) && parsed.gains.length === 10
          ? parsed.gains.map(Number)
          : new Array(10).fill(0),
        enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : true,
        presetName: typeof parsed.presetName === 'string' ? parsed.presetName : 'Flat',
      }
    }
  } catch {}
  return { gains: new Array(10).fill(0), enabled: true, presetName: 'Flat' }
}

function saveToStorage(gains: number[], enabled: boolean, presetName: string) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ gains, enabled, presetName }))
  } catch {}
}

// ── Store ─────────────────────────────────────────────────────────────────────
interface EqualizerState {
  gains: number[]       // Current 10-band gain values in dB
  enabled: boolean      // EQ bypass toggle
  presetName: string    // Active preset name ('Custom' if user modified)

  setGain: (bandIndex: number, gainDb: number) => void
  setEnabled: (enabled: boolean) => void
  applyPreset: (preset: EqPreset) => void
  resetBands: () => void
}

const initial = loadFromStorage()

export const useEqualizerStore = create<EqualizerState>((set, get) => ({
  gains: initial.gains,
  enabled: initial.enabled,
  presetName: initial.presetName,

  setGain: (bandIndex, gainDb) => {
    const next = [...get().gains]
    next[bandIndex] = Math.max(EQ_MIN, Math.min(EQ_MAX, gainDb))
    // Detect if this matches a preset exactly
    const matchedPreset = EQ_PRESETS.find(
      (p) => p.gains.every((g, i) => g === next[i])
    )
    const presetName = matchedPreset ? matchedPreset.name : 'Custom'
    set({ gains: next, presetName })
    saveToStorage(next, get().enabled, presetName)
  },

  setEnabled: (enabled) => {
    set({ enabled })
    saveToStorage(get().gains, enabled, get().presetName)
  },

  applyPreset: (preset) => {
    set({ gains: [...preset.gains], presetName: preset.name })
    saveToStorage(preset.gains, get().enabled, preset.name)
  },

  resetBands: () => {
    const flat = EQ_PRESETS[0]
    set({ gains: [...flat.gains], presetName: flat.name })
    saveToStorage(flat.gains, get().enabled, flat.name)
  },
}))

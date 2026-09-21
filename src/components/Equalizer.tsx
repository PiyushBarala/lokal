import React, { useRef, useEffect } from 'react'
import { useEqualizerStore, EQ_BANDS, EQ_PRESETS, EQ_MIN, EQ_MAX } from '../stores/equalizerStore'

// ── Helper: map gain dB → percentage for vertical slider CSS ─────────────────
// Sliders are vertical: 0% = EQ_MAX (top), 100% = EQ_MIN (bottom)
function gainToPercent(gain: number): number {
  return ((EQ_MAX - gain) / (EQ_MAX - EQ_MIN)) * 100
}

// ── Power toggle icon ─────────────────────────────────────────────────────────
const PowerIcon = ({ active }: { active: boolean }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"
    className={active ? 'text-accent' : 'text-[#888]'}>
    <path d="M13 3h-2v10h2V3zm4.83 2.17l-1.42 1.42C17.99 7.86 19 9.81 19 12c0 3.87-3.13 7-7 7s-7-3.13-7-7c0-2.19 1.01-4.14 2.58-5.42L6.17 5.17C4.23 6.82 3 9.26 3 12c0 4.97 4.03 9 9 9s9-4.03 9-9c0-2.74-1.23-5.18-3.17-6.83z" />
  </svg>
)

// ── EQ Band vertical slider ───────────────────────────────────────────────────
function EqBand({
  index,
  freq,
  label,
  gain,
  enabled,
  onChange,
}: {
  index: number
  freq: number
  label: string
  gain: number
  enabled: boolean
  onChange: (index: number, value: number) => void
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)

  const getGainFromY = (clientY: number): number => {
    const track = trackRef.current
    if (!track) return gain
    const rect = track.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height))
    const raw = EQ_MAX - ratio * (EQ_MAX - EQ_MIN)
    // Snap to 0 within ±0.5 dB
    return Math.abs(raw) < 0.5 ? 0 : Math.round(raw * 2) / 2
  }

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!enabled) return
    isDragging.current = true
      ; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    onChange(index, getGainFromY(e.clientY))
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current || !enabled) return
    onChange(index, getGainFromY(e.clientY))
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    isDragging.current = false
      ; (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
  }

  const fillPct = gainToPercent(gain)
  // zero line is at 50%
  const zeroY = 50
  const thumbY = gainToPercent(gain)

  // Fill: from zero line to thumb position
  const fillTop = Math.min(zeroY, thumbY)
  const fillHeight = Math.abs(zeroY - thumbY)

  return (
    <div className="flex flex-col items-center gap-1.5 select-none" style={{ width: 36 }}>
      {/* dB value label */}
      <span className={`text-[10px] font-mono tabular-nums w-full text-center ${gain > 0 ? 'text-accent' : gain < 0 ? 'text-[#ff6b6b]' : 'text-[#666]'
        }`}>
        {gain > 0 ? `+${gain.toFixed(1)}` : gain.toFixed(1)}
      </span>

      {/* Vertical slider track */}
      <div
        ref={trackRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className={`relative w-3 rounded-full bg-[#1e1e1e] border border-[#2a2a2a] ${enabled ? 'cursor-ns-resize' : 'cursor-not-allowed opacity-40'
          }`}
        style={{ height: 140 }}
        title={`${freq >= 1000 ? freq / 1000 + 'kHz' : freq + 'Hz'}: ${gain > 0 ? '+' : ''}${gain.toFixed(1)} dB`}
      >
        {/* Zero line */}
        <div
          className="absolute left-0 right-0 h-px bg-[#333] pointer-events-none"
          style={{ top: '50%' }}
        />

        {/* Fill from zero to current position */}
        <div
          className={`absolute left-0 right-0 rounded-full pointer-events-none transition-all duration-75 ${gain >= 0 ? 'bg-accent/70' : 'bg-[#ff6b6b]/60'
            }`}
          style={{
            top: `${fillTop}%`,
            height: `${fillHeight}%`,
          }}
        />

        {/* Thumb */}
        <div
          className={`absolute left-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 shadow-lg transition-colors duration-75 pointer-events-none ${enabled
              ? gain !== 0
                ? 'bg-accent border-accent/50 shadow-accent/30'
                : 'bg-[#555] border-[#666]'
              : 'bg-[#333] border-[#444]'
            }`}
          style={{ top: `calc(${thumbY}% - 8px)` }}
        />
      </div>

      {/* Frequency label */}
      <span className="text-[10px] text-[#555] font-mono w-full text-center">{label}</span>
    </div>
  )
}

// ── Main Equalizer Panel ───────────────────────────────────────────────────────
export function Equalizer({ onClose }: { onClose: () => void }): React.JSX.Element {
  const { gains, enabled, presetName, setGain, setEnabled, applyPreset, resetBands } = useEqualizerStore()
  const panelRef = useRef<HTMLDivElement>(null)

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    // Delay to avoid closing immediately on the EQ button click that opened it
    const t = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
    }, 100)
    return () => {
      clearTimeout(t)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [onClose])

  return (
    <div
      ref={panelRef}
      className="absolute bottom-[96px] right-4 z-[200] select-none"
      style={{ width: 480 }}
    >
      {/* Panel */}
      <div className="bg-[#111] border border-[#232323] rounded-2xl shadow-2xl overflow-hidden animate-fade-in">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e1e1e]">
          <div className="flex items-center gap-2.5">
            <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15" className="text-accent">
              <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
            </svg>
            <span className="text-sm font-bold text-white tracking-tight">Equalizer</span>
            {/* Preset badge */}
            <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${presetName === 'Custom'
                ? 'bg-[#ff6b6b]/15 text-[#ff8888]'
                : 'bg-accent/15 text-accent'
              }`}>
              {presetName}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Reset button */}
            <button
              onClick={resetBands}
              className="text-[11px] text-[#555] hover:text-[#888] transition-colors px-2 py-0.5 rounded hover:bg-white/5"
              title="Reset all bands to 0 dB"
            >
              Reset
            </button>

            {/* Power toggle */}
            <button
              onClick={() => setEnabled(!enabled)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${enabled
                  ? 'bg-accent/15 text-accent hover:bg-accent/25'
                  : 'bg-white/5 text-[#555] hover:bg-white/10'
                }`}
              title={enabled ? 'Disable EQ' : 'Enable EQ'}
            >
              <PowerIcon active={enabled} />
              <span>{enabled ? 'On' : 'Off'}</span>
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="text-[#555] hover:text-[#888] transition-colors p-1 rounded-lg hover:bg-white/5"
              title="Close equalizer"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Preset pills */}
        <div className="px-4 py-2.5 border-b border-[#1a1a1a] overflow-x-auto scrollbar-none">
          <div className="flex gap-1.5" style={{ minWidth: 'max-content' }}>
            {EQ_PRESETS.map((preset) => (
              <button
                key={preset.name}
                onClick={() => applyPreset(preset)}
                className={`text-[11px] px-2.5 py-1 rounded-full font-medium whitespace-nowrap transition-all ${presetName === preset.name && presetName !== 'Custom'
                    ? 'bg-accent text-black shadow-sm shadow-accent/30'
                    : 'bg-[#1e1e1e] text-[#777] hover:bg-[#252525] hover:text-[#aaa]'
                  }`}
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        {/* Bands */}
        <div className={`px-4 py-4 transition-opacity duration-200 ${enabled ? 'opacity-100' : 'opacity-50'}`}>
          <div className="flex items-end justify-between gap-1">
            {/* dB scale on left */}
            <div className="flex flex-col justify-between text-[9px] font-mono text-[#444] mr-1" style={{ height: 140 }}>
              <span>+12</span>
              <span>+6</span>
              <span className="text-[#333]">0</span>
              <span>-6</span>
              <span>-12</span>
            </div>

            {EQ_BANDS.map((band, i) => (
              <EqBand
                key={band.freq}
                index={i}
                freq={band.freq}
                label={band.label}
                gain={gains[i] ?? 0}
                enabled={enabled}
                onChange={setGain}
              />
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}

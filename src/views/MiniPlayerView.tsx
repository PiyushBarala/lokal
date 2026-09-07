import React, { useEffect, useState, useCallback } from 'react'
import type { Track } from '../types'

// ── Types ────────────────────────────────────────────────────────
type RepeatMode = 'off' | 'all' | 'one'

interface MiniState {
  currentTrack: Track | null
  isPlaying: boolean
  seekPosition: number
  duration: number
  volume: number
  isMuted: boolean
  shuffle: boolean
  repeat: RepeatMode
}

const DEFAULT_STATE: MiniState = {
  currentTrack: null,
  isPlaying: false,
  seekPosition: 0,
  duration: 0,
  volume: 0.8,
  isMuted: false,
  shuffle: false,
  repeat: 'off',
}

// ── Helpers ──────────────────────────────────────────────────────
function fmt(s: number): string {
  if (!isFinite(s) || s <= 0) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

// ── Icon SVGs ────────────────────────────────────────────────────
const PlayIcon = () => <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28"><path d="M8 5v14l11-7z"/></svg>
const PauseIcon = () => <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
const NextIcon = () => <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
const PrevIcon = () => <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
const Replay10Icon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
    <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
    <text x="12" y="14.5" fontSize="6.5" fontWeight="bold" textAnchor="middle" fill="currentColor" fontFamily="sans-serif">10</text>
  </svg>
)
const Forward10Icon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
    <path d="M12 5V1l5 5-5 5V7c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6h2c0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8z"/>
    <text x="12" y="14.5" fontSize="6.5" fontWeight="bold" textAnchor="middle" fill="currentColor" fontFamily="sans-serif">10</text>
  </svg>
)
const ShuffleIcon = ({ on }: { on: boolean }) => (
  <svg viewBox="0 0 24 24" fill={on ? '#1DB954' : 'currentColor'} width="16" height="16">
    <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/>
  </svg>
)
const RepeatIcon = ({ mode }: { mode: RepeatMode }) => (
  <svg viewBox="0 0 24 24" fill={mode !== 'off' ? '#1DB954' : 'currentColor'} width="16" height="16">
    {mode === 'one'
      ? <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4zm-4-2V9h-1l-2 1v1h1.5v4H13z"/>
      : <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/>
    }
  </svg>
)
const VolumeIcon = ({ muted, vol }: { muted: boolean; vol: number }) => (
  <svg viewBox="0 0 24 24" fill="rgba(255,255,255,0.7)" width="14" height="14">
    {muted || vol === 0
      ? <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
      : vol < 0.5
        ? <path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z"/>
        : <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
    }
  </svg>
)

// ── Mini Player View ─────────────────────────────────────────────
export function MiniPlayerView(): React.JSX.Element {
  const [state, setState] = useState<MiniState>(DEFAULT_STATE)
  const [isDragging, setIsDragging] = useState(false)
  const [dragPos, setDragPos] = useState(0)

  // Subscribe to player state from main window
  useEffect(() => {
    const unsub = window.lokal.miniplayer.onState((incoming) => {
      setState(incoming as MiniState)
    })
    return unsub
  }, [])

  const cmd = useCallback((type: Parameters<typeof window.lokal.miniplayer.sendCommand>[0]['type'], payload?: unknown) => {
    window.lokal.miniplayer.sendCommand({ type, payload })
  }, [])

  const handleClose = () => window.lokal.miniplayer.close()

  // Seek bar
  const handleSeekDown = useCallback((e: React.PointerEvent<HTMLInputElement>) => {
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch {}
    setDragPos(state.seekPosition)
    setIsDragging(true)
  }, [state.seekPosition])

  const handleSeekChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setDragPos(Number(e.target.value))
  }, [])

  const handleSeekUp = useCallback((e: React.PointerEvent<HTMLInputElement>) => {
    try { e.currentTarget.releasePointerCapture(e.pointerId) } catch {}
    const val = Number(e.currentTarget.value)
    setIsDragging(false)
    cmd('seek', val)
  }, [cmd])

  const displayPos = isDragging ? dragPos : state.seekPosition
  const progressPct = state.duration > 0 ? (displayPos / state.duration) * 100 : 0
  const artworkUrl = state.currentTrack?.artworkPath
    ? 'lokal://media/' + state.currentTrack.artworkPath.replace(/\\/g, '/')
    : null

  return (
    <div className="relative w-full h-screen overflow-hidden select-none flex flex-col"
      style={{ background: '#1a1a1a' }}>

      {/* ── Blurred album art background ── */}
      {artworkUrl && (
        <>
          <img
            src={artworkUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            style={{ filter: 'blur(40px)', transform: 'scale(1.2)', opacity: 0.55 }}
          />
          <div className="absolute inset-0 bg-black/60" />
        </>
      )}

      {/* ── Top bar: drag region + close ── */}
      <div
        className="relative z-10 flex items-center justify-between px-3 pt-2 pb-1 flex-shrink-0 drag-region"
        style={{ height: '36px' }}
      >
        {/* Drag handle dots */}
        <div className="no-drag opacity-40 hover:opacity-70 transition-opacity cursor-default">
          <svg viewBox="0 0 24 24" fill="white" width="16" height="16">
            <path d="M11 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm-2-8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
          </svg>
        </div>
        <button
          onClick={handleClose}
          className="no-drag w-6 h-6 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="white" width="12" height="12">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      </div>

      {/* ── Album art ── */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-6 py-2 min-h-0">
        <div className="w-full aspect-square max-h-full rounded-xl overflow-hidden shadow-2xl">
          {artworkUrl ? (
            <img
              src={artworkUrl}
              alt="Album art"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-[#282828] flex items-center justify-center rounded-xl">
              <svg viewBox="0 0 24 24" fill="#535353" width="64" height="64">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
              </svg>
            </div>
          )}
        </div>
      </div>

      {/* ── Track info + controls ── */}
      <div className="relative z-10 flex-shrink-0 px-5 pb-4 flex flex-col gap-2">

        {/* Track title + artist */}
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-white font-semibold text-sm truncate leading-tight">
              {state.currentTrack?.title ?? 'Not playing'}
            </p>
            <p className="text-white/60 text-xs truncate mt-0.5">
              {state.currentTrack?.artist ?? ''}
            </p>
          </div>
        </div>

        {/* Seek bar */}
        <div className="flex items-center gap-2 w-full">
          <span className="text-white/50 text-[10px] tabular-nums w-8 text-right">
            {fmt(displayPos)}
          </span>
          <div className="relative flex-1 h-3 group cursor-pointer flex items-center">
            <div className="w-full h-1 bg-white/20 rounded-full relative overflow-visible pointer-events-none">
              <div
                className="absolute inset-y-0 left-0 bg-white group-hover:bg-[#1DB954] rounded-full transition-colors"
                style={{ width: `${progressPct}%` }}
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-white rounded-full shadow pointer-events-none transition-opacity"
                style={{
                  left: `${progressPct}%`,
                  opacity: isDragging ? 1 : undefined,
                  display: isDragging ? 'block' : undefined
                }}
              />
            </div>
            <input
              type="range"
              min={0}
              max={state.duration || 1}
              step={0.1}
              value={displayPos}
              onPointerDown={handleSeekDown}
              onChange={handleSeekChange}
              onPointerUp={handleSeekUp}
              onKeyUp={(e) => {
                if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                  cmd('seek', Number(e.currentTarget.value))
                }
              }}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
          <span className="text-white/50 text-[10px] tabular-nums w-8">
            {fmt(state.duration)}
          </span>
        </div>

        {/* Main controls */}
        <div className="flex items-center justify-center gap-3 py-1">
          <button
            onClick={() => cmd('prev')}
            className="text-white/70 hover:text-white transition-colors"
            title="Previous"
          >
            <PrevIcon />
          </button>
          <button
            onClick={() => cmd('skip-relative', -10)}
            className="text-white/70 hover:text-white hover:scale-110 active:scale-95 transition-all p-1"
            title="Rewind 10s"
          >
            <Replay10Icon />
          </button>
          <button
            onClick={() => cmd('toggle-play')}
            className="w-11 h-11 rounded-full bg-white flex items-center justify-center text-black hover:scale-105 active:scale-95 transition-transform shadow-lg"
            title={state.isPlaying ? 'Pause' : 'Play'}
          >
            {state.isPlaying ? <PauseIcon /> : <PlayIcon />}
          </button>
          <button
            onClick={() => cmd('skip-relative', 10)}
            className="text-white/70 hover:text-white hover:scale-110 active:scale-95 transition-all p-1"
            title="Skip 10s"
          >
            <Forward10Icon />
          </button>
          <button
            onClick={() => cmd('next')}
            className="text-white/70 hover:text-white transition-colors"
            title="Next"
          >
            <NextIcon />
          </button>
        </div>

        {/* Sub controls: shuffle, repeat, volume */}
        <div className="flex items-center justify-between px-1">
          <button
            onClick={() => cmd('toggle-shuffle')}
            className="transition-opacity hover:opacity-100"
            style={{ opacity: state.shuffle ? 1 : 0.5 }}
          >
            <ShuffleIcon on={state.shuffle} />
          </button>

          {/* Inline volume */}
          <div className="flex items-center gap-1.5 flex-1 mx-3">
            <VolumeIcon muted={state.isMuted} vol={state.volume} />
            <div className="relative flex-1 h-0.5 group">
              <div className="absolute inset-0 bg-white/20 rounded-full" />
              <div
                className="absolute inset-y-0 left-0 bg-white/70 rounded-full pointer-events-none"
                style={{ width: `${(state.isMuted ? 0 : state.volume) * 100}%` }}
              />
              <input
                type="range" min={0} max={1} step={0.01}
                value={state.isMuted ? 0 : state.volume}
                onChange={(e) => cmd('set-volume', Number(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                style={{ height: '12px', top: '-5px' }}
              />
            </div>
          </div>

          <button
            onClick={() => cmd('cycle-repeat')}
            className="transition-opacity hover:opacity-100"
            style={{ opacity: state.repeat !== 'off' ? 1 : 0.5 }}
          >
            <RepeatIcon mode={state.repeat} />
          </button>
        </div>
      </div>
    </div>
  )
}

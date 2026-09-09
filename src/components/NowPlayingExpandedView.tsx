import React, { useState, useEffect, useRef } from 'react'
import { usePlayerStore } from '../stores/playerStore'
import { seekAudio } from './AudioEngine'
import { AddToPlaylistModal } from './AddToPlaylistModal'
import { WindowControls } from './WindowControls'
import { getGradientPalette } from '../utils/colorExtractor'

function formatTime(s: number): string {
  if (!isFinite(s) || isNaN(s)) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export function NowPlayingExpandedView(): React.JSX.Element {
  const {
    currentTrack,
    isPlaying,
    togglePlay,
    next,
    prev,
    seekPosition,
    duration,
    shuffle,
    toggleShuffle,
    repeat,
    cycleRepeat,
    volume,
    setVolume,
    isMuted,
    toggleMute,
    dominantColor,
    setExpandedNowPlaying,
    queue,
    queueIndex,
  } = usePlayerStore()

  const [isIdle, setIsIdle] = useState(false)
  const [showAddToPlaylist, setShowAddToPlaylist] = useState(false)
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Option 7: 3D Parallax Tilt & Specular Glare State ───────────
  const [tilt, setTilt] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [glare, setGlare] = useState<{ x: number; y: number; opacity: number }>({
    x: 50,
    y: 50,
    opacity: 0,
  })
  const [isArtHovered, setIsArtHovered] = useState(false)
  const [isWideThumbnail, setIsWideThumbnail] = useState(false)

  useEffect(() => {
    setIsWideThumbnail(false)
  }, [currentTrack?.filePath, currentTrack?.id])

  // ── Option 11: Volume HUD State ─────────────────────────────────
  const [volumeHUD, setVolumeHUD] = useState<{
    visible: boolean
    volume: number
    isMuted: boolean
  } | null>(null)
  const volumeHUDTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const triggerVolumeHUD = (vol: number, muted: boolean) => {
    if (volumeHUDTimerRef.current) clearTimeout(volumeHUDTimerRef.current)
    setVolumeHUD({ visible: true, volume: vol, isMuted: muted })
    volumeHUDTimerRef.current = setTimeout(() => {
      setVolumeHUD(null)
    }, 1300)
  }

  // ── Fullscreen state & helpers ──────────────────────────────────
  const [isWindowFullScreen, setIsWindowFullScreen] = useState(false)

  useEffect(() => {
    if (window.lokal?.window?.isFullScreen) {
      window.lokal.window.isFullScreen().then(setIsWindowFullScreen).catch(() => {})
    }
    const unsubs: (() => void)[] = []
    if (window.lokal?.window?.onFullScreenChange) {
      unsubs.push(
        window.lokal.window.onFullScreenChange((fs) => {
          setIsWindowFullScreen(fs)
        })
      )
    }
    const handleHtmlFsChange = () => {
      setIsWindowFullScreen(Boolean(document.fullscreenElement))
    }
    document.addEventListener('fullscreenchange', handleHtmlFsChange)
    unsubs.push(() => document.removeEventListener('fullscreenchange', handleHtmlFsChange))

    return () => {
      unsubs.forEach((u) => u())
    }
  }, [])

  const toggleFullScreen = async () => {
    try {
      if (window.lokal?.window?.toggleFullScreen) {
        await window.lokal.window.toggleFullScreen()
      } else if (document.fullscreenElement) {
        await document.exitFullscreen()
      } else {
        await document.documentElement.requestFullscreen()
      }
    } catch (err) {
      console.error('Fullscreen toggle failed:', err)
    }
  }

  // Safely collapses expanded view and ensures window exits fullscreen mode
  const handleCollapse = async () => {
    try {
      if (window.lokal?.window?.isFullScreen) {
        const fs = await window.lokal.window.isFullScreen()
        if (fs) {
          await window.lokal.window.toggleFullScreen?.()
        }
      } else if (document.fullscreenElement) {
        await document.exitFullscreen().catch(() => {})
      }
    } catch (err) {
      console.error('Exit fullscreen on collapse failed:', err)
    }
    setExpandedNowPlaying(false)
  }

  // ── Idle Activity Detector ──────────────────────────────────────
  useEffect(() => {
    const handleActivity = () => {
      setIsIdle(false)
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
      idleTimerRef.current = setTimeout(() => {
        setIsIdle(true)
      }, 3500)
    }

    idleTimerRef.current = setTimeout(() => {
      setIsIdle(true)
    }, 3500)

    window.addEventListener('mousemove', handleActivity)
    window.addEventListener('mousedown', handleActivity)
    window.addEventListener('keydown', handleActivity)
    window.addEventListener('wheel', handleActivity)

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
      window.removeEventListener('mousemove', handleActivity)
      window.removeEventListener('mousedown', handleActivity)
      window.removeEventListener('keydown', handleActivity)
      window.removeEventListener('wheel', handleActivity)
    }
  }, [])

  // ── Option 11: Keyboard Shortcuts ───────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if an input or textarea has focus
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (showAddToPlaylist) return

      switch (e.code) {
        case 'Space':
          e.preventDefault()
          togglePlay()
          break
        case 'ArrowUp':
          e.preventDefault()
          {
            const newVol = Math.min(1, Math.round((volume + 0.05) * 100) / 100)
            setVolume(newVol)
            if (isMuted) toggleMute()
            triggerVolumeHUD(newVol, false)
          }
          break
        case 'ArrowDown':
          e.preventDefault()
          {
            const newVol = Math.max(0, Math.round((volume - 0.05) * 100) / 100)
            setVolume(newVol)
            triggerVolumeHUD(newVol, false)
          }
          break
        case 'ArrowLeft':
          e.preventDefault()
          if (e.shiftKey) {
            prev()
          } else {
            seekAudio(Math.max(0, seekPosition - 5))
          }
          break
        case 'ArrowRight':
          e.preventDefault()
          if (e.shiftKey) {
            next()
          } else {
            seekAudio(Math.min(duration, seekPosition + 5))
          }
          break
        case 'KeyF':
          e.preventDefault()
          toggleFullScreen()
          break
        case 'KeyM':
          e.preventDefault()
          toggleMute()
          triggerVolumeHUD(volume, !isMuted)
          break
        case 'KeyL':
          e.preventDefault()
          handleLike()
          break
        case 'Escape':
        case 'F11':
          e.preventDefault()
          handleCollapse()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    showAddToPlaylist,
    togglePlay,
    volume,
    isMuted,
    setVolume,
    toggleMute,
    prev,
    next,
    seekPosition,
    duration,
    handleCollapse,
  ])

  // ── Option 11: Scroll Wheel Volume Control ──────────────────────
  const handleContainerWheel = (e: React.WheelEvent) => {
    // Check if event occurred inside an input or scrollable element
    const target = e.target as HTMLElement
    if (target.tagName === 'INPUT' || target.closest('.no-wheel-hijack')) return

    e.preventDefault()
    const delta = e.deltaY < 0 ? 0.04 : -0.04
    const newVol = Math.max(0, Math.min(1, Math.round((volume + delta) * 100) / 100))
    setVolume(newVol)
    if (isMuted && newVol > 0) toggleMute()
    triggerVolumeHUD(newVol, false)
  }

  // ── Option 7: 3D Tilt Mouse Handlers ────────────────────────────
  const handleArtMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return
    const normX = (e.clientX - rect.left) / rect.width - 0.5
    const normY = (e.clientY - rect.top) / rect.height - 0.5
    const maxTilt = 13
    setTilt({
      x: -normY * maxTilt * 2,
      y: normX * maxTilt * 2,
    })
    setGlare({
      x: (normX + 0.5) * 100,
      y: (normY + 0.5) * 100,
      opacity: 0.6,
    })
    setIsArtHovered(true)
  }

  const handleArtMouseLeave = () => {
    setTilt({ x: 0, y: 0 })
    setGlare((g) => ({ ...g, opacity: 0 }))
    setIsArtHovered(false)
  }

  const handleLike = async () => {
    if (!currentTrack?.id) return
    const liked = await window.lokal.db.toggleLike(currentTrack.id)
    usePlayerStore.setState((s) => ({
      currentTrack: s.currentTrack ? { ...s.currentTrack, liked } : null,
      queue: s.queue.map((t) => (t.id === currentTrack.id ? { ...t, liked } : t)),
    }))
    window.dispatchEvent(
      new CustomEvent('lokal:toast', {
        detail: liked ? 'Added to Liked Songs' : 'Removed from Liked Songs',
      })
    )
  }

  if (!currentTrack) {
    return (
      <div className="fixed inset-0 z-50 bg-[#0a0a0a] flex items-center justify-center text-white select-none">
        <p className="text-sm text-[#b3b3b3]">No track currently playing.</p>
        <button
          onClick={handleCollapse}
          className="absolute top-6 right-6 text-white/70 hover:text-white cursor-pointer"
        >
          ✕
        </button>
      </div>
    )
  }

  const progressPercent = duration > 0 ? (seekPosition / duration) * 100 : 0
  const artworkUrl = currentTrack.artworkPath
    ? 'lokal://media/' + currentTrack.artworkPath.replace(/\\/g, '/')
    : null

  // Dynamic gradient palette derived from dominant color
  const palette = getGradientPalette(dominantColor || '#1e3a2e')

  // ── Option 10: Next track in queue ──────────────────────────────
  const nextTrack = queue[queueIndex + 1] ?? (repeat === 'all' && queue.length > 1 ? queue[0] : null)
  const nextArtworkUrl = nextTrack?.artworkPath
    ? 'lokal://media/' + nextTrack.artworkPath.replace(/\\/g, '/')
    : null

  return (
    <div
      onWheel={handleContainerWheel}
      onDoubleClick={(e) => {
        // Double click toggles fullscreen unless clicking buttons/sliders
        const target = e.target as HTMLElement
        if (
          target.closest('button') ||
          target.closest('input') ||
          target.closest('.group') ||
          target.closest('.no-double-click')
        ) {
          return
        }
        toggleFullScreen()
      }}
      className={`fixed inset-0 z-50 flex flex-col justify-between overflow-hidden select-none bg-[#080808] transition-all ${
        isIdle ? 'cursor-none' : ''
      }`}
    >
      {/* ── Blurred Living Thumbnail & Dynamic Moving Mesh Backdrop ──── */}
      <div className="absolute inset-0 bg-[#080808] -z-20 overflow-hidden pointer-events-none select-none">
        {/* Living, breathing blurred thumbnail */}
        {artworkUrl && (
          <div className="absolute -inset-20 overflow-hidden opacity-75">
            <img
              src={artworkUrl}
              alt=""
              className="w-full h-full object-cover select-none pointer-events-none animate-alive-thumbnail"
              style={{
                filter: 'blur(42px) saturate(1.5) brightness(0.6)',
                animationPlayState: isPlaying ? 'running' : 'paused',
              }}
            />
          </div>
        )}

        {/* Fluid Swirling Mesh Gradient Accents layered over blurred thumbnail */}
        <div
          className="absolute -inset-28 overflow-hidden pointer-events-none mix-blend-screen opacity-70"
          style={{
            filter: 'blur(88px)',
          }}
        >
          {/* Blob 1: Primary Dominant Tone */}
          <div
            className="absolute top-[6%] left-[10%] w-[68vw] h-[68vh] rounded-full animate-fluid-blob-1 transition-colors duration-1000"
            style={{
              background: `radial-gradient(circle, ${palette.primary}e0 0%, ${palette.primary}00 70%)`,
              animationPlayState: isPlaying ? 'running' : 'paused',
            }}
          />

          {/* Blob 2: Vibrant Secondary Shift */}
          <div
            className="absolute bottom-[6%] right-[6%] w-[64vw] h-[64vh] rounded-full animate-fluid-blob-2 transition-colors duration-1000"
            style={{
              background: `radial-gradient(circle, ${palette.secondary}d0 0%, ${palette.secondary}00 70%)`,
              animationPlayState: isPlaying ? 'running' : 'paused',
            }}
          />

          {/* Blob 3: Accent / Tertiary Tone */}
          <div
            className="absolute top-[36%] right-[26%] w-[50vw] h-[50vh] rounded-full animate-fluid-blob-3 transition-colors duration-1000"
            style={{
              background: `radial-gradient(circle, ${palette.tertiary}c0 0%, ${palette.tertiary}00 68%)`,
              animationPlayState: isPlaying ? 'running' : 'paused',
            }}
          />

          {/* Blob 4: Soft Central Mood Core */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[72vw] h-[72vh] rounded-full transition-colors duration-1000"
            style={{
              background: `radial-gradient(circle, ${palette.primary}50 0%, transparent 70%)`,
            }}
          />
        </div>

        {/* Deep cinematic vignette to maintain contrast and legibility */}
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at 50% 45%, transparent 20%, rgba(8,8,8,0.55) 65%, #080808 100%)',
          }}
        />

        {/* Bottom subtle scrim */}
        <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-[#080808] to-transparent opacity-80" />
      </div>

      {/* ── Option 11: Volume HUD Floating Overlay ───────────────── */}
      {volumeHUD?.visible && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-all duration-200">
          <div className="backdrop-blur-2xl bg-black/80 border border-white/20 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-4 text-white">
            {volumeHUD.isMuted || volumeHUD.volume === 0 ? (
              <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20" className="text-red-400">
                <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
              </svg>
            ) : volumeHUD.volume < 0.5 ? (
              <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20" className="text-accent">
                <path d="M7 9v6h4l5 5V4L11 9H7z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20" className="text-accent">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
              </svg>
            )}
            <div className="w-28 h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-all duration-75 shadow-[0_0_8px_rgba(29,185,84,0.8)]"
                style={{ width: `${(volumeHUD.isMuted ? 0 : volumeHUD.volume) * 100}%` }}
              />
            </div>
            <span className="text-xs font-mono font-bold w-9 text-right tabular-nums">
              {volumeHUD.isMuted ? 'Muted' : `${Math.round(volumeHUD.volume * 100)}%`}
            </span>
          </div>
        </div>
      )}

      {/* ── Top Bar Header (fades when idle) ── */}
      <header
        className={`flex items-center justify-between pl-8 pr-0 pt-0 pb-2 transition-opacity duration-500 drag-region z-30 ${
          isIdle ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0 pt-5 no-drag">
          <p className="text-xs font-bold text-white/80 uppercase tracking-wider truncate">
            {currentTrack.album || currentTrack.artist || 'Now Playing'}
          </p>
        </div>

        <div className="flex items-center gap-3 no-drag">
          {/* Action buttons */}
          <div className="flex items-center gap-2 pt-2">
            {/* Add to playlist button */}
            <button
              onClick={() => setShowAddToPlaylist(true)}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow cursor-pointer"
              title="Add to playlist"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
              </svg>
            </button>

            {/* Fullscreen toggle button */}
            <button
              onClick={toggleFullScreen}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow cursor-pointer"
              title={isWindowFullScreen ? 'Exit Fullscreen (F)' : 'Enter Fullscreen (F)'}
            >
              {isWindowFullScreen ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                  <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                  <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                </svg>
              )}
            </button>

            {/* Collapse / Close expanded view */}
            <button
              onClick={handleCollapse}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow cursor-pointer"
              title="Collapse (Esc)"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="15" height="15">
                <path d="M4 14h6m0 0v6m0-6L3 21M20 10h-6m0 0V4m0 6l7-7" />
              </svg>
            </button>
          </div>

          {/* Window navigation buttons */}
          <WindowControls />
        </div>
      </header>

      {/* ── Center Content: Album Art with Option 7 (3D Parallax Tilt) ── */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 sm:px-8 relative min-h-0 overflow-hidden">
        <div
          className={`flex items-center justify-center transition-all duration-500 w-full ${
            isIdle ? 'pb-20 sm:pb-28' : ''
          }`}
        >
          <div
            onMouseMove={handleArtMouseMove}
            onMouseLeave={handleArtMouseLeave}
            className={`relative rounded-2xl overflow-hidden ring-1 ring-white/15 cursor-pointer select-none transition-all duration-500 ${
              isWideThumbnail
                ? 'max-w-[560px] w-[50vh] sm:w-[58vh] max-h-[340px] aspect-video'
                : 'max-w-[420px] max-h-[420px] w-[28vh] h-[28vh] min-w-[140px] min-h-[140px] sm:w-[32vh] sm:h-[32vh] lg:w-[42vh] lg:h-[42vh] aspect-square'
            }`}
            style={{
              transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale3d(${
                isArtHovered ? 1.04 : 1
              }, ${isArtHovered ? 1.04 : 1}, ${isArtHovered ? 1.04 : 1})`,
              transition: isArtHovered
                ? 'transform 0.08s ease-out'
                : 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.6s ease',
              boxShadow: isArtHovered
                ? `${-tilt.y * 2.5}px ${tilt.x * 2.5 + 24}px 50px -10px rgba(0, 0, 0, 0.8), 0 0 45px ${dominantColor}55`
                : `0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 35px ${dominantColor}30`,
              transformStyle: 'preserve-3d',
            }}
          >
            {artworkUrl ? (
              <img
                src={artworkUrl}
                alt={currentTrack.title}
                onLoad={(e) => {
                  const img = e.currentTarget
                  if (img.naturalWidth && img.naturalHeight) {
                    setIsWideThumbnail(img.naturalWidth / img.naturalHeight > 1.25)
                  }
                }}
                className="w-full h-full object-cover select-none pointer-events-none"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[#282828] to-[#121212] flex items-center justify-center text-white/40">
                <svg viewBox="0 0 24 24" fill="currentColor" width="72" height="72">
                  <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                </svg>
              </div>
            )}

            {/* Specular Glare Overlay (Shifts with tilt angle) */}
            <div
              className="absolute inset-0 pointer-events-none rounded-2xl transition-opacity duration-300 z-10"
              style={{
                opacity: glare.opacity,
                background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.12) 30%, transparent 70%)`,
                mixBlendMode: 'overlay',
              }}
            />

            {/* Subtle top edge specular highlight */}
            <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-white/15 to-transparent pointer-events-none z-10" />
          </div>
        </div>

        {/* ── Bottom-Left Song Title & Artist (Spotify Idle Mode) ── */}
        <div
          className={`absolute bottom-10 sm:bottom-12 left-6 sm:left-10 max-w-[calc(100%-48px)] sm:max-w-[420px] transition-all duration-700 pointer-events-none z-10 ${
            isIdle ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
          }`}
        >
          <h1 className="text-lg sm:text-xl md:text-2xl font-extrabold text-white tracking-tight drop-shadow-lg truncate max-w-[380px]">
            {currentTrack.title}
          </h1>
          <p className="text-xs sm:text-sm font-medium text-white/80 mt-1 drop-shadow truncate max-w-[340px]">
            {currentTrack.artist}
          </p>
        </div>

        {/* ── Option 10: Floating "Up Next" Glass Pill ─────────────── */}
        {nextTrack && (
          <div
            onClick={() => next()}
            className={`absolute right-6 sm:right-10 z-20 transition-all duration-500 ${
              isIdle ? 'bottom-16 sm:bottom-20 opacity-80 hover:opacity-100' : 'bottom-28 sm:bottom-32 opacity-90 hover:opacity-100'
            }`}
          >
            <div
              className="backdrop-blur-2xl bg-black/50 hover:bg-black/75 border border-white/15 hover:border-white/30 shadow-[0_12px_36px_rgba(0,0,0,0.65)] ring-1 ring-white/10 rounded-full pl-2.5 pr-4 py-2 flex items-center gap-3.5 transition-all duration-300 cursor-pointer hover:scale-[1.03] active:scale-95 group"
              title={`Up Next: ${nextTrack.title} — Click to skip`}
            >
              {/* Mini Artwork Avatar */}
              <div className="w-9 h-9 rounded-full overflow-hidden bg-white/10 ring-2 ring-white/20 shadow-md flex-shrink-0 group-hover:ring-accent/70 transition-all">
                {nextArtworkUrl ? (
                  <img src={nextArtworkUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/40">
                    <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                      <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Track Info */}
              <div className="min-w-0 pr-1">
                <div className="flex items-center gap-1.5 leading-none">
                  <span className="text-[10px] font-bold tracking-widest text-emerald-400 uppercase">Up Next</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse shadow-[0_0_8px_#1db954]" />
                </div>
                <p className="text-xs font-semibold text-white/95 truncate max-w-[130px] sm:max-w-[190px] mt-0.5 leading-tight group-hover:text-accent transition-colors">
                  {nextTrack.title}
                </p>
                <p className="text-[11px] text-white/60 truncate max-w-[130px] sm:max-w-[190px] leading-tight">
                  {nextTrack.artist}
                </p>
              </div>

              {/* Quick Skip Icon Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  next()
                }}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/25 text-white/80 hover:text-white flex items-center justify-center transition-all hover:scale-110 active:scale-90 flex-shrink-0 cursor-pointer shadow-sm"
                title="Play next track"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13">
                  <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* ── Option 9: Ambient Hairline Progress Bar (Idle Mode) ─── */}
        <div
          className={`absolute bottom-2 sm:bottom-3 left-6 sm:left-10 right-6 sm:right-10 z-30 flex flex-col gap-1.5 transition-all duration-700 ${
            isIdle
              ? 'opacity-85 translate-y-0 pointer-events-auto'
              : 'opacity-0 translate-y-2 pointer-events-none'
          }`}
        >
          {/* Hairline interactive bar */}
          <div className="relative w-full h-[2.5px] hover:h-[5px] bg-white/15 rounded-full overflow-hidden cursor-pointer transition-all">
            <div
              className="h-full bg-gradient-to-r from-accent to-[#1ed760] rounded-full transition-[width] duration-150 relative shadow-[0_0_10px_rgba(29,185,84,0.8)]"
              style={{ width: `${progressPercent}%` }}
            />
            <input
              type="range"
              min={0}
              max={duration || 1}
              step={0.1}
              value={seekPosition}
              onChange={(e) => seekAudio(parseFloat(e.target.value))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              title={`Seek: ${formatTime(seekPosition)}`}
            />
          </div>

          {/* Discreet time stamps */}
          <div className="flex items-center justify-between text-[11px] font-mono text-white/50 tracking-wider select-none px-0.5">
            <span>{formatTime(seekPosition)}</span>
            <span>-{formatTime(Math.max(0, duration - seekPosition))}</span>
          </div>
        </div>
      </main>

      {/* ── Bottom Playback Bar (Fades smoothly when idle) ── */}
      <footer
        className={`px-8 pb-8 pt-4 flex flex-col gap-3 transition-opacity duration-500 z-20 ${
          isIdle ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        {/* Track Title + Controls Row */}
        <div className="flex items-center justify-between">
          {/* Left: Track title & like */}
          <div className="flex items-center gap-4 min-w-0 max-w-[280px] w-1/4 flex-shrink-0">
            <div className="min-w-0 flex-1 overflow-hidden">
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight truncate max-w-[200px]">
                {currentTrack.title}
              </h2>
              <p className="text-xs sm:text-sm text-[#b3b3b3] truncate max-w-[200px]">{currentTrack.artist}</p>
            </div>
            <button
              onClick={handleLike}
              className={`p-1 rounded-full transition-transform active:scale-125 cursor-pointer ${
                currentTrack.liked ? 'text-accent' : 'text-[#b3b3b3] hover:text-white'
              }`}
              title={currentTrack.liked ? 'Remove from Liked' : 'Save to Liked (L)'}
            >
              <svg
                viewBox="0 0 24 24"
                fill={currentTrack.liked ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth="2"
                width="20"
                height="20"
              >
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            </button>
          </div>

          {/* Center: Playback Buttons */}
          <div className="flex items-center gap-5 justify-center flex-1">
            {/* Shuffle */}
            <button
              onClick={toggleShuffle}
              className={`transition-colors cursor-pointer ${
                shuffle ? 'text-accent' : 'text-[#b3b3b3] hover:text-white'
              }`}
              title="Shuffle"
            >
              <svg viewBox="0 0 24 24" fill={shuffle ? '#1DB954' : 'currentColor'} width="20" height="20">
                <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z" />
              </svg>
            </button>

            {/* Previous */}
            <button
              onClick={prev}
              className="text-[#b3b3b3] hover:text-white transition-colors cursor-pointer"
              title="Previous (Shift + ←)"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
              </svg>
            </button>

            {/* Play / Pause Pill */}
            <button
              onClick={togglePlay}
              className="w-12 h-12 rounded-full bg-white text-black hover:scale-105 active:scale-95 flex items-center justify-center transition-all shadow-xl cursor-pointer"
              title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            >
              {isPlaying ? (
                <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24" className="ml-0.5">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            {/* Next */}
            <button
              onClick={next}
              className="text-[#b3b3b3] hover:text-white transition-colors cursor-pointer"
              title="Next (Shift + →)"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
              </svg>
            </button>

            {/* Repeat */}
            <button
              onClick={cycleRepeat}
              className={`transition-colors cursor-pointer ${
                repeat !== 'off' ? 'text-accent' : 'text-[#b3b3b3] hover:text-white'
              }`}
              title="Repeat"
            >
              <svg viewBox="0 0 24 24" fill={repeat !== 'off' ? '#1DB954' : 'currentColor'} width="20" height="20">
                {repeat === 'one' ? (
                  <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4zm-4-2V9h-1l-2 1v1h1.5v4H13z" />
                ) : (
                  <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
                )}
              </svg>
            </button>
          </div>

          {/* Right: Volume & Collapse button */}
          <div className="flex items-center gap-3 justify-end w-1/4">
            <button
              onClick={toggleMute}
              className="text-[#b3b3b3] hover:text-white transition-colors cursor-pointer"
              title={isMuted ? 'Unmute (M)' : 'Mute (M)'}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                {isMuted || volume === 0 ? (
                  <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                ) : (
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                )}
              </svg>
            </button>
            <div className="relative w-24 h-1 group">
              <div className="absolute inset-0 bg-white/20 rounded-full" />
              <div
                className="absolute inset-y-0 left-0 bg-white group-hover:bg-accent rounded-full transition-colors pointer-events-none"
                style={{ width: `${(isMuted ? 0 : volume) * 100}%` }}
              />
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  const v = parseFloat(e.target.value)
                  setVolume(v)
                  triggerVolumeHUD(v, isMuted && v === 0)
                }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
            <button
              onClick={handleCollapse}
              className="text-[#b3b3b3] hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors ml-2 cursor-pointer"
              title="Collapse (Esc)"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="20" height="20">
                <path d="M4 14h6m0 0v6m0-6L3 21M20 10h-6m0 0V4m0 6l7-7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Seek progress slider */}
        <div className="flex items-center gap-3 w-full">
          <span className="text-xs text-[#b3b3b3] tabular-nums w-10 text-right">
            {formatTime(seekPosition)}
          </span>
          <div className="relative flex-1 h-1 group py-1.5 cursor-pointer flex items-center">
            <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden relative">
              <div
                className="h-full bg-white group-hover:bg-accent rounded-full transition-colors pointer-events-none"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <input
              type="range"
              min={0}
              max={duration || 1}
              step={0.1}
              value={seekPosition}
              onChange={(e) => seekAudio(parseFloat(e.target.value))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
          <span className="text-xs text-[#b3b3b3] tabular-nums w-10">
            {formatTime(duration)}
          </span>
        </div>
      </footer>

      {showAddToPlaylist && currentTrack && (
        <AddToPlaylistModal
          track={currentTrack}
          isOpen={showAddToPlaylist}
          onClose={() => setShowAddToPlaylist(false)}
        />
      )}
    </div>
  )
}

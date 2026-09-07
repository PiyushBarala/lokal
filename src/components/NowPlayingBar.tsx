import React, { useCallback, useState, useRef, useEffect } from 'react'
import { usePlayerStore } from '../stores/playerStore'
import { seekAudio } from './AudioEngine'
import { ArtworkCell } from './ArtworkCell'
import { AddToPlaylistModal } from './AddToPlaylistModal'
import { useContextMenuStore } from '../stores/contextMenuStore'

function formatTime(s: number): string {
  if (!isFinite(s) || isNaN(s)) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

// ── Icon primitives ──────────────────────────────────────────────
const PlayIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
    <path d="M8 5v14l11-7z"/>
  </svg>
)
const PauseIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
  </svg>
)
const NextIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
    <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
  </svg>
)
const PrevIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
    <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
  </svg>
)
const Replay10Icon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
    <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
    <text x="12" y="14.5" fontSize="6.5" fontWeight="bold" textAnchor="middle" fill="currentColor" fontFamily="sans-serif">10</text>
  </svg>
)
const Forward10Icon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
    <path d="M12 5V1l5 5-5 5V7c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6h2c0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8z"/>
    <text x="12" y="14.5" fontSize="6.5" fontWeight="bold" textAnchor="middle" fill="currentColor" fontFamily="sans-serif">10</text>
  </svg>
)
const ShuffleIcon = ({ active }: { active: boolean }) => (
  <svg viewBox="0 0 24 24" fill={active ? '#1DB954' : 'currentColor'} width="18" height="18">
    <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/>
  </svg>
)
const RepeatIcon = ({ mode }: { mode: 'off' | 'all' | 'one' }) => {
  const color = mode !== 'off' ? '#1DB954' : 'currentColor'
  return (
    <svg viewBox="0 0 24 24" fill={color} width="18" height="18">
      {mode === 'one' ? (
        <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4zm-4-2V9h-1l-2 1v1h1.5v4H13z"/>
      ) : (
        <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/>
      )}
    </svg>
  )
}
const VolumeIcon = ({ muted, volume }: { muted: boolean; volume: number }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
    {muted || volume === 0 ? (
      <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
    ) : volume < 0.5 ? (
      <path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z"/>
    ) : (
      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
    )}
  </svg>
)
const QueueIcon = ({ active }: { active: boolean }) => (
  <svg viewBox="0 0 24 24" fill={active ? '#1DB954' : 'currentColor'} width="18" height="18">
    <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z"/>
  </svg>
)
const NowPlayingViewIcon = ({ active }: { active: boolean }) => (
  <svg viewBox="0 0 24 24" fill={active ? '#1DB954' : 'currentColor'} width="18" height="18">
    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H5V5h9v12zm5 0h-3V5h3v12z"/>
  </svg>
)
const ExpandIcon = ({ active }: { active: boolean }) => (
  <svg viewBox="0 0 24 24" fill={active ? '#1DB954' : 'currentColor'} width="18" height="18">
    <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
  </svg>
)
const MiniPlayerIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
    <path d="M19 11H5c-1.1 0-2 .9-2 2v6c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-6c0-1.1-.9-2-2-2zm0 8H5v-6h14v6zM3 5h18V3H3zM7 9h10V7H7z"/>
  </svg>
)

// ── Generic artwork placeholder ──────────────────────────────────
// (kept for clarity — ArtworkCell handles both cases now)

// ── Main now-playing bar ─────────────────────────────────────────
export function NowPlayingBar(): React.JSX.Element {
  const {
    currentTrack,
    isPlaying,
    volume,
    isMuted,
    seekPosition,
    duration,
    shuffle,
    repeat,
    showQueue,
    rightPanelTab,
    isExpandedNowPlaying,
    togglePlay,
    next,
    prev,
    setVolume,
    toggleMute,
    setSeek,
    toggleShuffle,
    cycleRepeat,
    toggleQueuePanel,
    toggleRightPanel,
    toggleExpandedNowPlaying,
  } = usePlayerStore()

  // ── Seek drag state ──────────────────────────────────────────
  // While the user is dragging the seek thumb, we show dragPos instead of
  // seekPosition (which the audio element keeps updating every 250ms).
  // Only on pointerUp do we commit the value to the store / audio element.
  const [isDragging, setIsDragging] = useState(false)
  const [dragPos, setDragPos] = useState(0)

  const handleSeekPointerDown = useCallback(() => {
    setDragPos(seekPosition)
    setIsDragging(true)
  }, [seekPosition])

  const handleSeekChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setDragPos(Number(e.target.value))
  }, [])

  const handleSeekPointerUp = useCallback((e: React.PointerEvent<HTMLInputElement>) => {
    const value = Number(e.currentTarget.value)
    setIsDragging(false)
    seekAudio(value)
  }, [])

  const handlePrev = useCallback(() => {
    if (seekPosition > 3) {
      seekAudio(0)
    } else {
      prev()
    }
  }, [seekPosition, prev])

  const skipBackward10 = useCallback(() => {
    seekAudio(Math.max(0, seekPosition - 10))
  }, [seekPosition])

  const skipForward10 = useCallback(() => {
    seekAudio(Math.min(duration, seekPosition + 10))
  }, [seekPosition, duration])

  const handleVolume = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(Number(e.target.value))
  }, [setVolume])

  // Display the drag position while dragging, otherwise the live audio position
  const displayPos = isDragging ? dragPos : seekPosition
  const progressPct = duration > 0 ? (displayPos / duration) * 100 : 0

  const [showPlaylistModal, setShowPlaylistModal] = useState(false)
  const addBtnRef = useRef<HTMLButtonElement>(null)
  const openContextMenu = useContextMenuStore((s) => s.openContextMenu)
  const [isLiked, setIsLiked] = useState(Boolean(currentTrack?.liked))

  useEffect(() => {
    setIsLiked(Boolean(currentTrack?.liked))
  }, [currentTrack?.id, currentTrack?.liked])

  const handleToggleLike = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!currentTrack?.id) return
    const newState = await window.lokal.db.toggleLike(currentTrack.id)
    setIsLiked(newState)
    currentTrack.liked = newState
    window.dispatchEvent(
      new CustomEvent('lokal:toast', {
        detail: newState ? 'Added to Liked Songs' : 'Removed from Liked Songs',
      })
    )
    window.dispatchEvent(new CustomEvent('lokal:playlist-updated', { detail: 1 }))
  }

  return (
    <footer
      id="now-playing-bar"
      className="flex items-center h-[90px] px-4 bg-[#181818] border-t border-[#282828] flex-shrink-0 gap-4 select-none"
    >
      {/* ── Track info ── */}
      <div
        onContextMenu={(e) => currentTrack && openContextMenu(e, currentTrack)}
        className="flex items-center gap-3 w-[290px] min-w-0"
      >
        <div
          onClick={() => toggleRightPanel('nowPlaying')}
          className="cursor-pointer group/art relative flex-shrink-0"
          title="Open Now Playing view"
        >
          <ArtworkCell
            artworkPath={currentTrack?.artworkPath}
            seed={currentTrack?.title ?? 'lokal'}
            className="w-14 h-14 rounded-md shadow-lg text-xl"
          />
          <div className="absolute inset-0 bg-black/40 rounded-md opacity-0 group-hover/art:opacity-100 flex items-center justify-center transition-opacity text-white">
            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
              <path d="M12 8l-6 6 1.41 1.41L12 10.83l4.59 4.58L18 14z" />
            </svg>
          </div>
        </div>
        {currentTrack ? (
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white truncate">{currentTrack.title}</p>
            <p className="text-xs text-[#b3b3b3] truncate">{currentTrack.artist}</p>
          </div>
        ) : (
          <p className="text-sm text-[#535353]">Nothing playing</p>
        )}

        {currentTrack && (
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Heart / Like button */}
            <button
              id="btn-nowplaying-like"
              onClick={handleToggleLike}
              className={`p-1.5 rounded-full transition-transform hover:scale-110 active:scale-95 ${
                isLiked ? 'text-accent' : 'text-[#b3b3b3] hover:text-white'
              }`}
              title={isLiked ? 'Remove from Liked Songs' : 'Save to Liked Songs'}
            >
              <svg viewBox="0 0 24 24" fill={isLiked ? '#1DB954' : 'currentColor'} width="18" height="18">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
            </button>

            {/* Add to playlist button (Spotify-style plus/check circle) */}
            <button
              ref={addBtnRef}
              id="btn-nowplaying-add-playlist"
              onClick={() => setShowPlaylistModal(!showPlaylistModal)}
              className="p-1.5 rounded-full text-[#b3b3b3] hover:text-white hover:bg-white/10 transition-transform hover:scale-110 active:scale-95"
              title="Add to playlist"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v8M8 12h8" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {currentTrack && (
        <AddToPlaylistModal
          track={currentTrack}
          isOpen={showPlaylistModal}
          onClose={() => setShowPlaylistModal(false)}
          anchorRef={addBtnRef}
        />
      )}

      {/* ── Playback controls + seek bar ── */}
      <div className="flex flex-col items-center gap-2 flex-1 max-w-[600px] mx-auto">
        {/* Control buttons */}
        <div className="flex items-center gap-4">
          <button id="btn-shuffle" onClick={toggleShuffle}
            className={`transition-colors ${shuffle ? 'text-accent' : 'text-[#b3b3b3] hover:text-white'}`}
            title="Shuffle">
            <ShuffleIcon active={shuffle} />
          </button>
          <button id="btn-prev" onClick={handlePrev}
            className="text-[#b3b3b3] hover:text-white transition-colors" title="Previous">
            <PrevIcon />
          </button>
          <button id="btn-skip-back-10" onClick={skipBackward10}
            className="text-[#b3b3b3] hover:text-white hover:scale-110 active:scale-95 transition-all p-0.5"
            title="Rewind 10 seconds">
            <Replay10Icon />
          </button>
          <button id="btn-play-pause" onClick={togglePlay}
            className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-black hover:scale-105 active:scale-95 transition-transform"
            title={isPlaying ? 'Pause' : 'Play'}>
            {isPlaying ? <PauseIcon /> : <PlayIcon />}
          </button>
          <button id="btn-skip-forward-10" onClick={skipForward10}
            className="text-[#b3b3b3] hover:text-white hover:scale-110 active:scale-95 transition-all p-0.5"
            title="Skip 10 seconds forward">
            <Forward10Icon />
          </button>
          <button id="btn-next" onClick={next}
            className="text-[#b3b3b3] hover:text-white transition-colors" title="Next">
            <NextIcon />
          </button>
          <button id="btn-repeat" onClick={cycleRepeat}
            className={`transition-colors ${repeat !== 'off' ? 'text-accent' : 'text-[#b3b3b3] hover:text-white'}`}
            title="Repeat">
            <RepeatIcon mode={repeat} />
          </button>
        </div>

        {/* Seek bar */}
        <div className="flex items-center gap-2 w-full">
          <span className="text-xs text-[#b3b3b3] tabular-nums w-10 text-right">
            {formatTime(displayPos)}
          </span>
          <div className="relative flex-1 h-3 group cursor-pointer flex items-center">
            {/* Track background */}
            <div className="w-full h-1 bg-[#535353] rounded-full relative overflow-visible pointer-events-none">
              {/* Filled portion — follows drag in real time */}
              <div
                className="absolute inset-y-0 left-0 bg-white group-hover:bg-[#1DB954] rounded-full transition-colors"
                style={{ width: `${progressPct}%` }}
              />
              {/* Scrub thumb dot */}
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 bg-white rounded-full shadow-md transition-opacity pointer-events-none"
                style={{
                  left: `${progressPct}%`,
                  opacity: isDragging ? 1 : undefined,
                  display: isDragging ? 'block' : undefined
                }}
              />
            </div>
            {/* Range input */}
            <input
              id="seek-bar"
              type="range"
              min={0}
              max={duration || 1}
              step={0.1}
              value={displayPos}
              onPointerDown={(e) => {
                try { e.currentTarget.setPointerCapture(e.pointerId) } catch {}
                handleSeekPointerDown()
              }}
              onChange={handleSeekChange}
              onPointerUp={(e) => {
                try { e.currentTarget.releasePointerCapture(e.pointerId) } catch {}
                handleSeekPointerUp(e)
              }}
              onKeyUp={(e) => {
                if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                  seekAudio(Number(e.currentTarget.value))
                }
              }}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
          <span className="text-xs text-[#b3b3b3] tabular-nums w-10">
            {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* ── Volume + Queue + Now Playing + Expand + Mini Player ── */}
      <div className="flex items-center gap-3 w-[260px] justify-end">
        {/* Now playing panel toggle */}
        <button
          id="btn-nowplaying-view"
          onClick={() => toggleRightPanel('nowPlaying')}
          className={`transition-colors ${showQueue && rightPanelTab === 'nowPlaying' ? 'text-accent' : 'text-[#b3b3b3] hover:text-white'}`}
          title="Now playing view"
        >
          <NowPlayingViewIcon active={showQueue && rightPanelTab === 'nowPlaying'} />
        </button>

        {/* Queue toggle */}
        <button
          id="btn-queue"
          onClick={() => toggleRightPanel('queue')}
          className={`transition-colors ${showQueue && rightPanelTab === 'queue' ? 'text-accent' : 'text-[#b3b3b3] hover:text-white'}`}
          title="Queue"
        >
          <QueueIcon active={showQueue && rightPanelTab === 'queue'} />
        </button>

        {/* Mini player */}
        <button
          id="btn-miniplayer"
          onClick={() => window.lokal.miniplayer.open()}
          className="text-[#b3b3b3] hover:text-white transition-colors"
          title="Open mini player"
        >
          <MiniPlayerIcon />
        </button>

        {/* Full screen / Expand */}
        <button
          id="btn-expand-nowplaying"
          onClick={toggleExpandedNowPlaying}
          className={`transition-colors ${isExpandedNowPlaying ? 'text-accent' : 'text-[#b3b3b3] hover:text-white'}`}
          title={isExpandedNowPlaying ? 'Exit full screen (Esc)' : 'Full screen (F11)'}
        >
          <ExpandIcon active={isExpandedNowPlaying} />
        </button>

        {/* Mute */}
        <button id="btn-mute" onClick={toggleMute}
          className="text-[#b3b3b3] hover:text-white transition-colors"
          title={isMuted ? 'Unmute' : 'Mute'}>
          <VolumeIcon muted={isMuted} volume={volume} />
        </button>

        {/* Volume slider */}
        <div className="relative flex-1 h-1 group max-w-[80px]">
          <div className="absolute inset-0 bg-[#535353] rounded-full" />
          <div
            className="absolute inset-y-0 left-0 bg-white group-hover:bg-accent rounded-full transition-colors pointer-events-none"
            style={{ width: `${(isMuted ? 0 : volume) * 100}%` }}
          />
          <input
            id="volume-bar"
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={isMuted ? 0 : volume}
            onChange={handleVolume}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>
      </div>
    </footer>
  )
}

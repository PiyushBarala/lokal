import React, { useEffect, useRef, useState } from 'react'
import { usePlayerStore } from '../stores/playerStore'
import { useContextMenuStore } from '../stores/contextMenuStore'
import { AddToPlaylistModal } from './AddToPlaylistModal'
import type { Track } from '../types'

function formatTime(s: number): string {
  if (!isFinite(s) || s <= 0) return ''
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

function TrackArt({ artworkPath }: { artworkPath: string | null }) {
  if (!artworkPath) {
    return (
      <div className="w-10 h-10 rounded bg-[#282828] flex items-center justify-center flex-shrink-0">
        <svg viewBox="0 0 24 24" fill="#535353" width="16" height="16">
          <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
        </svg>
      </div>
    )
  }
  return (
    <img
      src={'lokal://media/' + artworkPath.replace(/\\/g, '/')}
      alt=""
      className="w-10 h-10 rounded object-cover flex-shrink-0"
      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
    />
  )
}

function QueueRow({
  track,
  index,
  isActive,
  onRemove,
  onPlay,
  onDragStart,
  onDragOver,
  onDrop,
}: {
  track: Track
  index: number
  isActive: boolean
  onRemove: () => void
  onPlay: () => void
  onDragStart: (i: number) => void
  onDragOver: (e: React.DragEvent, i: number) => void
  onDrop: (i: number) => void
}) {
  const openContextMenu = useContextMenuStore((s) => s.openContextMenu)

  return (
    <div
      draggable
      onDragStart={() => onDragStart(index)}
      onDragOver={(e) => { e.preventDefault(); onDragOver(e, index) }}
      onDrop={() => onDrop(index)}
      onContextMenu={(e) => openContextMenu(e, track)}
      className={`group flex items-center gap-3 p-2 rounded-md transition-colors cursor-pointer select-none ${
        isActive ? 'bg-[#282828] text-accent' : 'hover:bg-[#1a1a1a] text-white'
      }`}
      onClick={onPlay}
    >
      <div className="w-5 text-center text-xs text-[#888] group-hover:hidden">
        {isActive ? '▶' : index + 1}
      </div>
      <div className="w-5 text-center text-xs text-white hidden group-hover:block">
        ▶
      </div>

      <TrackArt artworkPath={track.artworkPath} />

      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${isActive ? 'text-accent' : 'text-white'}`}>
          {track.title}
        </p>
        <p className="text-xs text-[#888] truncate">{track.artist}</p>
      </div>

      <span className="text-xs text-[#888] tabular-nums flex-shrink-0">
        {formatTime(track.duration)}
      </span>

      <button
        onClick={(e) => {
          e.stopPropagation()
          onRemove()
        }}
        className="opacity-0 group-hover:opacity-100 text-[#888] hover:text-white transition-opacity p-1 rounded hover:bg-white/10"
        title="Remove from queue"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
        </svg>
      </button>
    </div>
  )
}

export function QueuePanel(): React.JSX.Element {
  const {
    queue,
    queueIndex,
    currentTrack,
    toggleQueuePanel,
    removeFromQueue,
    reorderQueue,
    clearQueue,
    playTrack,
    rightPanelTab,
    setRightPanelTab,
    toggleExpandedNowPlaying,
  } = usePlayerStore()

  const openContextMenu = useContextMenuStore((s) => s.openContextMenu)
  const [recentTracks, setRecentTracks] = useState<Track[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const dragFromRef = useRef<number>(-1)

  useEffect(() => {
    if (rightPanelTab === 'recent') {
      window.lokal.db.getRecentlyPlayed(30).then(setRecentTracks).catch(() => {})
    }
  }, [rightPanelTab, currentTrack?.id])

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

  const nextTracks = queue.slice(queueIndex + 1)
  const nextOffset = queueIndex + 1

  return (
    <aside className="w-[320px] lg:w-[360px] flex-shrink-0 bg-[#121212] rounded-lg border border-white/5 flex flex-col overflow-hidden select-none animate-fade-in">
      {/* ── Tabs header with Now playing, Queue, Recent and Expand button ── */}
      <div className="flex items-center justify-between px-3 pt-3 pb-2 border-b border-white/5 flex-shrink-0">
        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setRightPanelTab('nowPlaying')}
            className={`text-xs font-bold pb-1.5 transition-all border-b-2 whitespace-nowrap ${
              rightPanelTab === 'nowPlaying'
                ? 'text-white border-accent'
                : 'text-[#b3b3b3] hover:text-white border-transparent'
            }`}
          >
            Now playing
          </button>
          <button
            onClick={() => setRightPanelTab('queue')}
            className={`text-xs font-bold pb-1.5 transition-all border-b-2 whitespace-nowrap ${
              rightPanelTab === 'queue'
                ? 'text-white border-accent'
                : 'text-[#b3b3b3] hover:text-white border-transparent'
            }`}
          >
            Queue
          </button>
          <button
            onClick={() => setRightPanelTab('recent')}
            className={`text-xs font-bold pb-1.5 transition-all border-b-2 whitespace-nowrap ${
              rightPanelTab === 'recent'
                ? 'text-white border-accent'
                : 'text-[#b3b3b3] hover:text-white border-transparent'
            }`}
          >
            Recent
          </button>
        </div>

        {/* Action icons: Expand & Close */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={toggleExpandedNowPlaying}
            className="text-[#b3b3b3] hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
            title="Expand view (F11)"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
              <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
            </svg>
          </button>

          <button
            onClick={toggleQueuePanel}
            className="text-[#b3b3b3] hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
            title="Close panel"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>
      </div>

      {/* ── Scrollable Body ── */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {/* ── TAB 1: Now Playing (Spotify Right Panel - Screenshot 1) ── */}
        {rightPanelTab === 'nowPlaying' && (
          <div className="flex flex-col animate-fade-in">
            {currentTrack ? (
              <>
                {/* Header Context Title */}
                <p className="text-xs font-bold text-white/70 uppercase tracking-wider mb-2.5 truncate">
                  {currentTrack.album || `${currentTrack.artist} Popular`}
                </p>

                {/* Big Cover Art with Hover Expand Button */}
                <div className="relative group rounded-xl overflow-hidden shadow-2xl aspect-square w-full bg-[#181818] mb-3.5 border border-white/5">
                  {currentTrack.artworkPath ? (
                    <img
                      src={'lokal://media/' + currentTrack.artworkPath.replace(/\\/g, '/')}
                      alt={currentTrack.title}
                      className="w-full h-full object-cover select-none"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#535353]">
                      <svg viewBox="0 0 24 24" fill="currentColor" width="64" height="64">
                        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                      </svg>
                    </div>
                  )}

                  {/* Hover Expand overlay button */}
                  <button
                    onClick={toggleExpandedNowPlaying}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:scale-110 shadow-lg backdrop-blur-sm"
                    title="Expand view"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14">
                      <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                    </svg>
                  </button>
                </div>

                {/* Song Title, Artist & Action Buttons */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="min-w-0 flex-1">
                    <h2
                      className="text-lg font-bold text-white tracking-tight truncate hover:underline cursor-pointer"
                      title={currentTrack.title}
                    >
                      {currentTrack.title}
                    </h2>
                    <p className="text-sm text-[#b3b3b3] truncate hover:text-white hover:underline cursor-pointer mt-0.5">
                      {currentTrack.artist}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0 pt-0.5">
                    <button
                      onClick={handleLike}
                      className={`p-1.5 rounded-full hover:bg-white/10 transition-transform active:scale-125 ${
                        currentTrack.liked ? 'text-accent' : 'text-[#b3b3b3] hover:text-white'
                      }`}
                      title={currentTrack.liked ? 'Remove from Liked' : 'Save to Liked'}
                    >
                      <svg viewBox="0 0 24 24" fill={currentTrack.liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" width="18" height="18">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                      </svg>
                    </button>
                    <button
                      onClick={() => setShowAddModal(true)}
                      className="p-1.5 rounded-full hover:bg-white/10 text-[#b3b3b3] hover:text-white transition-colors"
                      title="Add to playlist"
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                        <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Next in Queue Preview Card */}
                {nextTracks.length > 0 && (
                  <div className="bg-[#181818] rounded-xl p-3 border border-white/5 mt-1">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-white">Next in queue</span>
                      <button
                        onClick={() => setRightPanelTab('queue')}
                        className="text-[11px] font-bold text-[#b3b3b3] hover:text-white hover:underline"
                      >
                        Open queue
                      </button>
                    </div>
                    <div
                      onClick={() => playTrack(nextTracks[0], queue)}
                      className="flex items-center gap-3 p-1.5 rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
                    >
                      <TrackArt artworkPath={nextTracks[0].artworkPath} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-white truncate">{nextTracks[0].title}</p>
                        <p className="text-xs text-[#b3b3b3] truncate">{nextTracks[0].artist}</p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-center text-[#535353]">
                <p className="text-sm">Nothing playing right now</p>
              </div>
            )}
          </div>
        )}

        {/* ── TAB 2: Queue ── */}
        {rightPanelTab === 'queue' && (
          <>
            {currentTrack && (
              <section>
                <div className="flex items-center justify-between mb-2 px-1">
                  <h3 className="text-xs font-bold text-[#b3b3b3] uppercase tracking-wider">
                    Now playing
                  </h3>
                </div>

                <div
                  onContextMenu={(e) => openContextMenu(e, currentTrack)}
                  className="flex items-center gap-3 p-2.5 bg-[#181818] hover:bg-[#282828] rounded-md transition-colors cursor-pointer group"
                >
                  <TrackArt artworkPath={currentTrack.artworkPath} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-accent truncate">
                      {currentTrack.title}
                    </p>
                    <p className="text-xs text-[#b3b3b3] truncate">{currentTrack.artist}</p>
                  </div>
                  {currentTrack.liked && (
                    <span className="text-accent text-sm" title="Liked">
                      ♥
                    </span>
                  )}
                </div>
              </section>
            )}

            <section className="flex flex-col gap-1">
              <div className="flex items-center justify-between mb-2 px-1">
                <h3 className="text-xs font-bold text-[#b3b3b3] uppercase tracking-wider">
                  Next up ({nextTracks.length})
                </h3>
                {nextTracks.length > 0 && (
                  <button
                    onClick={clearQueue}
                    className="text-xs text-[#b3b3b3] hover:text-white transition-colors"
                  >
                    Clear queue
                  </button>
                )}
              </div>

              {nextTracks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center text-[#535353]">
                  <p className="text-xs">Queue is empty</p>
                </div>
              ) : (
                nextTracks.map((track, i) => (
                  <QueueRow
                    key={`${track.filePath}-${nextOffset + i}`}
                    track={track}
                    index={nextOffset + i}
                    isActive={false}
                    onPlay={() => playTrack(track, queue)}
                    onRemove={() => removeFromQueue(nextOffset + i)}
                    onDragStart={(from) => { dragFromRef.current = from }}
                    onDragOver={() => {}}
                    onDrop={(to) => {
                      if (dragFromRef.current >= 0 && dragFromRef.current !== to) {
                        reorderQueue(dragFromRef.current, to)
                        dragFromRef.current = -1
                      }
                    }}
                  />
                ))
              )}
            </section>
          </>
        )}

        {/* ── TAB 3: Recently Played ── */}
        {rightPanelTab === 'recent' && (
          <section className="flex flex-col gap-1">
            <h3 className="text-xs font-bold text-[#b3b3b3] uppercase tracking-wider mb-2 px-1">
              Recently played
            </h3>
            {recentTracks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center text-[#535353]">
                <p className="text-xs">No recent playback history</p>
              </div>
            ) : (
              recentTracks.map((track) => (
                <div
                  key={track.filePath}
                  onClick={() => playTrack(track, recentTracks)}
                  onContextMenu={(e) => openContextMenu(e, track)}
                  className="flex items-center gap-3 p-2 rounded-md hover:bg-[#1a1a1a] transition-colors cursor-pointer group"
                >
                  <TrackArt artworkPath={track.artworkPath} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{track.title}</p>
                    <p className="text-xs text-[#888] truncate">{track.artist}</p>
                  </div>
                  <span className="text-xs text-[#888] tabular-nums flex-shrink-0">
                    {formatTime(track.duration)}
                  </span>
                </div>
              ))
            )}
          </section>
        )}
      </div>

      {showAddModal && currentTrack && (
        <AddToPlaylistModal
          track={currentTrack}
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </aside>
  )
}

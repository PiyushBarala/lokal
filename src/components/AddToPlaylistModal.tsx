import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLibraryStore } from '../stores/libraryStore'
import { usePlayerStore } from '../stores/playerStore'
import type { Track, Playlist } from '../types'

interface AddToPlaylistModalProps {
  track: Track
  isOpen: boolean
  onClose: () => void
  anchorRef?: React.RefObject<HTMLElement>
}

export function AddToPlaylistModal({
  track,
  isOpen,
  onClose,
  anchorRef,
}: AddToPlaylistModalProps): React.JSX.Element | null {
  const { playlists, refreshPlaylists, tracks } = useLibraryStore()
  const { currentTrack } = usePlayerStore()
  const [filterQuery, setFilterQuery] = useState('')
  const [inPlaylistIds, setInPlaylistIds] = useState<number[]>([])
  const [isLiked, setIsLiked] = useState<boolean>(Boolean(track.liked))
  const [creatingNew, setCreatingNew] = useState(false)
  const [newPlaylistName, setNewPlaylistName] = useState('')
  const modalRef = useRef<HTMLDivElement>(null)
  const newNameInputRef = useRef<HTMLInputElement>(null)

  // Load which playlists contain this track
  const loadTrackPlaylists = async () => {
    let trackId = track.id
    if (!trackId) {
      try {
        const all = await window.lokal.db.getTracks()
        const match = all.find((t) => t.filePath === track.filePath)
        if (match?.id) trackId = match.id
      } catch {}
    }
    if (trackId) {
      try {
        const ids = await window.lokal.db.getTrackPlaylists(trackId)
        setInPlaylistIds(ids)
        setIsLiked(ids.includes(1) || Boolean(track.liked))
      } catch (err) {
        console.error('[AddToPlaylistModal] Error loading playlist IDs:', err)
      }
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadTrackPlaylists()
    }
  }, [isOpen, track.id, track.filePath])

  // Click outside to close
  useEffect(() => {
    const handleDown = (e: MouseEvent) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(e.target as Node) &&
        !anchorRef?.current?.contains(e.target as Node)
      ) {
        onClose()
      }
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      window.addEventListener('mousedown', handleDown)
      window.addEventListener('keydown', handleKey)
    }
    return () => {
      window.removeEventListener('mousedown', handleDown)
      window.removeEventListener('keydown', handleKey)
    }
  }, [isOpen, onClose, anchorRef])

  if (!isOpen) return null

  const handleToggleLike = async () => {
    if (!track.id) return
    const newState = await window.lokal.db.toggleLike(track.id)
    setIsLiked(newState)
    track.liked = newState
    if (currentTrack && currentTrack.id === track.id) {
      currentTrack.liked = newState
    }
    window.dispatchEvent(
      new CustomEvent('lokal:toast', {
        detail: newState ? `Added to Liked Songs` : `Removed from Liked Songs`,
      })
    )
    window.dispatchEvent(new CustomEvent('lokal:playlist-updated', { detail: 1 }))
    await loadTrackPlaylists()
  }

  const handleTogglePlaylist = async (pl: Playlist) => {
    let trackId = track.id
    if (!trackId) {
      try {
        const all = await window.lokal.db.getTracks()
        const match = all.find((t) => t.filePath === track.filePath)
        if (match?.id) trackId = match.id
      } catch {}
    }
    if (!trackId || pl.id == null) return

    const alreadyIn = inPlaylistIds.includes(pl.id)
    try {
      if (alreadyIn) {
        await window.lokal.db.removeTrackFromPlaylist(pl.id, trackId)
        setInPlaylistIds((prev) => prev.filter((id) => id !== pl.id))
        window.dispatchEvent(
          new CustomEvent('lokal:toast', {
            detail: `Removed from ${pl.name}`,
          })
        )
      } else {
        await window.lokal.db.addTrackToPlaylist(pl.id, trackId)
        setInPlaylistIds((prev) => [...prev, pl.id!])
        window.dispatchEvent(
          new CustomEvent('lokal:toast', {
            detail: `Added to ${pl.name}`,
          })
        )
      }
      window.dispatchEvent(new CustomEvent('lokal:playlist-updated', { detail: pl.id }))
    } catch (err) {
      console.error('[AddToPlaylistModal] Toggle error:', err)
    }
  }

  const handleCreateNew = async () => {
    const trimmed = newPlaylistName.trim()
    if (!trimmed) {
      setCreatingNew(false)
      return
    }
    try {
      const pl = await window.lokal.db.createPlaylist(trimmed)
      if (pl?.id && track.id) {
        await window.lokal.db.addTrackToPlaylist(pl.id, track.id)
        setInPlaylistIds((prev) => [...prev, pl.id!])
        window.dispatchEvent(
          new CustomEvent('lokal:toast', {
            detail: `Created ${pl.name} & added "${track.title}"`,
          })
        )
      }
      await refreshPlaylists()
      setNewPlaylistName('')
      setCreatingNew(false)
    } catch (err) {
      console.error('[AddToPlaylistModal] Create error:', err)
    }
  }

  const userPlaylists = playlists.filter((p) => p.id !== 1)
  const q = filterQuery.toLowerCase().trim()
  const filteredUserPlaylists = userPlaylists.filter((p) =>
    !q || p.name.toLowerCase().includes(q)
  )

  return createPortal(
    <div
      ref={modalRef}
      className="fixed bottom-[96px] left-6 z-50 w-[300px] bg-[#282828] text-white rounded-xl shadow-2xl p-4 border border-white/10 flex flex-col gap-3.5 animate-fade-in select-none"
    >
      {/* ── Title ── */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-white">Add to playlist</h3>
        <button
          onClick={onClose}
          className="text-[#b3b3b3] hover:text-white p-1 rounded-full hover:bg-white/10 text-xs"
        >
          ✕
        </button>
      </div>

      {/* ── Search Input ── */}
      <div className="flex items-center gap-2 bg-[#3e3e3e] rounded-md px-3 py-1.5 text-xs text-white">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" className="text-[#b3b3b3]">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          type="text"
          value={filterQuery}
          onChange={(e) => setFilterQuery(e.target.value)}
          placeholder="Find a playlist"
          className="bg-transparent text-xs text-white placeholder:text-[#b3b3b3] outline-none flex-1 min-w-0"
        />
        {filterQuery && (
          <button onClick={() => setFilterQuery('')} className="text-[#b3b3b3] hover:text-white">
            ✕
          </button>
        )}
      </div>

      {/* ── New Playlist Button / Inline Creator ── */}
      {creatingNew ? (
        <div className="flex items-center gap-2 bg-[#333] p-2 rounded-md border border-accent/40">
          <input
            ref={newNameInputRef}
            autoFocus
            type="text"
            value={newPlaylistName}
            onChange={(e) => setNewPlaylistName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateNew()
              if (e.key === 'Escape') setCreatingNew(false)
            }}
            placeholder="Playlist name"
            className="flex-1 bg-transparent text-xs text-white placeholder:text-[#b3b3b3] outline-none"
          />
          <button
            onClick={handleCreateNew}
            className="text-xs font-semibold px-2 py-0.5 rounded bg-accent text-black hover:scale-105"
          >
            Create
          </button>
        </div>
      ) : (
        <button
          onClick={() => {
            setCreatingNew(true)
            setTimeout(() => newNameInputRef.current?.focus(), 50)
          }}
          className="flex items-center gap-3 text-sm font-semibold text-white hover:text-accent transition-colors py-1 px-1 rounded"
        >
          <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-sm">
            +
          </span>
          <span>New playlist</span>
        </button>
      )}

      {/* ── Saved in (Liked Songs) ── */}
      <div className="flex flex-col gap-1">
        <p className="text-[11px] font-semibold text-[#b3b3b3] uppercase tracking-wider px-1">
          Saved in
        </p>
        <div
          onClick={handleToggleLike}
          className="flex items-center justify-between p-2 rounded-lg hover:bg-[#333] cursor-pointer transition-colors group"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded bg-gradient-to-br from-[#450af5] to-[#8e8ee5] flex items-center justify-center flex-shrink-0 shadow">
              <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">Liked Songs</p>
              <p className="text-xs text-[#b3b3b3]">{tracks.filter((t) => t.liked).length} songs</p>
            </div>
          </div>

          {/* Checked indicator */}
          <div
            className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
              isLiked
                ? 'bg-accent border-accent text-black font-bold text-xs'
                : 'border-[#666] group-hover:border-white'
            }`}
          >
            {isLiked && '✓'}
          </div>
        </div>
      </div>

      {/* ── Recently updated playlists ── */}
      <div className="flex flex-col gap-1 max-h-[190px] overflow-y-auto pr-1">
        <p className="text-[11px] font-semibold text-[#b3b3b3] uppercase tracking-wider px-1">
          Recently updated
        </p>

        {filteredUserPlaylists.length === 0 ? (
          <p className="text-xs text-[#666] py-3 text-center">No other playlists</p>
        ) : (
          filteredUserPlaylists.map((pl) => {
            const isChecked = inPlaylistIds.includes(pl.id!)
            return (
              <div
                key={pl.id}
                onClick={() => handleTogglePlaylist(pl)}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-[#333] cursor-pointer transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {pl.artworkPath ? (
                    <img
                      src={'lokal://media/' + pl.artworkPath.replace(/\\/g, '/')}
                      alt=""
                      className="w-10 h-10 rounded object-cover flex-shrink-0 shadow"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded bg-[#3a3a3a] flex items-center justify-center flex-shrink-0 text-[#b3b3b3]">
                      <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                        <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z"/>
                      </svg>
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate max-w-[150px]">{pl.name}</p>
                    <p className="text-xs text-[#b3b3b3]">Playlist</p>
                  </div>
                </div>

                {/* Checked indicator */}
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                    isChecked
                      ? 'bg-accent border-accent text-black font-bold text-xs'
                      : 'border-[#666] group-hover:border-white'
                  }`}
                >
                  {isChecked && '✓'}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* ── Done / Close ── */}
      <div className="pt-2 border-t border-white/10 flex justify-end">
        <button
          onClick={onClose}
          className="px-4 py-1.5 rounded-full bg-white hover:bg-[#e0e0e0] text-black font-bold text-xs transition-all hover:scale-105"
        >
          Done
        </button>
      </div>
    </div>,
    document.body
  )
}

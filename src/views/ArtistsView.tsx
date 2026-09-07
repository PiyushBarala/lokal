import React, { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useLibraryStore } from '../stores/libraryStore'
import { usePlayerStore } from '../stores/playerStore'
import { useContextMenuStore } from '../stores/contextMenuStore'
import type { Artist, Track } from '../types'

function ArtistCard({ artist, onClick }: { artist: Artist; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-3 p-4 rounded-lg bg-[#181818] hover:bg-[#282828] transition-colors text-center group"
    >
      <div className="w-28 h-28 rounded-full bg-gradient-to-br from-[#282828] to-[#404040] flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow text-white font-bold text-3xl">
        {artist.name[0]?.toUpperCase() ?? 'A'}
      </div>
      <div>
        <p className="text-sm font-semibold text-white truncate max-w-[140px]">{artist.name}</p>
        <p className="text-xs text-[#b3b3b3]">{artist.trackCount} songs</p>
      </div>
    </button>
  )
}

function ArtistDetail({ artist, onBack }: { artist: Artist; onBack: () => void }) {
  const [tracks, setTracks] = useState<Track[]>([])
  const { playTrack, currentTrack, isPlaying, togglePlay } = usePlayerStore()
  const openContextMenu = useContextMenuStore((s) => s.openContextMenu)

  useEffect(() => {
    if (artist.id) {
      window.lokal.db.getArtistTracks(artist.id).then(setTracks).catch(() => {})
    } else if (artist.name) {
      window.lokal.db.getTracks().then((all) => {
        const matching = all.filter((t) => t.artist.toLowerCase() === artist.name.toLowerCase())
        setTracks(matching)
      }).catch(() => {})
    }
  }, [artist.id, artist.name])

  return (
    <div className="flex flex-col h-full overflow-hidden select-none">
      <div className="flex items-end gap-6 p-8 bg-gradient-to-b from-[#2d2d2d] to-[#121212] relative flex-shrink-0">
        <button
          onClick={onBack}
          className="absolute top-6 left-6 text-[#b3b3b3] hover:text-white text-sm font-semibold flex items-center gap-1.5 transition-colors"
        >
          <span>←</span>
          <span>Back</span>
        </button>
        <div className="w-36 h-36 rounded-full bg-gradient-to-br from-[#404040] to-[#282828] flex items-center justify-center shadow-2xl flex-shrink-0 text-white font-bold text-5xl">
          {artist.name[0]?.toUpperCase() ?? 'A'}
        </div>
        <div>
          <p className="text-xs text-[#b3b3b3] uppercase tracking-widest mb-1">Artist</p>
          <h1 className="text-3xl font-bold text-white mb-2">{artist.name}</h1>
          <p className="text-sm text-[#b3b3b3]">{tracks.length || artist.trackCount} songs</p>
          <button
            onClick={() => tracks[0] && playTrack(tracks[0], tracks)}
            className="mt-4 px-6 py-2.5 rounded-full bg-accent text-black font-semibold text-sm hover:bg-accent-hover transition-transform hover:scale-105"
          >
            ▶ Play All
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-8">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-[#121212] z-10">
            <tr className="text-[#b3b3b3] text-left border-b border-[#282828]">
              <th className="px-4 py-3 w-10 font-normal">#</th>
              <th className="px-4 py-3 font-normal">Title</th>
              <th className="px-4 py-3 font-normal">Album</th>
              <th className="px-4 py-3 font-normal text-right">Duration</th>
            </tr>
          </thead>
          <tbody>
            {tracks.map((track, i) => {
              const isActive = currentTrack?.filePath === track.filePath
              const m = Math.floor(track.duration / 60)
              const s = Math.floor(track.duration % 60)
              return (
                <tr
                  key={track.filePath}
                  onClick={() => (isActive ? togglePlay() : playTrack(track, tracks))}
                  onContextMenu={(e) => openContextMenu(e, track)}
                  className={`cursor-pointer border-b border-[#282828]/50 hover:bg-[#282828] transition-colors ${
                    isActive ? 'text-accent' : 'text-white'
                  }`}
                >
                  <td className="px-4 py-2.5 text-[#b3b3b3]">{isActive && isPlaying ? '▶' : i + 1}</td>
                  <td className="px-4 py-2.5 truncate max-w-[240px] font-medium">{track.title}</td>
                  <td className="px-4 py-2.5 text-[#b3b3b3] truncate max-w-[180px]">{track.album}</td>
                  <td className="px-4 py-2.5 text-[#b3b3b3] text-right tabular-nums">
                    {m}:{s.toString().padStart(2, '0')}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function ArtistsView(): React.JSX.Element {
  const { artists, tracks } = useLibraryStore()
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const [selected, setSelected] = useState<Artist | null>(null)

  const resolvedArtist = useMemo(() => {
    if (!id) return selected
    const decoded = decodeURIComponent(id).toLowerCase()
    const found = artists.find((a) => String(a.id) === id || a.name.toLowerCase() === decoded)
    if (found) return found

    const matchingTracks = tracks.filter((t) => t.artist.toLowerCase() === decoded)
    if (matchingTracks.length > 0) {
      return {
        name: matchingTracks[0].artist,
        trackCount: matchingTracks.length,
      }
    }
    return { name: decodeURIComponent(id), trackCount: 0 }
  }, [id, selected, artists, tracks])

  if (resolvedArtist) {
    return (
      <ArtistDetail
        artist={resolvedArtist}
        onBack={() => {
          setSelected(null)
          navigate('/artists')
        }}
      />
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden select-none">
      <div className="px-8 pt-8 pb-4">
        <h1 className="text-2xl font-bold text-white mb-1">Artists</h1>
        <p className="text-sm text-[#b3b3b3]">{artists.length} artists</p>
      </div>
      {artists.length === 0 ? (
        <div className="flex items-center justify-center flex-1 text-[#535353] text-sm">
          No artists yet.
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-8 pb-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {artists.map((a) => (
              <ArtistCard
                key={a.id ?? a.name}
                artist={a}
                onClick={() => navigate(`/artist/${encodeURIComponent(a.name)}`)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

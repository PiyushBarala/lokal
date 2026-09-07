import React, { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useLibraryStore } from '../stores/libraryStore'
import { usePlayerStore } from '../stores/playerStore'
import { useContextMenuStore } from '../stores/contextMenuStore'
import { ArtworkCell } from '../components/ArtworkCell'
import type { Album, Track } from '../types'

function AlbumCard({ album, onClick }: { album: Album; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col gap-2 p-3 rounded-lg bg-[#181818] hover:bg-[#282828] transition-all duration-200 text-left group"
    >
      <div className="aspect-square w-full rounded-md overflow-hidden shadow-lg group-hover:scale-105 transition-transform duration-300">
        <ArtworkCell
          artworkPath={album.artworkPath}
          seed={album.name}
          className="w-full h-full text-4xl rounded-md"
        />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-white truncate">{album.name}</p>
        <p className="text-xs text-[#b3b3b3] truncate">{album.albumArtist} · {album.year ?? 'Unknown'}</p>
      </div>
    </button>
  )
}

function AlbumDetail({ album, onBack }: { album: Album; onBack: () => void }) {
  const [tracks, setTracks] = useState<Track[]>([])
  const { playTrack, currentTrack, isPlaying, togglePlay } = usePlayerStore()
  const openContextMenu = useContextMenuStore((s) => s.openContextMenu)

  useEffect(() => {
    if (album.id) {
      window.lokal.db.getAlbumTracks(album.id).then(setTracks)
    }
  }, [album.id])

  const totalDuration = tracks.reduce((sum, t) => sum + t.duration, 0)
  const mins = Math.floor(totalDuration / 60)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Album header */}
      <div className="flex items-end gap-6 p-8 bg-gradient-to-b from-[#3d3d3d] to-[#121212]">
        <button onClick={onBack} className="absolute top-6 left-6 text-[#b3b3b3] hover:text-white text-sm">← Back</button>
        <div className="w-44 h-44 rounded-lg overflow-hidden shadow-2xl flex-shrink-0 bg-[#282828]">
          {album.artworkPath ? (
            <img
              src={'lokal://media/' + album.artworkPath.replace(/\\/g, '/')}
              alt={album.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="#535353" width="60" height="60">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14.5c-2.49 0-4.5-2.01-4.5-4.5S9.51 7.5 12 7.5s4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5zm0-5.5c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z"/>
              </svg>
            </div>
          )}
        </div>
        <div>
          <p className="text-xs text-[#b3b3b3] uppercase tracking-widest mb-1">Album</p>
          <h1 className="text-3xl font-bold text-white mb-2">{album.name}</h1>
          <p className="text-sm text-[#b3b3b3]">
            {album.albumArtist} · {album.year ?? ''} · {tracks.length} songs, {mins} min
          </p>
          <button
            onClick={() => tracks[0] && playTrack(tracks[0], tracks)}
            className="mt-4 px-6 py-2.5 rounded-full bg-accent text-black font-semibold text-sm hover:bg-accent-hover transition-colors"
          >
            ▶ Play
          </button>
        </div>
      </div>

      {/* Track list */}
      <div className="flex-1 overflow-y-auto px-4 pb-8">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-[#121212]">
            <tr className="text-[#b3b3b3] text-left border-b border-[#282828]">
              <th className="px-4 py-3 w-10 font-normal">#</th>
              <th className="px-4 py-3 font-normal">Title</th>
              <th className="px-4 py-3 font-normal text-right">Duration</th>
            </tr>
          </thead>
          <tbody>
            {tracks.map((track) => {
              const isActive = currentTrack?.filePath === track.filePath
              const m = Math.floor(track.duration / 60)
              const s = Math.floor(track.duration % 60)
              return (
                <tr
                  key={track.filePath}
                  onClick={() => isActive ? togglePlay() : playTrack(track, tracks)}
                  onContextMenu={(e) => openContextMenu(e, track)}
                  className={`cursor-pointer border-b border-[#282828]/50 hover:bg-[#282828] transition-colors ${isActive ? 'text-accent' : 'text-white'}`}
                >
                  <td className="px-4 py-2.5 text-[#b3b3b3]">
                    {isActive && isPlaying ? '▶' : (track.trackNumber ?? '–')}
                  </td>
                  <td className="px-4 py-2.5 truncate max-w-xs">{track.title}</td>
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

export function AlbumsView(): React.JSX.Element {
  const { albums } = useLibraryStore()
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const [selected, setSelected] = useState<Album | null>(null)

  const resolvedAlbum = useMemo(() => {
    if (!id) return selected
    const decoded = decodeURIComponent(id).toLowerCase()
    return albums.find((a) => String(a.id) === id || a.name.toLowerCase() === decoded) || null
  }, [id, selected, albums])

  if (resolvedAlbum) {
    return (
      <AlbumDetail
        album={resolvedAlbum}
        onBack={() => {
          setSelected(null)
          navigate('/albums')
        }}
      />
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden select-none">
      <div className="px-8 pt-8 pb-4">
        <h1 className="text-2xl font-bold text-white mb-1">Albums</h1>
        <p className="text-sm text-[#b3b3b3]">{albums.length} albums</p>
      </div>
      {albums.length === 0 ? (
        <div className="flex items-center justify-center flex-1 text-[#535353] text-sm">
          No albums yet.
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-8 pb-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {albums.map((a) => (
              <AlbumCard
                key={a.id}
                album={a}
                onClick={() => navigate(`/album/${a.id}`)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

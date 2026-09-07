import React, { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import type { Track } from '../types'
import { usePlayerStore } from '../stores/playerStore'
import { useContextMenuStore } from '../stores/contextMenuStore'
import { ArtworkCell } from '../components/ArtworkCell'

function formatDuration(s: number): string {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export function SearchView(): React.JSX.Element {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const query = searchParams.get('q') || ''
  
  const [results, setResults] = useState<Track[]>([])
  const [loading, setLoading] = useState(false)
  const { playTrack, currentTrack, isPlaying, togglePlay } = usePlayerStore()
  const openContextMenu = useContextMenuStore((s) => s.openContextMenu)

  // Focus the top navigation search bar on view mount if query is empty
  useEffect(() => {
    const input = document.getElementById('top-search-input') as HTMLInputElement | null
    if (input) {
      input.focus()
      if (query) input.select()
    }
  }, [])

  // Live search whenever query changes
  useEffect(() => {
    const trimmed = query.trim()
    if (!trimmed) {
      setResults([])
      setLoading(false)
      return
    }

    let isMounted = true
    setLoading(true)

    const timer = setTimeout(async () => {
      try {
        const res = await window.lokal.db.searchTracks(trimmed)
        if (isMounted) {
          setResults(res)
        }
      } catch (err) {
        console.error('Search error:', err)
        if (isMounted) setResults([])
      } finally {
        if (isMounted) setLoading(false)
      }
    }, 120)

    return () => {
      isMounted = false
      clearTimeout(timer)
    }
  }, [query])

  const handleRowClick = (track: Track) => {
    if (currentTrack?.filePath === track.filePath) {
      togglePlay()
    } else {
      playTrack(track, results)
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden select-none">
      {/* Search Header / Title */}
      <div className="px-8 pt-6 pb-4 flex-shrink-0">
        <h1 className="text-2xl font-bold text-white tracking-tight">
          {query.trim() ? `Search results for "${query.trim()}"` : 'Browse all'}
        </h1>
        {query.trim() && !loading && (
          <p className="text-xs text-[#b3b3b3] mt-1">
            {results.length} {results.length === 1 ? 'song' : 'songs'} found
          </p>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-8 pb-10">
        {/* State 1: No Query -> Spotify "Browse all" category cards */}
        {!query.trim() && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 pt-2">
            <div
              onClick={() => navigate('/liked')}
              className="group relative h-44 rounded-xl p-4 cursor-pointer overflow-hidden bg-gradient-to-br from-[#450af5] to-[#8e8ee5] hover:scale-[1.02] active:scale-[0.99] transition-all shadow-lg"
            >
              <span className="text-xl font-bold text-white block">Liked Songs</span>
              <div className="absolute -bottom-2 -right-2 w-20 h-20 text-white/30 rotate-[25deg] group-hover:rotate-[20deg] group-hover:scale-110 transition-transform">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
              </div>
            </div>

            <div
              onClick={() => navigate('/songs')}
              className="group relative h-44 rounded-xl p-4 cursor-pointer overflow-hidden bg-gradient-to-br from-[#1e3264] to-[#1DB954] hover:scale-[1.02] active:scale-[0.99] transition-all shadow-lg"
            >
              <span className="text-xl font-bold text-white block">All Songs</span>
              <div className="absolute -bottom-2 -right-2 w-20 h-20 text-white/30 rotate-[25deg] group-hover:rotate-[20deg] group-hover:scale-110 transition-transform">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
                  <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                </svg>
              </div>
            </div>

            <div
              onClick={() => navigate('/artists')}
              className="group relative h-44 rounded-xl p-4 cursor-pointer overflow-hidden bg-gradient-to-br from-[#ba5d07] to-[#e8115b] hover:scale-[1.02] active:scale-[0.99] transition-all shadow-lg"
            >
              <span className="text-xl font-bold text-white block">Artists</span>
              <div className="absolute -bottom-2 -right-2 w-20 h-20 text-white/30 rotate-[25deg] group-hover:rotate-[20deg] group-hover:scale-110 transition-transform">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
              </div>
            </div>

            <div
              onClick={() => navigate('/albums')}
              className="group relative h-44 rounded-xl p-4 cursor-pointer overflow-hidden bg-gradient-to-br from-[#503750] to-[#8c1932] hover:scale-[1.02] active:scale-[0.99] transition-all shadow-lg"
            >
              <span className="text-xl font-bold text-white block">Albums</span>
              <div className="absolute -bottom-2 -right-2 w-20 h-20 text-white/30 rotate-[25deg] group-hover:rotate-[20deg] group-hover:scale-110 transition-transform">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14.5c-2.49 0-4.5-2.01-4.5-4.5S9.51 7.5 12 7.5s4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5zm0-5.5c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z"/>
                </svg>
              </div>
            </div>

            <div
              onClick={() => navigate('/library')}
              className="group relative h-44 rounded-xl p-4 cursor-pointer overflow-hidden bg-gradient-to-br from-[#006450] to-[#148a08] hover:scale-[1.02] active:scale-[0.99] transition-all shadow-lg"
            >
              <span className="text-xl font-bold text-white block">Playlists</span>
              <div className="absolute -bottom-2 -right-2 w-20 h-20 text-white/30 rotate-[25deg] group-hover:rotate-[20deg] group-hover:scale-110 transition-transform">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
                  <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z"/>
                </svg>
              </div>
            </div>
          </div>
        )}

        {/* State 2: Searching */}
        {query.trim() && loading && (
          <div className="flex flex-col items-center justify-center h-48 text-[#b3b3b3] text-sm gap-3">
            <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            <span>Searching for "{query.trim()}"…</span>
          </div>
        )}

        {/* State 3: No Results */}
        {query.trim() && !loading && results.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="48" height="48" className="text-[#535353] mb-4">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
            <h3 className="text-lg font-bold text-white mb-1">No results found for "{query.trim()}"</h3>
            <p className="text-sm text-[#b3b3b3] max-w-sm">
              Please check your spelling, or try searching for another artist, track, or album.
            </p>
          </div>
        )}

        {/* State 4: Results Table */}
        {query.trim() && !loading && results.length > 0 && (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-[#121212] z-10 border-b border-[#282828] text-xs uppercase text-[#b3b3b3]">
              <tr>
                <th className="px-4 py-3 text-left w-10 font-normal">#</th>
                <th className="px-4 py-3 text-left font-normal">Title</th>
                <th className="px-4 py-3 text-left font-normal">Album</th>
                <th className="px-4 py-3 text-right font-normal w-24">Duration</th>
              </tr>
            </thead>
            <tbody>
              {results.map((track, i) => {
                const isActive = currentTrack?.filePath === track.filePath
                return (
                  <tr
                    key={track.filePath}
                    onClick={() => handleRowClick(track)}
                    onContextMenu={(e) => openContextMenu(e, track)}
                    className={`group cursor-pointer border-b border-[#282828]/40 hover:bg-[#282828] transition-colors ${
                      isActive ? 'text-accent' : 'text-white'
                    }`}
                  >
                    <td className="px-4 py-2.5 text-[#b3b3b3] w-10 tabular-nums">
                      {isActive && isPlaying ? (
                        <span className="text-accent text-xs">▶</span>
                      ) : (
                        <span className="group-hover:hidden">{i + 1}</span>
                      )}
                      {!(isActive && isPlaying) && (
                        <span className="hidden group-hover:inline text-white text-xs">▶</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-3">
                        <ArtworkCell
                          artworkPath={track.artworkPath}
                          seed={track.title}
                          className="w-10 h-10 rounded text-sm flex-shrink-0"
                        />
                        <div className="min-w-0">
                          <p className={`font-medium truncate ${isActive ? 'text-accent' : 'text-white'}`}>
                            {track.title}
                          </p>
                          <p className="text-xs text-[#b3b3b3] truncate hover:underline hover:text-white"
                             onClick={(e) => {
                               e.stopPropagation()
                               navigate(`/artist/${encodeURIComponent(track.artist)}`)
                             }}
                          >
                            {track.artist}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td
                      className="px-4 py-2.5 text-[#b3b3b3] truncate max-w-[200px] hover:underline hover:text-white"
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(`/album/${encodeURIComponent(track.album)}`)
                      }}
                    >
                      {track.album}
                    </td>
                    <td className="px-4 py-2.5 text-[#b3b3b3] text-right tabular-nums">
                      {formatDuration(track.duration)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

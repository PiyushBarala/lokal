import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLibraryStore } from '../stores/libraryStore'
import { usePlayerStore } from '../stores/playerStore'
import { useContextMenuStore } from '../stores/contextMenuStore'
import { ArtworkCell, artGradient } from '../components/ArtworkCell'
import type { Track, Album } from '../types'

// ── Utilities ────────────────────────────────────────────────────
function getGreeting() {
  const h = new Date().getHours()
  if (h < 5)  return 'Good night'
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function getTimeGradient() {
  const h = new Date().getHours()
  if (h < 5)  return 'linear-gradient(180deg, #0f0f2e 0%, #121212 100%)'
  if (h < 12) return 'linear-gradient(180deg, #1a3a2e 0%, #121212 100%)'
  if (h < 17) return 'linear-gradient(180deg, #2e1a0f 0%, #121212 100%)'
  return 'linear-gradient(180deg, #1a0f2e 0%, #121212 100%)'
}

// ── Jump-back-in card (2-col grid) ───────────────────────────────
function JumpCard({ track, onPlay, isPlaying }: { track: Track; onPlay: () => void; isPlaying: boolean }) {
  const openContextMenu = useContextMenuStore((s) => s.openContextMenu)

  return (
    <button
      onClick={onPlay}
      onContextMenu={(e) => openContextMenu(e, track)}
      className="flex items-center gap-3 bg-[#ffffff0f] hover:bg-[#ffffff1a] rounded-md overflow-hidden text-left transition-all group w-full relative"
    >
      <ArtworkCell
        artworkPath={track.artworkPath}
        seed={track.title}
        className="w-14 h-14 flex-shrink-0"
      />
      <span className="text-sm font-semibold text-white truncate pr-10">{track.title}</span>
      {/* Floating play button */}
      <div className={`absolute right-3 w-9 h-9 rounded-full bg-accent flex items-center justify-center shadow-xl transition-all
        ${isPlaying ? 'opacity-100 scale-100' : 'opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 hover:scale-105'}`}>
        <svg viewBox="0 0 24 24" fill="black" width="18" height="18">
          {isPlaying
            ? <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
            : <path d="M8 5v14l11-7z"/>}
        </svg>
      </div>
    </button>
  )
}

// ── Horizontal track card ────────────────────────────────────────
function QuickPickCard({
  track,
  onPlay,
  isActive,
  badge,
}: {
  track: Track
  onPlay: () => void
  isActive: boolean
  badge?: string
}) {
  const openContextMenu = useContextMenuStore((s) => s.openContextMenu)

  return (
    <button
      onClick={onPlay}
      onContextMenu={(e) => openContextMenu(e, track)}
      className="flex-shrink-0 w-44 p-3 bg-[#181818] hover:bg-[#282828] rounded-md transition-all text-left group relative"
    >
      <div className="relative mb-3 aspect-square rounded-md overflow-hidden shadow-lg bg-[#282828]">
        <ArtworkCell
          artworkPath={track.artworkPath}
          seed={track.title}
          className="w-full h-full text-3xl"
        />
        {badge && (
          <span className="absolute top-2 left-2 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-black/75 backdrop-blur-md text-white/90 border border-white/10 shadow-sm pointer-events-none">
            {badge}
          </span>
        )}
        {/* Spotify circular green play button */}
        <div className={`absolute bottom-2 right-2 w-11 h-11 rounded-full bg-accent flex items-center justify-center shadow-2xl transition-all duration-300
          ${isActive ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 hover:scale-105 hover:bg-[#1ed760]'}`}>
          <svg viewBox="0 0 24 24" fill="black" width="20" height="20">
            {isActive
              ? <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
              : <path d="M8 5v14l11-7z"/>}
          </svg>
        </div>
      </div>
      <p className="text-sm font-bold text-white truncate">{track.title}</p>
      <p className="text-xs text-[#b3b3b3] truncate mt-1">{track.artist || 'Unknown Artist'}</p>
    </button>
  )
}

// ── Horizontal album card ────────────────────────────────────────
function HomeAlbumCard({
  album,
  onNavigate,
  onPlay,
}: {
  album: Album
  onNavigate: () => void
  onPlay: (e: React.MouseEvent) => void
}) {
  return (
    <button
      onClick={onNavigate}
      className="flex-shrink-0 w-44 p-3 bg-[#181818] hover:bg-[#282828] rounded-md transition-all text-left group relative"
    >
      <div className="relative mb-3 aspect-square rounded-md overflow-hidden shadow-lg bg-[#282828]">
        <ArtworkCell
          artworkPath={album.artworkPath}
          seed={album.name}
          className="w-full h-full text-3xl"
        />
        {/* Spotify circular green play button */}
        <div
          onClick={onPlay}
          title="Play album"
          className="absolute bottom-2 right-2 w-11 h-11 rounded-full bg-accent flex items-center justify-center shadow-2xl transition-all duration-300 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 hover:scale-105 hover:bg-[#1ed760]"
        >
          <svg viewBox="0 0 24 24" fill="black" width="20" height="20">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>
      <p className="text-sm font-bold text-white truncate">{album.name}</p>
      <p className="text-xs text-[#b3b3b3] truncate mt-1">
        {album.albumArtist || album.artist || 'Album'}
        {album.trackCount ? ` · ${album.trackCount} songs` : ''}
      </p>
    </button>
  )
}

// ── Artist chip ──────────────────────────────────────────────────
function ArtistChip({ name, count, onClick }: { name: string; count: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 bg-[#181818] hover:bg-[#282828] rounded-full pl-1 pr-4 py-1 transition-colors group flex-shrink-0"
    >
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white/70 flex-shrink-0"
        style={{ background: artGradient(name) }}
      >
        {name[0]?.toUpperCase() ?? '?'}
      </div>
      <div className="text-left min-w-0">
        <p className="text-sm font-medium text-white truncate max-w-[100px]">{name}</p>
        <p className="text-[10px] text-[#b3b3b3]">{count} song{count !== 1 ? 's' : ''}</p>
      </div>
    </button>
  )
}

// ── Main view ────────────────────────────────────────────────────
export function HomeView(): React.JSX.Element {
  const { tracks, albums, isScanning, scanFolder, isLoaded } = useLibraryStore()
  const { playTrack, currentTrack, isPlaying } = usePlayerStore()
  const navigate = useNavigate()

  const [recent, setRecent] = useState<Track[]>([])

  useEffect(() => {
    if (isLoaded) {
      window.lokal.db.getRecentlyPlayed(8).then(setRecent).catch(() => {})
    }
  }, [isLoaded, tracks.length])

  // Random "quick picks" — different every session
  const quickPicks = useMemo(() => {
    if (tracks.length === 0) return []
    const shuffled = [...tracks].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, 12)
  }, [tracks])

  // Artist summary
  const artistCounts = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of tracks) {
      if (t.artist && t.artist !== 'Unknown Artist') {
        map.set(t.artist, (map.get(t.artist) ?? 0) + 1)
      }
    }
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
  }, [tracks])

  // "On Repeat · Most Played" — tracks with highest playCount or liked tracks
  const onRepeat = useMemo(() => {
    if (tracks.length === 0) return []
    const playedOrLiked = tracks.filter((t) => (t.playCount && t.playCount > 0) || t.liked)
    if (playedOrLiked.length >= 2) {
      return [...playedOrLiked]
        .sort((a, b) => (b.playCount || 0) - (a.playCount || 0))
        .slice(0, 10)
    }
    return tracks.slice(0, 8)
  }, [tracks])

  // "Made For You · Daily Artist Mix" based on the user's top artist
  const topArtist = artistCounts[0]?.[0]
  const artistMix = useMemo(() => {
    if (!topArtist || tracks.length === 0) return []
    const primary = tracks.filter((t) => t.artist === topArtist)
    const secondary = tracks.filter((t) => t.artist !== topArtist)
    return [...primary, ...secondary.slice(0, 6)]
  }, [topArtist, tracks])

  // "Fresh In Your Library · Recently Added" — sorted by dateAdded or id descending
  const recentlyAdded = useMemo(() => {
    if (tracks.length === 0) return []
    return [...tracks]
      .sort((a, b) => {
        const timeA = a.dateAdded ? new Date(a.dateAdded).getTime() : (a.id || 0)
        const timeB = b.dateAdded ? new Date(b.dateAdded).getTime() : (b.id || 0)
        return timeB - timeA
      })
      .slice(0, 10)
  }, [tracks])

  // "Featured Albums"
  const popularAlbums = useMemo(() => {
    return albums
      .filter((a) => a.name && a.name !== 'Unknown Album')
      .slice(0, 10)
  }, [albums])

  const handleScan = async () => {
    const { setScanning, setScanFolder, loadLibrary } = useLibraryStore.getState()
    const folder = await window.lokal.library.pickFolder()
    if (!folder) return
    setScanFolder(folder)
    setScanning(true)
    window.lokal.library.onScanProgress(() => {})
    await window.lokal.library.scan(folder)
    setScanning(false)
    await loadLibrary()
  }

  const handlePlayAlbum = async (e: React.MouseEvent, album: Album) => {
    e.stopPropagation()
    if (album.id) {
      const albumTracks = await window.lokal.db.getAlbumTracks(album.id)
      if (albumTracks.length > 0) {
        playTrack(albumTracks[0], albumTracks)
      }
    }
  }

  const isEmpty = tracks.length === 0

  return (
    <div className="h-full overflow-y-auto">
      {/* ── Hero gradient header ──────────────────────────────── */}
      <div className="relative" style={{ background: getTimeGradient() }}>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#121212]" />
        <div className="relative px-8 pt-12 pb-10">
          <h1 className="text-3xl font-bold text-white mb-1">{getGreeting()}</h1>
          <p className="text-[#b3b3b3] text-sm mb-6">
            {isEmpty ? 'Add a music folder to get started' : `${tracks.length} songs · ready to play`}
          </p>

          {/* Stats row */}
          {!isEmpty && (
            <div className="flex gap-4 flex-wrap">
              {[
                { label: 'Songs', val: tracks.length },
                { label: 'Artists', val: artistCounts.length },
                { label: 'Albums', val: albums.length },
              ].map(({ label, val }) => (
                <div key={label} className="bg-white/10 backdrop-blur-sm rounded-xl px-5 py-3 flex flex-col items-center">
                  <span className="text-2xl font-bold text-white">{val}</span>
                  <span className="text-xs text-white/60 mt-0.5">{label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="px-8 pb-12 flex flex-col gap-10">
        {/* Add folder button */}
        <button
          id="btn-scan-library"
          onClick={handleScan}
          disabled={isScanning}
          className="self-start px-5 py-2.5 rounded-full bg-accent text-black text-sm font-semibold hover:bg-accent/90 transition-colors disabled:opacity-50 shadow-lg"
        >
          {isScanning ? `Scanning ${scanFolder ?? ''}…` : '+ Add Music Folder'}
        </button>

        {/* ── Jump back in ───────────────────────────────────── */}
        {recent.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-white mb-4">Jump back in</h2>
            <div className="grid grid-cols-2 gap-2">
              {recent.map((t) => (
                <JumpCard
                  key={t.id}
                  track={t}
                  onPlay={() => playTrack(t, tracks)}
                  isPlaying={currentTrack?.id === t.id && isPlaying}
                />
              ))}
            </div>
          </section>
        )}

        {/* ── Quick picks ────────────────────────────────────── */}
        {quickPicks.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-white">Quick picks</h2>
                <p className="text-xs text-[#b3b3b3] mt-0.5">Fresh recommendations from your library</p>
              </div>
              <button onClick={() => navigate('/songs')}
                className="text-xs text-[#b3b3b3] hover:text-white transition-colors font-semibold uppercase tracking-wider">
                Show all
              </button>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none">
              {quickPicks.map((t) => (
                <QuickPickCard
                  key={t.id}
                  track={t}
                  onPlay={() => playTrack(t, tracks)}
                  isActive={currentTrack?.id === t.id}
                />
              ))}
            </div>
          </section>
        )}

        {/* ── On Repeat · Most Played ────────────────────────── */}
        {onRepeat.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-white">On Repeat</h2>
                <p className="text-xs text-[#b3b3b3] mt-0.5">The songs you stream again and again</p>
              </div>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none">
              {onRepeat.map((t) => (
                <QuickPickCard
                  key={t.id}
                  track={t}
                  onPlay={() => playTrack(t, onRepeat)}
                  isActive={currentTrack?.id === t.id}
                  badge={t.playCount ? `🔥 ${t.playCount} plays` : (t.liked ? '❤️ Liked' : undefined)}
                />
              ))}
            </div>
          </section>
        )}

        {/* ── Made For You · Daily Artist Mix ────────────────── */}
        {topArtist && artistMix.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-accent">Made For You</span>
                <h2 className="text-xl font-bold text-white">{topArtist} Mix</h2>
                <p className="text-xs text-[#b3b3b3] mt-0.5">Featuring {topArtist} and similar tracks from your collection</p>
              </div>
              <button
                onClick={() => playTrack(artistMix[0], artistMix)}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-accent text-black text-xs font-bold hover:scale-105 transition-transform shadow-md"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                  <path d="M8 5v14l11-7z"/>
                </svg>
                Play Mix
              </button>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none">
              {artistMix.map((t) => (
                <QuickPickCard
                  key={t.id}
                  track={t}
                  onPlay={() => playTrack(t, artistMix)}
                  isActive={currentTrack?.id === t.id}
                  badge={t.artist === topArtist ? 'Artist Mix' : undefined}
                />
              ))}
            </div>
          </section>
        )}

        {/* ── Recently Added · Fresh In Library ──────────────── */}
        {recentlyAdded.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-white">Fresh In Library</h2>
                <p className="text-xs text-[#b3b3b3] mt-0.5">Recently added tracks to your local collection</p>
              </div>
              <button onClick={() => navigate('/songs')}
                className="text-xs text-[#b3b3b3] hover:text-white transition-colors font-semibold uppercase tracking-wider">
                View library
              </button>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none">
              {recentlyAdded.map((t) => (
                <QuickPickCard
                  key={t.id}
                  track={t}
                  onPlay={() => playTrack(t, recentlyAdded)}
                  isActive={currentTrack?.id === t.id}
                  badge="✨ Added"
                />
              ))}
            </div>
          </section>
        )}

        {/* ── Popular Albums ─────────────────────────────────── */}
        {popularAlbums.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-white">Featured Albums</h2>
                <p className="text-xs text-[#b3b3b3] mt-0.5">Explore full releases in your collection</p>
              </div>
              <button onClick={() => navigate('/albums')}
                className="text-xs text-[#b3b3b3] hover:text-white transition-colors font-semibold uppercase tracking-wider">
                Show all
              </button>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none">
              {popularAlbums.map((a) => (
                <HomeAlbumCard
                  key={a.id || a.name}
                  album={a}
                  onNavigate={() => navigate(`/album/${a.id ?? encodeURIComponent(a.name)}`)}
                  onPlay={(e) => handlePlayAlbum(e, a)}
                />
              ))}
            </div>
          </section>
        )}

        {/* ── Artists ────────────────────────────────────────── */}
        {artistCounts.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-white">Your artists</h2>
                <p className="text-xs text-[#b3b3b3] mt-0.5">Top artists across your library</p>
              </div>
              <button onClick={() => navigate('/artists')}
                className="text-xs text-[#b3b3b3] hover:text-white transition-colors font-semibold uppercase tracking-wider">
                Show all
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {artistCounts.map(([name, count]) => (
                <ArtistChip
                  key={name}
                  name={name}
                  count={count}
                  onClick={() => navigate(`/artist/${encodeURIComponent(name)}`)}
                />
              ))}
            </div>
          </section>
        )}

        {/* ── Empty state ─────────────────────────────────────── */}
        {isEmpty && (
          <div className="flex flex-col items-center justify-center py-16 gap-6 text-center">
            <div className="w-24 h-24 rounded-full bg-[#282828] flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="#535353" width="48" height="48">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
              </svg>
            </div>
            <div>
              <p className="text-white font-semibold text-xl">Your library is empty</p>
              <p className="text-[#b3b3b3] text-sm mt-2 max-w-[260px]">
                Click "Add Music Folder" to scan your local music and start listening.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

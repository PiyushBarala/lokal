import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePlayerStore } from '../stores/playerStore'
import { useLibraryStore } from '../stores/libraryStore'
import { seekAudio } from './AudioEngine'
import lokalLogo from '../../public/lokal.png'
import type { UpdateStatus } from '../types'

// ── Zoom management ───────────────────────────────────────────────
let currentZoom = 1.0

export function zoomIn(): void {
  currentZoom = Math.min(1.5, Math.round((currentZoom + 0.1) * 10) / 10)
  document.documentElement.style.zoom = String(currentZoom)
}

export function zoomOut(): void {
  currentZoom = Math.max(0.7, Math.round((currentZoom - 0.1) * 10) / 10)
  document.documentElement.style.zoom = String(currentZoom)
}

export function resetZoom(): void {
  currentZoom = 1.0
  document.documentElement.style.zoom = '1'
}

// ── About Modal ───────────────────────────────────────────────────
function AboutModal({ onClose }: { onClose: () => void }) {
  const [version, setVersion] = useState('1.1.1')
  const [status, setStatus] = useState<UpdateStatus | null>(null)
  const [isChecking, setIsChecking] = useState(false)

  useEffect(() => {
    window.lokal?.updater?.getVersion().then(setVersion).catch(() => {})
    window.lokal?.updater?.getLastStatus().then(setStatus).catch(() => {})

    const unsub = window.lokal?.updater?.onStatus((newStatus) => {
      setStatus(newStatus)
      if (newStatus.type !== 'checking') {
        setIsChecking(false)
      }
    })
    return unsub
  }, [])

  const handleCheckUpdates = async () => {
    setIsChecking(true)
    try {
      await window.lokal?.updater?.checkForUpdates()
    } catch {
      setIsChecking(false)
    }
  }

  const handleInstall = () => {
    window.lokal?.updater?.quitAndInstall()
  }

  return (
    <div
      className="fixed inset-0 z-[300] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#242424] border border-white/15 rounded-2xl p-6 w-full max-w-sm shadow-2xl flex flex-col items-center text-center relative animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#b3b3b3] hover:text-white transition-colors"
          title="Close"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
          </svg>
        </button>

        <img
          src={lokalLogo}
          alt="Lokal"
          className="w-20 h-20 rounded-2xl shadow-xl mb-4 border border-white/10 object-cover"
        />

        <h2 className="text-xl font-bold text-white tracking-tight">Lokal</h2>
        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-accent/20 text-accent mt-1 mb-3">
          v{version} (Windows x64)
        </span>

        <p className="text-sm text-[#b3b3b3] leading-relaxed mb-4">
          A local-first offline music player inspired by Spotify desktop, built for your personal music library with online discovery.
        </p>

        {/* ── Auto-Updater Section ── */}
        <div className="w-full bg-[#181818] rounded-xl p-3.5 mb-4 border border-white/10 flex flex-col items-center text-center">
          {status?.type === 'checking' || isChecking ? (
            <div className="flex items-center gap-2 text-xs text-[#b3b3b3] py-1">
              <div className="w-3.5 h-3.5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              <span>Checking for updates...</span>
            </div>
          ) : status?.type === 'downloading' ? (
            <div className="w-full space-y-1.5 py-0.5">
              <div className="flex justify-between text-xs text-[#b3b3b3]">
                <span>Downloading v{status.version}...</span>
                <span className="font-mono text-white">{status.percent ?? 0}%</span>
              </div>
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent transition-all duration-300 rounded-full"
                  style={{ width: `${status.percent ?? 0}%` }}
                />
              </div>
            </div>
          ) : status?.type === 'downloaded' ? (
            <div className="w-full flex flex-col items-center gap-2 py-0.5">
              <div className="flex items-center gap-1.5 text-xs text-accent font-semibold">
                <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
                <span>v{status.version} ready to install!</span>
              </div>
              <button
                onClick={handleInstall}
                className="w-full py-2 rounded-lg bg-accent text-black font-bold text-xs hover:bg-accent/90 transition-all shadow-md active:scale-95"
              >
                Restart & Install Now
              </button>
            </div>
          ) : status?.type === 'available' ? (
            <div className="flex items-center gap-2 text-xs text-white py-1">
              <div className="w-2 h-2 rounded-full bg-accent animate-ping" />
              <span>New version available (v{status.version}). Downloading...</span>
            </div>
          ) : status?.type === 'not-available' ? (
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-1.5 text-xs text-white/80">
                <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14" className="text-accent">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                </svg>
                <span>Up to date</span>
              </div>
              <button
                onClick={handleCheckUpdates}
                className="text-[11px] text-[#b3b3b3] hover:text-white underline transition-colors"
              >
                Check again
              </button>
            </div>
          ) : status?.type === 'error' ? (
            <div className="flex flex-col items-center gap-1 w-full">
              <span className="text-[11px] text-red-400">{status.message || 'Check failed'}</span>
              <button
                onClick={handleCheckUpdates}
                className="text-[11px] text-white/90 hover:text-white underline"
              >
                Retry
              </button>
            </div>
          ) : (
            <button
              onClick={handleCheckUpdates}
              className="w-full py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white font-medium text-xs transition-colors flex items-center justify-center gap-2"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13" className="text-[#b3b3b3]">
                <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z" />
              </svg>
              Check for Updates
            </button>
          )}
        </div>

        <div className="w-full bg-[#181818] rounded-xl p-3 text-xs text-[#888] space-y-1 text-left mb-5 border border-white/5">
          <div className="flex justify-between">
            <span>Platform</span>
            <span className="text-white font-medium">Windows</span>
          </div>
          <div className="flex justify-between">
            <span>Audio Engine</span>
            <span className="text-white font-medium">HTML5 + Native Media</span>
          </div>
          <div className="flex justify-between">
            <span>Library</span>
            <span className="text-white font-medium">SQLite Local Database</span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-full bg-white hover:bg-[#e6e6e6] text-black font-bold text-sm transition-transform active:scale-95"
        >
          Close
        </button>
      </div>
    </div>
  )
}

// ── Icons ─────────────────────────────────────────────────────────
const ChevronRight = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12" className="text-[#b3b3b3] ml-auto">
    <path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z" />
  </svg>
)

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14" className="text-accent">
    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
  </svg>
)

interface SettingsMenuProps {
  onPickFolder: () => void
}

type MenuCategory = 'file' | 'edit' | 'view' | 'playback' | 'help' | null

export function SettingsMenu({ onPickFolder }: SettingsMenuProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState<MenuCategory>(null)
  const [showAbout, setShowAbout] = useState(false)
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    window.lokal?.updater?.getLastStatus().then(setUpdateStatus).catch(() => {})
    const unsub = window.lokal?.updater?.onStatus((st) => {
      setUpdateStatus(st)
      if (st.type === 'downloaded') {
        window.dispatchEvent(
          new CustomEvent('lokal:toast', {
            detail: `✨ Lokal update ready! Open About to restart & install.`
          })
        )
      }
    })
    return unsub
  }, [])

  const {
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
    toggleQueuePanel,
  } = usePlayerStore()

  const { refreshPlaylists } = useLibraryStore()

  // Close menu on click outside
  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setActiveCategory(null)
      }
    }
    window.addEventListener('mousedown', handleClickOutside)
    return () => window.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const closeMenu = () => {
    setIsOpen(false)
    setActiveCategory(null)
  }

  const handleNewPlaylist = async () => {
    closeMenu()
    const name = `My Playlist #${Math.floor(Math.random() * 900 + 100)}`
    const created = await window.lokal.db.createPlaylist(name)
    await refreshPlaylists()
    if (created?.id) {
      navigate(`/playlist/${created.id}`)
    }
  }

  const handleSelectAll = () => {
    closeMenu()
    window.getSelection()?.selectAllChildren(document.body)
  }

  const handleSearchFocus = () => {
    closeMenu()
    navigate('/search')
    setTimeout(() => {
      const input = document.getElementById('top-search-input') as HTMLInputElement | null
      input?.focus()
      input?.select()
    }, 50)
  }

  return (
    <>
      <div className="relative" ref={menuRef}>
        {/* Three dots button */}
        <button
          onClick={() => {
            setIsOpen(!isOpen)
            setActiveCategory(null)
          }}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors shadow-sm ${isOpen
            ? 'bg-[#282828] text-white ring-1 ring-white/20'
            : 'bg-[#121212] hover:bg-[#1f1f1f] text-[#b3b3b3] hover:text-white'
            }`}
          title="Menu (Settings, File, Playback)"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
            <circle cx="5" cy="12" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="19" cy="12" r="2" />
          </svg>
        </button>

        {/* Root Menu Dropdown */}
        {isOpen && (
          <div className="absolute left-0 top-10 mt-1 z-50 min-w-[150px] bg-[#282828] text-[#e0e0e0] rounded-md shadow-2xl py-1 border border-[#3e3e3e] text-xs font-normal select-none">
            {/* 1. File */}
            <div
              className={`relative px-3 py-1.5 flex items-center justify-between cursor-pointer hover:bg-[#333333] hover:text-white ${activeCategory === 'file' ? 'bg-[#333333] text-white' : ''
                }`}
              onMouseEnter={() => setActiveCategory('file')}
            >
              <span>File</span>
              <ChevronRight />

              {/* Submenu: File */}
              {activeCategory === 'file' && (
                <div className="absolute left-full top-0 ml-1 min-w-[210px] bg-[#282828] rounded-md shadow-2xl py-1 border border-[#3e3e3e] text-xs">
                  <div
                    onClick={handleNewPlaylist}
                    className="px-3 py-1.5 flex items-center justify-between hover:bg-[#333333] hover:text-white cursor-pointer"
                  >
                    <span>New Playlist</span>
                    <span className="text-[#888] text-[11px] font-mono ml-4">Ctrl+N</span>
                  </div>
                  <div
                    onClick={() => {
                      closeMenu()
                      onPickFolder()
                    }}
                    className="px-3 py-1.5 flex items-center justify-between hover:bg-[#333333] hover:text-white cursor-pointer"
                  >
                    <span className="text-accent font-medium">Add Folder…</span>
                    <span className="text-[#888] text-[11px] font-mono ml-4">Ctrl+O</span>
                  </div>
                  <div className="border-t border-[#3e3e3e] my-1" />
                  <div
                    onClick={() => {
                      closeMenu()
                      window.lokal.window.close()
                    }}
                    className="px-3 py-1.5 flex items-center justify-between hover:bg-[#333333] hover:text-white cursor-pointer text-[#ff6b6b]"
                  >
                    <span>Exit</span>
                    <span className="text-[#888] text-[11px] font-mono ml-4">Ctrl+Shift+Q</span>
                  </div>
                </div>
              )}
            </div>

            {/* 2. Edit */}
            <div
              className={`relative px-3 py-1.5 flex items-center justify-between cursor-pointer hover:bg-[#333333] hover:text-white ${activeCategory === 'edit' ? 'bg-[#333333] text-white' : ''
                }`}
              onMouseEnter={() => setActiveCategory('edit')}
            >
              <span>Edit</span>
              <ChevronRight />

              {/* Submenu: Edit */}
              {activeCategory === 'edit' && (
                <div className="absolute left-full top-0 ml-1 min-w-[210px] bg-[#282828] rounded-md shadow-2xl py-1 border border-[#3e3e3e] text-xs">
                  <div
                    onClick={handleSelectAll}
                    className="px-3 py-1.5 flex items-center justify-between hover:bg-[#333333] hover:text-white cursor-pointer"
                  >
                    <span>Select All</span>
                    <span className="text-[#888] text-[11px] font-mono ml-4">Ctrl+A</span>
                  </div>
                  <div className="border-t border-[#3e3e3e] my-1" />
                  <div
                    onClick={handleSearchFocus}
                    className="px-3 py-1.5 flex items-center justify-between hover:bg-[#333333] hover:text-white cursor-pointer"
                  >
                    <span>Search</span>
                    <span className="text-[#888] text-[11px] font-mono ml-4">Ctrl+K</span>
                  </div>
                </div>
              )}
            </div>

            {/* 3. View */}
            <div
              className={`relative px-3 py-1.5 flex items-center justify-between cursor-pointer hover:bg-[#333333] hover:text-white ${activeCategory === 'view' ? 'bg-[#333333] text-white' : ''
                }`}
              onMouseEnter={() => setActiveCategory('view')}
            >
              <span>View</span>
              <ChevronRight />

              {/* Submenu: View */}
              {activeCategory === 'view' && (
                <div className="absolute left-full top-0 ml-1 min-w-[210px] bg-[#282828] rounded-md shadow-2xl py-1 border border-[#3e3e3e] text-xs">
                  <div
                    onClick={() => {
                      zoomIn()
                      closeMenu()
                    }}
                    className="px-3 py-1.5 flex items-center justify-between hover:bg-[#333333] hover:text-white cursor-pointer"
                  >
                    <span>Zoom In</span>
                    <span className="text-[#888] text-[11px] font-mono ml-4">Ctrl+=</span>
                  </div>
                  <div
                    onClick={() => {
                      zoomOut()
                      closeMenu()
                    }}
                    className="px-3 py-1.5 flex items-center justify-between hover:bg-[#333333] hover:text-white cursor-pointer"
                  >
                    <span>Zoom Out</span>
                    <span className="text-[#888] text-[11px] font-mono ml-4">Ctrl+-</span>
                  </div>
                  <div
                    onClick={() => {
                      resetZoom()
                      closeMenu()
                    }}
                    className="px-3 py-1.5 flex items-center justify-between hover:bg-[#333333] hover:text-white cursor-pointer"
                  >
                    <span>Reset Zoom</span>
                    <span className="text-[#888] text-[11px] font-mono ml-4">Ctrl+0</span>
                  </div>
                  <div className="border-t border-[#3e3e3e] my-1" />
                  <div
                    onClick={() => {
                      closeMenu()
                      toggleQueuePanel()
                    }}
                    className="px-3 py-1.5 flex items-center justify-between hover:bg-[#333333] hover:text-white cursor-pointer"
                  >
                    <span>Toggle Queue</span>
                    <span className="text-[#888] text-[11px] font-mono ml-4">Ctrl+Q</span>
                  </div>
                  <div
                    onClick={() => {
                      closeMenu()
                      window.lokal.miniplayer.open()
                    }}
                    className="px-3 py-1.5 flex items-center justify-between hover:bg-[#333333] hover:text-white cursor-pointer"
                  >
                    <span>Mini Player</span>
                  </div>
                </div>
              )}
            </div>

            {/* 4. Playback */}
            <div
              className={`relative px-3 py-1.5 flex items-center justify-between cursor-pointer hover:bg-[#333333] hover:text-white ${activeCategory === 'playback' ? 'bg-[#333333] text-white' : ''
                }`}
              onMouseEnter={() => setActiveCategory('playback')}
            >
              <span>Playback</span>
              <ChevronRight />

              {/* Submenu: Playback */}
              {activeCategory === 'playback' && (
                <div className="absolute left-full top-0 ml-1 min-w-[220px] bg-[#282828] rounded-md shadow-2xl py-1 border border-[#3e3e3e] text-xs">
                  <div
                    onClick={() => {
                      togglePlay()
                      closeMenu()
                    }}
                    className="px-3 py-1.5 flex items-center justify-between hover:bg-[#333333] hover:text-white cursor-pointer"
                  >
                    <span>{isPlaying ? 'Pause' : 'Play'}</span>
                    <span className="text-[#888] text-[11px] font-mono ml-4">Space</span>
                  </div>
                  <div
                    onClick={() => {
                      next()
                      closeMenu()
                    }}
                    className="px-3 py-1.5 flex items-center justify-between hover:bg-[#333333] hover:text-white cursor-pointer"
                  >
                    <span>Next</span>
                    <span className="text-[#888] text-[11px] font-mono ml-4">Shift+→</span>
                  </div>
                  <div
                    onClick={() => {
                      prev()
                      closeMenu()
                    }}
                    className="px-3 py-1.5 flex items-center justify-between hover:bg-[#333333] hover:text-white cursor-pointer"
                  >
                    <span>Previous</span>
                    <span className="text-[#888] text-[11px] font-mono ml-4">Shift+←</span>
                  </div>
                  <div className="border-t border-[#3e3e3e] my-1" />
                  <div
                    onClick={() => {
                      seekAudio(Math.min(seekPosition + 10, duration))
                      closeMenu()
                    }}
                    className="px-3 py-1.5 flex items-center justify-between hover:bg-[#333333] hover:text-white cursor-pointer"
                  >
                    <span>Seek Forward 10s</span>
                    <span className="text-[#888] text-[11px] font-mono ml-4">→</span>
                  </div>
                  <div
                    onClick={() => {
                      seekAudio(Math.max(seekPosition - 10, 0))
                      closeMenu()
                    }}
                    className="px-3 py-1.5 flex items-center justify-between hover:bg-[#333333] hover:text-white cursor-pointer"
                  >
                    <span>Seek Backward 10s</span>
                    <span className="text-[#888] text-[11px] font-mono ml-4">←</span>
                  </div>
                  <div className="border-t border-[#3e3e3e] my-1" />
                  <div
                    onClick={() => {
                      toggleShuffle()
                      closeMenu()
                    }}
                    className="px-3 py-1.5 flex items-center justify-between hover:bg-[#333333] hover:text-white cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-3.5 flex items-center justify-center">
                        {shuffle && <CheckIcon />}
                      </span>
                      <span>Shuffle</span>
                    </div>
                  </div>
                  <div
                    onClick={() => {
                      cycleRepeat()
                      closeMenu()
                    }}
                    className="px-3 py-1.5 flex items-center justify-between hover:bg-[#333333] hover:text-white cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-3.5 flex items-center justify-center">
                        {repeat !== 'off' && <CheckIcon />}
                      </span>
                      <span>Repeat ({repeat === 'one' ? 'One' : repeat === 'all' ? 'All' : 'Off'})</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 5. Help */}
            <div
              className={`relative px-3 py-1.5 flex items-center justify-between cursor-pointer hover:bg-[#333333] hover:text-white ${activeCategory === 'help' ? 'bg-[#333333] text-white' : ''
                }`}
              onMouseEnter={() => setActiveCategory('help')}
            >
              <div className="flex items-center gap-2">
                <span>Help</span>
                {(updateStatus?.type === 'available' || updateStatus?.type === 'downloaded') && (
                  <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                )}
              </div>
              <ChevronRight />

              {/* Submenu: Help */}
              {activeCategory === 'help' && (
                <div className="absolute left-full top-0 ml-1 min-w-[190px] bg-[#282828] rounded-md shadow-2xl py-1 border border-[#3e3e3e] text-xs">
                  <div
                    onClick={() => {
                      closeMenu()
                      setShowAbout(true)
                    }}
                    className="px-3 py-1.5 flex items-center justify-between hover:bg-[#333333] hover:text-white cursor-pointer"
                  >
                    <span>About Lokal</span>
                  </div>
                  <div
                    onClick={() => {
                      closeMenu()
                      setShowAbout(true)
                      window.lokal?.updater?.checkForUpdates().catch(() => {})
                    }}
                    className="px-3 py-1.5 flex items-center justify-between hover:bg-[#333333] hover:text-white cursor-pointer"
                  >
                    <span>Check for Updates...</span>
                    {updateStatus?.type === 'downloaded' && (
                      <span className="text-[10px] text-accent font-semibold px-1 py-0.5 bg-accent/15 rounded">
                        Ready
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}
    </>
  )
}

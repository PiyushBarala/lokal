import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePlayerStore } from '../stores/playerStore'
import { useLibraryStore } from '../stores/libraryStore'
import { seekAudio } from './AudioEngine'
import lokalLogo from '../../public/lokal.png'
import type { UpdateStatus } from '../types'
import { useAppSettings, ACCENT_COLORS } from '../contexts/AppSettingsContext'
import type { ArtworkShape, AccentColor } from '../contexts/AppSettingsContext'

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

function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

// ── About Modal ───────────────────────────────────────────────────
function AboutModal({ onClose }: { onClose: () => void }) {
  const [version, setVersion] = useState('...')
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

  const handleStartDownload = async () => {
    setStatus((prev) => ({
      type: 'downloading',
      currentVersion: version,
      version: prev?.version || 'latest',
      percent: 0,
      message: 'Starting download in background...',
    }))
    try {
      await window.lokal?.updater?.downloadUpdate()
    } catch (e) {
      console.error('Download error:', e)
    }
  }

  const handleSkipUpdate = async (ver?: string) => {
    try {
      await window.lokal?.updater?.skipUpdate(ver)
      setStatus({
        type: 'idle',
        currentVersion: version,
        message: 'Update skipped.',
      })
    } catch (e) {
      console.error('Skip error:', e)
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
            <div className="w-full space-y-2 py-1">
              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-1.5 text-white font-medium">
                  <div className="w-3 h-3 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                  <span>Downloading v{status.version || ''}...</span>
                </div>
                <span className="font-mono text-xs font-semibold text-accent">{status.percent ?? 0}%</span>
              </div>

              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent transition-all duration-300 rounded-full shadow-[0_0_8px_rgba(30,215,96,0.6)]"
                  style={{ width: `${Math.min(100, Math.max(0, status.percent ?? 0))}%` }}
                />
              </div>

              <div className="flex justify-between text-[11px] text-[#888] font-mono">
                <span>
                  {status.transferred && status.total
                    ? `${formatBytes(status.transferred)} / ${formatBytes(status.total)}`
                    : status.percent
                    ? `${status.percent}% completed`
                    : 'Downloading...'}
                </span>
                {status.bytesPerSecond ? <span>{formatBytes(status.bytesPerSecond)}/s</span> : null}
              </div>

              <p className="text-[10px] text-[#888] leading-tight text-center pt-0.5">
                Downloading in background. You can close this window and continue listening.
              </p>
            </div>
          ) : status?.type === 'downloaded' ? (
            <div className="w-full flex flex-col items-center gap-2.5 py-1">
              <div className="flex items-center gap-1.5 text-xs text-accent font-semibold">
                <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
                <span>v{status.version} downloaded & ready!</span>
              </div>
              <p className="text-[11px] text-[#b3b3b3]">
                Restart Lokal now to install the new update.
              </p>
              <button
                onClick={handleInstall}
                className="w-full py-2.5 rounded-lg bg-accent text-black font-bold text-xs hover:bg-accent/90 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-1.5"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                  <path d="M4 12l1.41 1.41L11 7.83V20h2V7.83l5.58 5.59L20 12l-8-8-8 8z" />
                </svg>
                <span>Restart & Install Now</span>
              </button>
            </div>
          ) : status?.type === 'available' ? (
            <div className="w-full flex flex-col items-center gap-2 py-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-accent">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
                </span>
                <span>New version available: v{status.version}</span>
              </div>
              <p className="text-[11px] text-[#b3b3b3] leading-normal">
                An update is ready for Lokal. Download it in the background or skip for now.
              </p>
              <div className="flex items-center gap-2 w-full mt-1">
                <button
                  onClick={() => handleSkipUpdate(status.version)}
                  className="flex-1 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white/90 hover:text-white font-medium text-xs transition-all active:scale-95"
                >
                  Skip
                </button>
                <button
                  onClick={handleStartDownload}
                  className="flex-1 py-2 rounded-lg bg-accent text-black font-bold text-xs hover:bg-accent/90 transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                    <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z" />
                  </svg>
                  <span>Download</span>
                </button>
              </div>
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
            <div className="flex flex-col items-center gap-1.5 w-full">
              <span className="text-[11px] text-red-400">{status.message || 'Check failed'}</span>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleCheckUpdates}
                  className="text-[11px] text-accent hover:underline font-medium"
                >
                  Retry Check
                </button>
              </div>
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

// ── Settings Modal (Customization) ────────────────────────────────
function SettingsModal({ onClose }: { onClose: () => void }) {
  const { settings, updateSetting } = useAppSettings()
  const [autoStart, setAutoStart] = useState<boolean>(settings.autoStartOnLogin)
  const [loadingAutoStart, setLoadingAutoStart] = useState(false)

  // Load real auto-start state from Electron on mount
  useEffect(() => {
    window.lokal?.settings?.get('ui.autoStartOnLogin').then((val: unknown) => {
      if (typeof val === 'boolean') setAutoStart(val)
    }).catch(() => {})
    // Also read from OS settings
    window.lokal?.window?.minimize?.() // dummy warmup
  }, [])

  const handleAutoStartToggle = async () => {
    setLoadingAutoStart(true)
    const next = !autoStart
    try {
      // Update Electron login item
      await (window.lokal as any)?.app?.setAutostart?.(next)
      // Persist preference to settings store
      updateSetting('autoStartOnLogin', next)
      setAutoStart(next)
    } catch {
      // Fallback: just save the preference
      updateSetting('autoStartOnLogin', next)
      setAutoStart(next)
    } finally {
      setLoadingAutoStart(false)
    }
  }

  const shapes: { id: ArtworkShape; label: string; preview: string }[] = [
    { id: 'square',  label: 'Square',  preview: 'rounded-none' },
    { id: 'rounded', label: 'Rounded', preview: 'rounded-lg' },
    { id: 'circle',  label: 'Circle',  preview: 'rounded-full' },
  ]

  return (
    <div
      className="fixed inset-0 z-[300] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#1a1a1a] border border-white/12 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16" className="text-accent">
                <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/>
              </svg>
            </div>
            <h2 className="text-base font-bold text-white">Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="text-[#b3b3b3] hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-6 max-h-[70vh] overflow-y-auto">

          {/* ── Artwork Shape ── */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#888] mb-3">Artwork Shape</p>
            <div className="grid grid-cols-3 gap-3">
              {shapes.map(({ id, label, preview }) => (
                <button
                  key={id}
                  onClick={() => updateSetting('artworkShape', id)}
                  className={`flex flex-col items-center gap-2.5 p-3 rounded-xl border-2 transition-all ${
                    settings.artworkShape === id
                      ? 'border-accent bg-accent/10'
                      : 'border-white/10 bg-white/5 hover:border-white/25 hover:bg-white/8'
                  }`}
                >
                  <div
                    className={`w-12 h-12 bg-gradient-to-br from-[#535353] to-[#282828] ${preview} ${
                      id === 'circle' && settings.artworkShape === 'circle' ? 'animate-spin-slow' : ''
                    }`}
                    style={{ background: 'linear-gradient(135deg, #535353, #282828)' }}
                  />
                  <span className={`text-xs font-semibold ${
                    settings.artworkShape === id ? 'text-accent' : 'text-[#b3b3b3]'
                  }`}>{label}</span>
                  {id === 'circle' && (
                    <span className="text-[10px] text-[#888] -mt-1.5">spins while playing</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* ── Accent Color ── */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#888] mb-3">Accent Color</p>
            <div className="flex gap-3 flex-wrap">
              {(Object.entries(ACCENT_COLORS) as [AccentColor, { hex: string; hover: string; label: string }][]).map(([id, def]) => (
                <button
                  key={id}
                  onClick={() => updateSetting('accentColor', id)}
                  title={def.label}
                  className={`w-9 h-9 rounded-full border-2 transition-all hover:scale-110 active:scale-95 ${
                    settings.accentColor === id
                      ? 'border-white scale-110 shadow-lg'
                      : 'border-transparent'
                  }`}
                  style={{ background: def.hex, boxShadow: settings.accentColor === id ? `0 0 12px ${def.hex}80` : undefined }}
                />
              ))}
            </div>
            <p className="text-xs text-[#535353] mt-2">
              Currently: <span className="text-[#b3b3b3] font-medium">{ACCENT_COLORS[settings.accentColor].label}</span>
            </p>
          </div>

          {/* ── Background Blur (Expanded View) ── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold uppercase tracking-widest text-[#888]">Expanded View Blur</p>
              <span className="text-xs font-mono text-accent font-semibold">{settings.expandedBlur}px</span>
            </div>
            <input
              type="range"
              min="0"
              max="24"
              step="2"
              value={settings.expandedBlur}
              onChange={(e) => updateSetting('expandedBlur', Number(e.target.value))}
              className="w-full h-1.5 rounded-full appearance-none bg-white/15 accent-[var(--accent)] cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-[#535353] mt-1">
              <span>None</span>
              <span>Max</span>
            </div>
          </div>

          {/* ── System ── */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#888] mb-3">System</p>
            <div className="flex items-center justify-between p-3.5 bg-white/5 rounded-xl border border-white/8">
              <div>
                <p className="text-sm font-semibold text-white">Launch at startup</p>
                <p className="text-xs text-[#888] mt-0.5">Open Lokal automatically when Windows starts</p>
              </div>
              <button
                onClick={handleAutoStartToggle}
                disabled={loadingAutoStart}
                className={`relative w-11 h-6 rounded-full transition-all flex-shrink-0 ml-4 ${
                  autoStart ? 'bg-accent' : 'bg-white/20'
                } ${loadingAutoStart ? 'opacity-50' : ''}`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-200 ${
                    autoStart ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/8">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-full bg-white hover:bg-[#e6e6e6] text-black font-bold text-sm transition-transform active:scale-95"
          >
            Done
          </button>
        </div>
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
  const [showSettings, setShowSettings] = useState(false)
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

    const onOpenAbout = () => setShowAbout(true)
    window.addEventListener('lokal:open-about', onOpenAbout)

    return () => {
      unsub?.()
      window.removeEventListener('lokal:open-about', onOpenAbout)
    }
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
          className={`relative w-8 h-8 rounded-full flex items-center justify-center transition-colors shadow-sm ${isOpen
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
          {updateStatus?.type === 'available' && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-accent animate-pulse" />
          )}
          {updateStatus?.type === 'downloading' && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-accent animate-ping" />
          )}
          {updateStatus?.type === 'downloaded' && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-accent shadow-[0_0_6px_rgba(30,215,96,0.8)]" />
          )}
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
                    {updateStatus?.type === 'downloaded' ? (
                      <span className="text-[10px] text-accent font-semibold px-1.5 py-0.5 bg-accent/20 rounded">
                        Ready
                      </span>
                    ) : updateStatus?.type === 'downloading' ? (
                      <span className="text-[10px] text-accent font-semibold px-1.5 py-0.5 bg-accent/20 rounded">
                        {updateStatus.percent ?? 0}%
                      </span>
                    ) : updateStatus?.type === 'available' ? (
                      <span className="text-[10px] text-accent font-semibold px-1.5 py-0.5 bg-accent/20 rounded">
                        New
                      </span>
                    ) : null}
                  </div>
                  <div className="border-t border-[#3e3e3e] my-1" />
                  <div
                    onClick={() => {
                      closeMenu()
                      setShowSettings(true)
                    }}
                    className="px-3 py-1.5 flex items-center gap-2 hover:bg-[#333333] hover:text-white cursor-pointer text-accent font-semibold"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13">
                      <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/>
                    </svg>
                    <span>Settings &amp; Customisation</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </>
  )
}

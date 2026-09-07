import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { useLibraryStore } from '../stores/libraryStore'
import { SettingsMenu } from './SettingsMenu'
import { WindowControls } from './WindowControls'

export function TopNav(): React.JSX.Element {
  const navigate = useNavigate()
  const location = useLocation()
  const { scanFolder, setScanning, setScanFolder, loadLibrary } = useLibraryStore()
  const [searchParams] = useSearchParams()
  const urlQuery = searchParams.get('q') || ''
  const [searchVal, setSearchVal] = useState(urlQuery)

  const isSearch = location.pathname === '/search'
  const isHome = location.pathname === '/'

  // Sync searchVal if URL query changes externally
  useEffect(() => {
    if (isSearch) {
      setSearchVal(urlQuery)
    } else {
      setSearchVal('')
    }
  }, [isSearch, urlQuery])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setSearchVal(val)
    if (val.trim()) {
      navigate(`/search?q=${encodeURIComponent(val)}`, { replace: isSearch })
    } else {
      navigate('/search', { replace: isSearch })
    }
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchVal.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchVal.trim())}`, { replace: isSearch })
    } else {
      navigate('/search', { replace: isSearch })
    }
  }

  const handleClear = () => {
    setSearchVal('')
    navigate('/search', { replace: isSearch })
    const input = document.getElementById('top-search-input') as HTMLInputElement | null
    input?.focus()
  }

  const handlePickFolder = async () => {
    const folder = await window.lokal.library.pickFolder()
    if (!folder) return
    setScanFolder(folder)
    setScanning(true)
    window.lokal.library.onScanProgress(() => {})
    await window.lokal.library.scan(folder)
    setScanning(false)
    await loadLibrary()
  }

  return (
    <header className="h-12 flex items-center justify-between px-3 flex-shrink-0 drag-region select-none bg-black">
      {/* Left: Settings Menu (Three dots) & Navigation history arrows */}
      <div className="flex items-center gap-2 no-drag">
        <SettingsMenu onPickFolder={handlePickFolder} />
        <button
          onClick={() => window.history.back()}
          className="w-8 h-8 rounded-full bg-[#121212] hover:bg-[#1f1f1f] text-white flex items-center justify-center transition-colors shadow-sm"
          title="Go back"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
            <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
          </svg>
        </button>
        <button
          onClick={() => window.history.forward()}
          className="w-8 h-8 rounded-full bg-[#121212] hover:bg-[#1f1f1f] text-[#b3b3b3] hover:text-white flex items-center justify-center transition-colors shadow-sm"
          title="Go forward"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
            <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
          </svg>
        </button>
      </div>

      {/* Center: Spotify-style Home & Search bar */}
      <div className="flex items-center gap-2 no-drag max-w-[520px] w-full justify-center">
        {/* Home pill button */}
        <button
          onClick={() => navigate('/')}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
            isHome
              ? 'bg-white text-black scale-105'
              : 'bg-[#1f1f1f] text-white hover:bg-[#282828] hover:scale-105'
          }`}
          title="Home"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
            <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
          </svg>
        </button>

        {/* Download pill button */}
        <button
          onClick={() => navigate('/download')}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
            location.pathname === '/download'
              ? 'bg-accent text-black scale-105 shadow-md shadow-accent/20'
              : 'bg-[#1f1f1f] text-white hover:bg-[#282828] hover:scale-105'
          }`}
          title="Search & Download Music"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" width="19" height="19">
            <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z" />
          </svg>
        </button>

        {/* Search input pill */}
        <form
          onSubmit={handleSearchSubmit}
          className={`flex items-center gap-2.5 bg-[#1f1f1f] hover:bg-[#282828] rounded-full px-3.5 py-2 flex-1 max-w-[420px] transition-all border ${
            isSearch ? 'border-white bg-[#282828]' : 'border-transparent'
          }`}
        >
          <button type="submit" className="text-[#b3b3b3] hover:text-white transition-colors">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
          </button>
          <input
            id="top-search-input"
            type="text"
            placeholder="What do you want to play?"
            value={searchVal}
            onChange={handleInputChange}
            onFocus={() => {
              if (!isSearch) navigate('/search')
            }}
            className="bg-transparent text-sm text-white placeholder:text-[#b3b3b3] outline-none flex-1 min-w-0"
          />
          {searchVal && (
            <button
              type="button"
              onClick={handleClear}
              className="text-[#b3b3b3] hover:text-white text-xs px-1"
              title="Clear search"
            >
              ✕
            </button>
          )}
        </form>
      </div>

      {/* Right: Window Controls (Minimize, Maximize, Close) */}
      <div className="flex items-center justify-end no-drag -mr-3">
        <WindowControls />
      </div>
    </header>
  )
}

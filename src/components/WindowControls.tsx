import React, { useState, useEffect } from 'react'

export function WindowControls({ className = '' }: { className?: string }): React.JSX.Element {
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    const refreshState = () => {
      if (window.lokal?.window?.isMaximized) {
        window.lokal.window.isMaximized().then(setIsMaximized).catch(() => {})
      }
    }

    refreshState()

    const unsubs: (() => void)[] = []

    if (window.lokal?.window?.onMaximizedChange) {
      unsubs.push(
        window.lokal.window.onMaximizedChange((max) => {
          setIsMaximized(max)
        })
      )
    }

    if (window.lokal?.window?.onFullScreenChange) {
      unsubs.push(
        window.lokal.window.onFullScreenChange(() => {
          refreshState()
        })
      )
    }

    return () => {
      unsubs.forEach((u) => u())
    }
  }, [])

  const handleMinimize = () => {
    window.lokal?.window?.minimize?.()
  }

  const handleMaximize = () => {
    window.lokal?.window?.maximize?.()
  }

  const handleClose = () => {
    window.lokal?.window?.close?.()
  }

  return (
    <div className={`flex items-center no-drag select-none ${className}`}>
      {/* Minimize */}
      <button
        onClick={handleMinimize}
        className="w-11 h-8 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        title="Minimize"
      >
        <svg viewBox="0 0 12 12" width="10" height="10" fill="currentColor">
          <rect y="5.5" width="11" height="1" rx="0.5" />
        </svg>
      </button>

      {/* Maximize / Restore */}
      <button
        onClick={handleMaximize}
        className="w-11 h-8 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        title={isMaximized ? 'Restore' : 'Maximize'}
      >
        {isMaximized ? (
          <svg viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="1">
            <path d="M3.5 1.5h6v6h-6z" />
            <path d="M1.5 3.5h6v6h-6z" />
          </svg>
        ) : (
          <svg viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="1">
            <rect x="1.5" y="1.5" width="9" height="9" />
          </svg>
        )}
      </button>

      {/* Close */}
      <button
        onClick={handleClose}
        className="w-11 h-8 flex items-center justify-center text-white/70 hover:text-white hover:bg-[#e81123] transition-colors cursor-pointer"
        title="Close"
      >
        <svg viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="1.2">
          <path d="M1.5 1.5l9 9M10.5 1.5l-9 9" />
        </svg>
      </button>
    </div>
  )
}

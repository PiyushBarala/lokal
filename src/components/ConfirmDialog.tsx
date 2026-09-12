import React, { useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'

interface ConfirmDialogProps {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Beautiful dark-themed in-app confirm dialog.
 * Replaces the browser's native window.confirm().
 */
export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmBtnRef = useRef<HTMLButtonElement>(null)

  // Auto-focus confirm button + keyboard shortcuts
  useEffect(() => {
    confirmBtnRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onCancel() }
      if (e.key === 'Enter')  { e.preventDefault(); onConfirm() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onConfirm, onCancel])

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
      onClick={onCancel}
    >
      <div
        className="bg-[#242424] border border-white/15 rounded-2xl shadow-2xl w-full max-w-[340px] overflow-hidden animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-start gap-3">
            {danger ? (
              <div className="w-9 h-9 rounded-full bg-red-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18" className="text-red-400">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                </svg>
              </div>
            ) : (
              <div className="w-9 h-9 rounded-full bg-accent/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18" className="text-accent">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                </svg>
              </div>
            )}
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-white leading-tight">{title}</h3>
              <p className="text-sm text-[#b3b3b3] mt-1 leading-snug">{message}</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 px-6 pb-6 pt-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-lg bg-white/10 hover:bg-white/15 text-white font-semibold text-sm transition-all active:scale-95"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmBtnRef}
            onClick={onConfirm}
            className={`flex-1 py-2.5 rounded-lg font-bold text-sm transition-all active:scale-95 shadow-md ${
              danger
                ? 'bg-red-500 hover:bg-red-400 text-white'
                : 'bg-accent hover:bg-accent/90 text-black'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ── Global confirm dialog manager ──────────────────────────────────────────
// Allows any component to trigger a confirm dialog imperatively
// without prop drilling.

interface ConfirmOptions {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
}

type ConfirmResolver = (confirmed: boolean) => void

let _setDialogState: ((state: { opts: ConfirmOptions; resolve: ConfirmResolver } | null) => void) | null = null

/**
 * Imperative confirm dialog — works from anywhere in the app.
 *
 * @example
 *   const ok = await showConfirm({ title: 'Delete', message: 'Are you sure?', danger: true })
 *   if (ok) { ... }
 */
export function showConfirm(opts: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    if (!_setDialogState) {
      // Fallback to browser confirm if provider not mounted
      resolve(window.confirm(opts.message))
      return
    }
    _setDialogState({ opts, resolve })
  })
}

/**
 * Mount this once at the app root (inside App.tsx or similar).
 * It renders the active ConfirmDialog when showConfirm() is called.
 */
export function ConfirmDialogProvider() {
  const [state, setState] = React.useState<{ opts: ConfirmOptions; resolve: ConfirmResolver } | null>(null)

  // Register the setter so showConfirm() can trigger this component
  useEffect(() => {
    _setDialogState = setState
    return () => { _setDialogState = null }
  }, [])

  const handleConfirm = useCallback(() => {
    state?.resolve(true)
    setState(null)
  }, [state])

  const handleCancel = useCallback(() => {
    state?.resolve(false)
    setState(null)
  }, [state])

  if (!state) return null

  return (
    <ConfirmDialog
      {...state.opts}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  )
}

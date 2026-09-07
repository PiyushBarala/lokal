import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { Track } from '../types'
import { useLibraryStore } from '../stores/libraryStore'

interface EditMetadataModalProps {
  track: Track
  onClose: () => void
  onSaved: (updated: Track) => void
}

interface Field {
  key: 'title' | 'artist' | 'album' | 'genre'
  label: string
  placeholder: string
}

const FIELDS: Field[] = [
  { key: 'title',  label: 'Title',  placeholder: 'Track title' },
  { key: 'artist', label: 'Artist', placeholder: 'Artist name' },
  { key: 'album',  label: 'Album',  placeholder: 'Album name' },
  { key: 'genre',  label: 'Genre',  placeholder: 'Genre' },
]

export function EditMetadataModal({ track, onClose, onSaved }: EditMetadataModalProps) {
  const { loadLibrary } = useLibraryStore()

  const [form, setForm] = useState({
    title:  track.title,
    artist: track.artist,
    album:  track.album,
    genre:  track.genre ?? '',
    year:   track.year?.toString() ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const handleChange = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [key]: e.target.value }))
  }

  const handleSave = async () => {
    if (!track.id) return
    setSaving(true)
    setError(null)
    try {
      const yearNum = form.year.trim() ? parseInt(form.year, 10) : null
      const updated = await window.lokal.db.updateTrack(track.id, {
        title:  form.title.trim() || track.title,
        artist: form.artist.trim() || track.artist,
        album:  form.album.trim()  || track.album,
        genre:  form.genre.trim()  || null,
        year:   yearNum && !isNaN(yearNum) ? yearNum : null,
      })
      await loadLibrary()
      if (updated) onSaved(updated as Track)
      onClose()
    } catch (err) {
      setError(String(err))
    } finally {
      setSaving(false)
    }
  }

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="pointer-events-auto w-full max-w-md bg-[#282828] rounded-2xl shadow-2xl border border-[#3a3a3a] overflow-hidden animate-fade-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-[#3a3a3a]">
            <div className="flex items-center gap-3">
              {track.artworkPath ? (
                <img
                  src={'lokal://media/' + track.artworkPath.replace(/\\/g, '/')}
                  alt=""
                  className="w-12 h-12 rounded-lg object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-[#3a3a3a] flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="#535353" width="24" height="24">
                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                  </svg>
                </div>
              )}
              <div>
                <h2 className="text-base font-semibold text-white">Edit Metadata</h2>
                <p className="text-xs text-[#b3b3b3] truncate max-w-[220px]">{track.filePath.split(/[\\/]/).pop()}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-[#b3b3b3] hover:text-white transition-colors p-1"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          </div>

          {/* Fields */}
          <div className="px-6 py-5 flex flex-col gap-4">
            {FIELDS.map((field) => (
              <div key={field.key}>
                <label className="block text-xs font-medium text-[#b3b3b3] mb-1.5 uppercase tracking-wider">
                  {field.label}
                </label>
                <input
                  type="text"
                  value={form[field.key]}
                  onChange={handleChange(field.key)}
                  placeholder={field.placeholder}
                  className="w-full px-3 py-2.5 bg-[#3a3a3a] text-white text-sm rounded-lg border border-transparent focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent placeholder-[#535353] transition-colors"
                />
              </div>
            ))}

            <div>
              <label className="block text-xs font-medium text-[#b3b3b3] mb-1.5 uppercase tracking-wider">
                Year
              </label>
              <input
                type="number"
                value={form.year}
                onChange={handleChange('year')}
                placeholder="e.g. 2024"
                min={1900}
                max={2099}
                className="w-full px-3 py-2.5 bg-[#3a3a3a] text-white text-sm rounded-lg border border-transparent focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent placeholder-[#535353] transition-colors"
              />
            </div>

            {error && (
              <p className="text-xs text-red-400 bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#3a3a3a]">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-[#b3b3b3] hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              id="btn-save-metadata"
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 rounded-lg bg-accent text-black text-sm font-semibold hover:bg-accent-hover transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  )
}

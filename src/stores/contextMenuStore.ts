import { create } from 'zustand'
import type { Track } from '../types'

export interface ContextMenuOptions {
  onRemoveFromPlaylist?: (trackId: number) => void
  onEditMetadata?: (track: Track) => void
  onTrackUpdated?: () => void
}

interface ContextMenuState {
  isOpen: boolean
  track: Track | null
  position: { x: number; y: number }
  options?: ContextMenuOptions
  openContextMenu: (e: React.MouseEvent, track: Track, options?: ContextMenuOptions) => void
  closeContextMenu: () => void
}

export const useContextMenuStore = create<ContextMenuState>((set) => ({
  isOpen: false,
  track: null,
  position: { x: 0, y: 0 },
  options: undefined,

  openContextMenu: (e, track, options) => {
    e.preventDefault()
    e.stopPropagation()
    set({
      isOpen: true,
      track,
      position: { x: e.clientX, y: e.clientY },
      options,
    })
  },

  closeContextMenu: () => {
    set({ isOpen: false, track: null, options: undefined })
  },
}))

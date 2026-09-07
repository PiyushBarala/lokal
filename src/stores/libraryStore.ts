import { create } from 'zustand'
import type { Track, Album, Artist, Playlist } from '../types'

interface LibraryState {
  tracks: Track[]
  albums: Album[]
  artists: Artist[]
  playlists: Playlist[]
  isLoaded: boolean
  isScanning: boolean
  scanFolder: string | null

  loadLibrary: () => Promise<void>
  setScanning: (v: boolean) => void
  setScanFolder: (f: string | null) => void
  addTracks: (tracks: Track[]) => void
  refreshPlaylists: () => Promise<void>
}

export const useLibraryStore = create<LibraryState>((set) => ({
  tracks: [],
  albums: [],
  artists: [],
  playlists: [],
  isLoaded: false,
  isScanning: false,
  scanFolder: null,

  loadLibrary: async () => {
    const [tracks, albums, artists, playlists] = await Promise.all([
      window.lokal.db.getTracks(),
      window.lokal.db.getAlbums(),
      window.lokal.db.getArtists(),
      window.lokal.db.getPlaylists(),
    ])
    set({ tracks, albums, artists, playlists, isLoaded: true })
  },

  setScanning: (v) => set({ isScanning: v }),
  setScanFolder: (f) => set({ scanFolder: f }),
  addTracks: (tracks) => set((s) => ({ tracks: [...s.tracks, ...tracks] })),

  refreshPlaylists: async () => {
    const playlists = await window.lokal.db.getPlaylists()
    set({ playlists })
  },
}))

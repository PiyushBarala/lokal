import { create } from 'zustand'
import type { YtSearchResult, DownloadItem, DownloadProgress } from '../types'

interface DownloadState {
  query: string
  results: YtSearchResult[]
  hasSearched: boolean
  isSearching: boolean
  isLoadingMore: boolean
  hasMore: boolean
  searchOffset: number
  searchError: string | null
  targetFolder: string
  downloadSimultaneously: boolean
  isDownloadingAll: boolean
  downloadAllProgress: { current: number; total: number } | null
  downloads: Map<string, DownloadItem>
  activeSeedVideoId: string | null
  activeSeedTitle: string | null

  // Actions
  setQuery: (query: string) => void
  setResults: (results: YtSearchResult[] | ((prev: YtSearchResult[]) => YtSearchResult[])) => void
  setHasSearched: (hasSearched: boolean) => void
  setIsSearching: (isSearching: boolean) => void
  setIsLoadingMore: (isLoadingMore: boolean) => void
  setHasMore: (hasMore: boolean) => void
  setSearchOffset: (offset: number | ((prev: number) => number)) => void
  setSearchError: (error: string | null) => void
  setTargetFolder: (folder: string) => void
  setDownloadSimultaneously: (enabled: boolean | ((prev: boolean) => boolean)) => void
  setIsDownloadingAll: (isDownloadingAll: boolean) => void
  setDownloadAllProgress: (progress: { current: number; total: number } | null) => void
  setDownloads: (
    downloads: Map<string, DownloadItem> | ((prev: Map<string, DownloadItem>) => Map<string, DownloadItem>)
  ) => void
  updateDownloadItem: (videoId: string, update: Partial<DownloadItem>) => void
  setActiveSeed: (videoId: string | null, title: string | null) => void
  clearSearch: () => void
}

export const useDownloadStore = create<DownloadState>((set, get) => ({
  query: '',
  results: [],
  hasSearched: false,
  isSearching: false,
  isLoadingMore: false,
  hasMore: true,
  searchOffset: 1,
  searchError: null,
  targetFolder: '',
  downloadSimultaneously: true,
  isDownloadingAll: false,
  downloadAllProgress: null,
  downloads: new Map<string, DownloadItem>(),
  activeSeedVideoId: null,
  activeSeedTitle: null,

  setQuery: (query) => set({ query }),
  setResults: (results) =>
    set((state) => ({
      results: typeof results === 'function' ? results(state.results) : results,
    })),
  setHasSearched: (hasSearched) => set({ hasSearched }),
  setIsSearching: (isSearching) => set({ isSearching }),
  setIsLoadingMore: (isLoadingMore) => set({ isLoadingMore }),
  setHasMore: (hasMore) => set({ hasMore }),
  setSearchOffset: (offset) =>
    set((state) => ({
      searchOffset: typeof offset === 'function' ? offset(state.searchOffset) : offset,
    })),
  setSearchError: (searchError) => set({ searchError }),
  setTargetFolder: (targetFolder) => set({ targetFolder }),
  setDownloadSimultaneously: (enabled) =>
    set((state) => ({
      downloadSimultaneously:
        typeof enabled === 'function' ? enabled(state.downloadSimultaneously) : enabled,
    })),
  setIsDownloadingAll: (isDownloadingAll) => set({ isDownloadingAll }),
  setDownloadAllProgress: (downloadAllProgress) => set({ downloadAllProgress }),
  setDownloads: (downloads) =>
    set((state) => ({
      downloads: typeof downloads === 'function' ? downloads(state.downloads) : downloads,
    })),
  updateDownloadItem: (videoId, update) =>
    set((state) => {
      const nextMap = new Map(state.downloads)
      const existing = nextMap.get(videoId)
      if (existing) {
        nextMap.set(videoId, { ...existing, ...update })
      }
      return { downloads: nextMap }
    }),
  setActiveSeed: (videoId, title) =>
    set({ activeSeedVideoId: videoId, activeSeedTitle: title }),
  clearSearch: () =>
    set({
      query: '',
      results: [],
      hasSearched: false,
      searchOffset: 1,
      hasMore: true,
      searchError: null,
    }),
}))

// Global listener for ytdlp progress events to persist state across route navigation
if (typeof window !== 'undefined') {
  const tryAttachListener = () => {
    if (window.lokal?.ytdlp?.onProgress) {
      window.lokal.ytdlp.onProgress((progress: DownloadProgress) => {
        useDownloadStore.getState().updateDownloadItem(progress.videoId, {
          percent: progress.percent,
          speed: progress.speed,
          eta: progress.eta,
          status: progress.status,
          filePath: progress.filePath,
          error: progress.error,
        })
      })
    }
  }

  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', tryAttachListener)
  } else {
    tryAttachListener()
  }
}

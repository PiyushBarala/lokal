// Shared TypeScript types used by both the renderer and main process via IPC

export interface Track {
  id?: number
  filePath: string
  fileHash: string
  title: string
  artist: string
  albumArtist: string
  album: string
  year: number | null
  trackNumber: number | null
  discNumber: number | null
  duration: number // seconds
  bitrate: number | null
  sampleRate: number | null
  hasArtwork: boolean
  artworkPath: string | null // path to extracted artwork PNG on disk
  genre: string | null
  comment: string | null
  liked: boolean
  playCount: number
  lastPlayedAt: string | null
  dateAdded: string
  sourceVideoId?: string | null
}

export interface Album {
  id?: number
  name: string
  artist: string
  albumArtist: string
  year: number | null
  artworkPath: string | null
  trackCount: number
}

export interface Artist {
  id?: number
  name: string
  trackCount: number
}

export interface Playlist {
  id?: number
  name: string
  createdAt: string
  updatedAt: string
  artworkPath?: string | null
  trackCount?: number
}

export interface PlaylistTrack {
  playlistId: number
  trackId: number
  position: number
}

export interface ScanProgress {
  current: number
  total: number
  file: string
}

export type RepeatMode = 'off' | 'all' | 'one'

export interface YtSearchResult {
  id: string
  title: string
  uploader: string
  duration: number
  durationString: string
  thumbnail: string
  url: string
}

export interface DownloadProgress {
  videoId: string
  percent: number
  speed: string
  eta: string
  status: 'downloading' | 'converting' | 'completed' | 'error' | 'cancelled'
  filePath?: string
  error?: string
}

export interface DownloadItem extends YtSearchResult {
  percent: number
  speed: string
  eta: string
  status: 'idle' | 'downloading' | 'converting' | 'completed' | 'error' | 'cancelled'
  filePath?: string
  error?: string
}

export interface UpdateStatus {
  type: 'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error'
  currentVersion: string
  version?: string
  percent?: number
  bytesPerSecond?: number
  transferred?: number
  total?: number
  releaseNotes?: string
  downloadUrl?: string
  error?: string
  message?: string
}


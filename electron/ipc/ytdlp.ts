import { ipcMain, app, dialog, BrowserWindow } from 'electron'
import { spawn, exec, ChildProcess } from 'node:child_process'
import * as path from 'node:path'
import * as fs from 'node:fs'
import { scanAndIndexFile } from './scanner'

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

function getYtDlpPath(): string {
  const candidates = [
    path.join(process.resourcesPath, 'bin', 'yt-dlp.exe'),
    path.join(process.resourcesPath, 'yt-dlp.exe'),
    path.join(app.getAppPath(), 'resources', 'bin', 'yt-dlp.exe'),
    path.join(app.getPath('userData'), 'bin', 'yt-dlp.exe'),
    path.join(__dirname, '../../resources/bin/yt-dlp.exe'),
  ]
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      return c
    }
  }
  return 'yt-dlp'
}

function getFfmpegPath(): string {
  const candidates = [
    path.join(process.resourcesPath, 'bin', 'ffmpeg.exe'),
    path.join(process.resourcesPath, 'ffmpeg.exe'),
    path.join(app.getAppPath(), 'resources', 'bin', 'ffmpeg.exe'),
    path.join(app.getPath('userData'), 'bin', 'ffmpeg.exe'),
    path.join(__dirname, '../../resources/bin/ffmpeg.exe'),
  ]
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      return c
    }
  }
  return 'ffmpeg'
}

function formatDuration(sec: number): string {
  if (!sec || isNaN(sec) || sec <= 0) return '0:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

/**
 * Get a lightweight preview thumbnail for fast loading and low bandwidth.
 * (Full resolution thumbnail is downloaded and embedded during actual song download).
 */
function getPreviewThumbnail(item: any, videoId: string): string {
  if (Array.isArray(item.thumbnails) && item.thumbnails.length > 0) {
    const smallThumb = item.thumbnails.find(
      (t: any) => t.width && t.width >= 160 && t.width <= 360
    ) || item.thumbnails.find(
      (t: any) => t.url && (t.url.includes('mqdefault') || t.url.includes('default') || t.url.includes('hqdefault'))
    )
    if (smallThumb?.url) {
      return smallThumb.url
    }
  }
  if (videoId) {
    return `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`
  }
  return item.thumbnails?.[0]?.url || ''
}

const activeDownloads = new Map<string, ChildProcess>()

export function registerYtDlpHandlers(): void {
  // ── 1. Search by name / keyword ──
  ipcMain.handle(
    'ytdlp:search',
    async (_event, query: string, offset: number = 1, limit: number = 8): Promise<YtSearchResult[]> => {
      const q = (query || '').trim()
      if (!q) return []

      const startIndex = Math.max(1, offset || 1)
      const count = Math.max(1, limit || 8)
      const endIndex = startIndex + count - 1

      const ytDlpPath = getYtDlpPath()
      console.log(`[yt-dlp search] Starting search for: "${q}" items ${startIndex}:${endIndex} using ${ytDlpPath}`)

      return new Promise((resolve) => {
        const args = [
          `ytsearch${endIndex}:${q}`,
          '--dump-json',
          '--no-download',
          '--flat-playlist',
          '--playlist-items',
          `${startIndex}:${endIndex}`
        ]

      const proc = spawn(ytDlpPath, args, {
        windowsHide: true,
      })

      let stdout = ''
      let stderr = ''

      proc.stdout.on('data', (data) => {
        stdout += data.toString()
      })

      proc.stderr.on('data', (data) => {
        stderr += data.toString()
      })

      proc.on('error', (err) => {
        console.error('[yt-dlp search] Process error:', err)
        resolve([])
      })

      proc.on('close', (code) => {
        if (code !== 0 && stdout.trim().length === 0) {
          console.error(`[yt-dlp search] Process exited with code ${code}:`, stderr)
          resolve([])
          return
        }

        const lines = stdout.split('\n').map((l) => l.trim()).filter((l) => l.startsWith('{'))
        const results: YtSearchResult[] = []

        for (const line of lines) {
          try {
            const item = JSON.parse(line)
            const itemId = item.id || ''
            const thumbnail = getPreviewThumbnail(item, itemId)

            const durationSec = typeof item.duration === 'number' ? item.duration : 0
            const durationString = item.duration_string || formatDuration(durationSec)

            results.push({
              id: itemId,
              title: item.title || 'Unknown Title',
              uploader: item.uploader || item.channel || 'Unknown Artist',
              duration: durationSec,
              durationString,
              thumbnail,
              url: item.url || `https://www.youtube.com/watch?v=${itemId}`,
            })
          } catch (e) {
            console.error('[yt-dlp search] Error parsing JSON line:', e)
          }
        }

        console.log(`[yt-dlp search] Found ${results.length} result(s) for "${q}"`)
        resolve(results)
      })
    })
  })

  // ── 2. Download by video ID ──
  ipcMain.handle(
    'ytdlp:download',
    async (
      event,
      { videoId, title, targetFolder }: { videoId: string; title?: string; targetFolder?: string }
    ): Promise<{ success: boolean; filePath?: string; error?: string }> => {
      if (!videoId) return { success: false, error: 'No videoId provided' }

      if (activeDownloads.has(videoId)) {
        return { success: false, error: 'Already downloading this track' }
      }

      const ytDlpPath = getYtDlpPath()
      const ffmpegPath = getFfmpegPath()

      // Determine output directory
      let outDir = targetFolder
      if (!outDir || !fs.existsSync(outDir)) {
        try {
          outDir = app.getPath('music')
        } catch {
          outDir = path.join(app.getPath('userData'), 'downloads')
        }
      }
      if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true })
      }

      console.log(`[yt-dlp download] Starting download: ${videoId} (${title || 'no title'}) -> ${outDir}`)

      return new Promise((resolve) => {
        const args = [
          `https://www.youtube.com/watch?v=${videoId}`,
          '-x',
          '--audio-format', 'mp3',
          '--audio-quality', '0',
          '-o', path.join(outDir, '%(title)s.%(ext)s'),
          '--embed-thumbnail',
          '--add-metadata',
          '--ffmpeg-location', ffmpegPath,
          '--no-abort-on-error',
          '--retries', '5',
          '--fragment-retries', '5',
          '--socket-timeout', '30',
          '--print', 'after_move:filepath',
          '--newline'
        ]

        const proc = spawn(ytDlpPath, args, {
          windowsHide: true,
        })

        activeDownloads.set(videoId, proc)

        let resolvedFilePath: string | null = null
        let lastError = ''

        // Send initial progress
        event.sender.send('ytdlp:progress', {
          videoId,
          percent: 0,
          speed: '',
          eta: '',
          status: 'downloading',
        })

        proc.stdout.on('data', (chunk: Buffer) => {
          const text = chunk.toString()
          const lines = text.split(/\r?\n/)

          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed) continue

            // Check if yt-dlp printed the final after_move filepath (direct MP3 path)
            if (trimmed.toLowerCase().endsWith('.mp3') && (trimmed.includes(outDir) || path.isAbsolute(trimmed))) {
              resolvedFilePath = trimmed
              continue
            }

            // 1. Check download progress regex
            // e.g. [download]  42.3% of 3.45MiB at 1.2MiB/s ETA 00:05
            const progressMatch = trimmed.match(
              /\[download\]\s+([0-9.]+)%(?:\s+of\s+([~0-9.]+\s*[A-Za-z]+))?(?:\s+at\s+([0-9.]+\s*[A-Za-z/]+))?(?:\s+ETA\s+([0-9:]+))?/
            )
            if (progressMatch) {
              const percent = parseFloat(progressMatch[1]) || 0
              const speed = progressMatch[3] ? progressMatch[3].trim() : ''
              const eta = progressMatch[4] ? progressMatch[4].trim() : ''
              event.sender.send('ytdlp:progress', {
                videoId,
                percent,
                speed,
                eta,
                status: 'downloading',
              })
              continue
            }

            // 2. Check conversion / extraction state
            if (trimmed.includes('[ExtractAudio]') || trimmed.includes('[Merger]') || trimmed.includes('[Metadata]')) {
              event.sender.send('ytdlp:progress', {
                videoId,
                percent: 99,
                speed: '',
                eta: '',
                status: 'converting',
              })
            }

            // 3. Detect destination file path (only accept if it's the audio/mp3 file, NOT image thumbnails)
            const destAudioMatch = trimmed.match(/\[ExtractAudio\]\s+Destination:\s+(.+\.mp3)$/i)
            if (destAudioMatch) {
              resolvedFilePath = destAudioMatch[1].trim()
              continue
            }

            const destMatch = trimmed.match(/\[download\]\s+Destination:\s+(.+)$/)
            if (destMatch) {
              const candidate = destMatch[1].trim()
              if (candidate.toLowerCase().endsWith('.mp3')) {
                resolvedFilePath = candidate
              } else if (!candidate.match(/\.(webp|jpg|jpeg|png)$/i)) {
                // Audio intermediate format (e.g. .opus, .webm, .m4a)
                resolvedFilePath = candidate.replace(/\.[^.]+$/, '.mp3')
              }
            }

            const alreadyMatch = trimmed.match(/\[download\]\s+(.+?)\s+has already been downloaded/)
            if (alreadyMatch) {
              const candidate = alreadyMatch[1].trim()
              if (candidate.toLowerCase().endsWith('.mp3')) {
                resolvedFilePath = candidate
              } else if (!candidate.match(/\.(webp|jpg|jpeg|png)$/i)) {
                resolvedFilePath = candidate.replace(/\.[^.]+$/, '.mp3')
              }
            }
          }
        })

        proc.stderr.on('data', (chunk: Buffer) => {
          lastError += chunk.toString()
        })

        proc.on('error', (err) => {
          activeDownloads.delete(videoId)
          event.sender.send('ytdlp:progress', {
            videoId,
            percent: 0,
            speed: '',
            eta: '',
            status: 'error',
            error: err.message,
          })
          resolve({ success: false, error: err.message })
        })

        proc.on('close', async (code) => {
          activeDownloads.delete(videoId)

          // 1. Locate the downloaded MP3 file
          let finalMp3 = resolvedFilePath
          if (!finalMp3 || !fs.existsSync(finalMp3)) {
            try {
              const allMp3s = fs.readdirSync(outDir)
                .filter((f) => f.toLowerCase().endsWith('.mp3'))
                .map((f) => {
                  const p = path.join(outDir, f)
                  try {
                    const st = fs.statSync(p)
                    return { path: p, name: f, time: st.mtimeMs, size: st.size }
                  } catch {
                    return null
                  }
                })
                .filter((f): f is NonNullable<typeof f> => f !== null && f.size > 50000)

              // If title was provided, try matching filename with title tokens
              if (title) {
                const cleanTitleWords = title.toLowerCase().replace(/[^a-z0-9]/g, ' ').split(/\s+/).filter((w) => w.length > 2)
                const titleMatch = allMp3s.find((f) => {
                  const fnLower = f.name.toLowerCase()
                  return cleanTitleWords.length > 0 && cleanTitleWords.filter((w) => fnLower.includes(w)).length >= Math.min(2, cleanTitleWords.length)
                })
                if (titleMatch) {
                  finalMp3 = titleMatch.path
                }
              }

              // Fallback: take the most recent MP3 modified in the last 2 minutes
              if (!finalMp3) {
                const recent = allMp3s
                  .filter((f) => Date.now() - f.time < 120000)
                  .sort((a, b) => b.time - a.time)
                if (recent.length > 0) {
                  finalMp3 = recent[0].path
                }
              }
            } catch {}
          }

          // If the audio file was created successfully, treat as success even if yt-dlp exited
          // with a warning/exit code (e.g. non-critical thumbnail download network glitch)
          const isFileValid = Boolean(finalMp3 && fs.existsSync(finalMp3))

          if (code === 0 || isFileValid) {
            console.log(`[yt-dlp download] Completed. Final MP3: ${finalMp3}`)

            // Index into database immediately with sourceVideoId
            if (finalMp3 && fs.existsSync(finalMp3)) {
              try {
                await scanAndIndexFile(finalMp3, videoId)
              } catch (err) {
                console.error('[yt-dlp download] Failed to index downloaded file:', err)
              }
            }

            event.sender.send('ytdlp:progress', {
              videoId,
              percent: 100,
              speed: '',
              eta: '',
              status: 'completed',
              filePath: finalMp3 || undefined,
            })

            resolve({ success: true, filePath: finalMp3 || undefined })
          } else {
            console.error(`[yt-dlp download] Failed with exit code ${code}:`, lastError)

            let friendlyError = 'Download failed'
            if (/HTTP(S)?ConnectionPool|timed?\s*out|ConnectionReset|getaddrinfo|WinError|network/i.test(lastError)) {
              friendlyError = 'Network error: Connection timed out or interrupted. Click Retry to continue.'
            } else if (lastError.trim()) {
              const cleanLine = lastError
                .split(/\r?\n/)
                .map((l) => l.trim())
                .filter((l) => l.startsWith('ERROR:') || l.includes('Error:'))
                .pop()
              if (cleanLine) {
                friendlyError = cleanLine.replace(/^ERROR:\s*/, '')
              }
            }

            event.sender.send('ytdlp:progress', {
              videoId,
              percent: 0,
              speed: '',
              eta: '',
              status: 'error',
              error: friendlyError,
            })
            resolve({ success: false, error: friendlyError })
          }
        })
      })
    }
  )

  // ── 3. Cancel active download ──
  ipcMain.handle('ytdlp:cancel', async (event, videoId: string) => {
    const proc = activeDownloads.get(videoId)
    if (proc) {
      if (process.platform === 'win32' && proc.pid) {
        try {
          exec(`taskkill /pid ${proc.pid} /T /F`)
        } catch {}
      }
      try {
        proc.kill('SIGTERM')
      } catch {}
      activeDownloads.delete(videoId)
      event.sender.send('ytdlp:progress', {
        videoId,
        percent: 0,
        speed: '',
        eta: '',
        status: 'cancelled',
      })
      return true
    }
    return false
  })

  // ── 4. Get default music folder ──
  ipcMain.handle('ytdlp:get-default-folder', () => {
    try {
      return app.getPath('music')
    } catch {
      try {
        return app.getPath('downloads')
      } catch {
        return path.join(app.getPath('userData'), 'downloads')
      }
    }
  })

  // ── 5. Pick download folder dialog ──
  ipcMain.handle('ytdlp:pick-folder', async () => {
    const win = BrowserWindow.getFocusedWindow()
    const result = await dialog.showOpenDialog(win ?? undefined as any, {
      title: 'Select Download Folder',
      properties: ['openDirectory', 'createDirectory'],
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  // ── 6. Get related tracks (YouTube Mix) ──
  ipcMain.handle(
    'ytdlp:getRelated',
    async (_event, videoId: string, offset: number = 1, limit: number = 20): Promise<YtSearchResult[]> => {
      const id = (videoId || '').trim()
      if (!id) return []

      const startIndex = Math.max(1, offset || 1)
      const count = Math.max(1, limit || 20)
      const endIndex = startIndex + count - 1

      const ytDlpPath = getYtDlpPath()
      console.log(`[yt-dlp related] Fetching YouTube Mix for videoId: ${id} items ${startIndex}:${endIndex} using ${ytDlpPath}`)

      return new Promise((resolve) => {
        const args = [
          `https://www.youtube.com/watch?v=${id}&list=RD${id}`,
          '--yes-playlist',
          '--flat-playlist',
          '--dump-json',
          '--no-download',
          '--playlist-items',
          `${startIndex}:${endIndex}`
        ]

      const proc = spawn(ytDlpPath, args, {
        windowsHide: true,
      })

      let stdout = ''
      let stderr = ''

      proc.stdout.on('data', (data) => {
        stdout += data.toString()
      })

      proc.stderr.on('data', (data) => {
        stderr += data.toString()
      })

      proc.on('error', (err) => {
        console.error('[yt-dlp related] Process error:', err)
        resolve([])
      })

      proc.on('close', (code) => {
        if (code !== 0 && stdout.trim().length === 0) {
          console.error(`[yt-dlp related] Process exited with code ${code}:`, stderr)
          resolve([])
          return
        }

        const lines = stdout.split('\n').map((l) => l.trim()).filter((l) => l.startsWith('{'))
        const results: YtSearchResult[] = []

        for (const line of lines) {
          try {
            const item = JSON.parse(line)
            const itemId = item.id || ''

            // Skip the first entry if it duplicates the seed track
            if (itemId === id) {
              continue
            }

            const thumbnail = getPreviewThumbnail(item, itemId)

            const durationSec = typeof item.duration === 'number' ? item.duration : 0
            const durationString = item.duration_string || formatDuration(durationSec)

            results.push({
              id: itemId,
              title: item.title || 'Unknown Title',
              uploader: item.uploader || item.channel || 'Unknown Artist',
              duration: durationSec,
              durationString,
              thumbnail,
              url: item.url || `https://www.youtube.com/watch?v=${itemId}`,
            })
          } catch (e) {
            console.error('[yt-dlp related] Error parsing JSON line:', e)
          }
        }

        console.log(`[yt-dlp related] Found ${results.length} related tracks for seed "${id}"`)
        resolve(results)
      })
    })
  })

  // ── 6. Sync entire folder (ensures all downloaded MP3s in directory are indexed) ──
  ipcMain.handle('ytdlp:sync-folder', async (_event, folderPath?: string) => {
    let outDir = folderPath
    if (!outDir || !fs.existsSync(outDir)) {
      try {
        outDir = app.getPath('music')
      } catch {
        outDir = path.join(app.getPath('userData'), 'downloads')
      }
    }
    if (!fs.existsSync(outDir)) return { synced: 0 }

    try {
      const files = fs.readdirSync(outDir)
        .filter((f) => f.toLowerCase().endsWith('.mp3'))
        .map((f) => path.join(outDir!, f))

      let count = 0
      for (const filePath of files) {
        try {
          const res = await scanAndIndexFile(filePath)
          if (res) count++
        } catch (e) {
          console.error('[ytdlp:sync-folder] Failed to index file:', filePath, e)
        }
      }
      console.log(`[ytdlp:sync-folder] Successfully checked/synced ${count} tracks from ${outDir}`)
      return { synced: count }
    } catch (err: any) {
      console.error('[ytdlp:sync-folder] Error:', err)
      return { synced: 0, error: err.message }
    }
  })
}


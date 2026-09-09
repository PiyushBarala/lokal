import { app, ipcMain, BrowserWindow, shell } from 'electron'
import { autoUpdater, UpdateInfo } from 'electron-updater'
import https from 'node:https'

let mainWindowRef: BrowserWindow | null = null

export type UpdateStatusType =
  | 'idle'
  | 'checking'
  | 'available'
  | 'not-available'
  | 'downloading'
  | 'downloaded'
  | 'error'

export interface UpdateStatusData {
  type: UpdateStatusType
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

let lastStatus: UpdateStatusData = {
  type: 'idle',
  currentVersion: app.getVersion(),
}

function sendStatus(data: UpdateStatusData) {
  lastStatus = data
  if (mainWindowRef && !mainWindowRef.isDestroyed()) {
    mainWindowRef.webContents.send('updater:status', data)
  }
}

function compareVersions(v1: string, v2: string): number {
  const p1 = v1.replace(/^v/, '').split('.').map((n) => parseInt(n, 10) || 0)
  const p2 = v2.replace(/^v/, '').split('.').map((n) => parseInt(n, 10) || 0)
  for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
    const num1 = p1[i] || 0
    const num2 = p2[i] || 0
    if (num1 > num2) return 1
    if (num1 < num2) return -1
  }
  return 0
}

async function checkGitHubReleasesDirectly(): Promise<void> {
  return new Promise((resolve) => {
    const req = https.get(
      'https://api.github.com/repos/PiyushBarala/lokal/releases',
      {
        headers: {
          'User-Agent': 'Lokal-Music-Player/' + app.getVersion(),
          'Accept': 'application/vnd.github.v3+json',
        },
      },
      (res) => {
        let rawData = ''
        res.on('data', (chunk) => {
          rawData += chunk
        })
        res.on('end', () => {
          try {
            if (res.statusCode === 200) {
              const releases = JSON.parse(rawData)
              if (Array.isArray(releases) && releases.length > 0) {
                const latest = releases[0]
                const remoteTag = latest.tag_name || ''
                const remoteVer = remoteTag.replace(/^v/, '')
                const currentVer = app.getVersion()

                if (compareVersions(remoteVer, currentVer) > 0) {
                  const exeAsset = latest.assets?.find((a: any) => a.name?.endsWith('.exe'))
                  sendStatus({
                    type: 'available',
                    currentVersion: currentVer,
                    version: remoteVer,
                    releaseNotes: latest.body || undefined,
                    downloadUrl: exeAsset?.browser_download_url || latest.html_url,
                    message: `New version ${remoteVer} available on GitHub.`,
                  })
                  resolve()
                  return
                } else {
                  sendStatus({
                    type: 'not-available',
                    currentVersion: currentVer,
                    version: currentVer,
                    message: `Lokal is up to date (v${currentVer}).`,
                  })
                  resolve()
                  return
                }
              }
            }
          } catch (e) {
            console.error('[Updater] Fallback JSON parse error:', e)
          }

          sendStatus({
            type: 'not-available',
            currentVersion: app.getVersion(),
            version: app.getVersion(),
            message: `Lokal is up to date (v${app.getVersion()}).`,
          })
          resolve()
        })
      }
    )

    req.on('error', (err) => {
      console.warn('[Updater] Direct GitHub check error:', err)
      sendStatus({
        type: 'error',
        currentVersion: app.getVersion(),
        error: err.message,
        message: 'Could not connect to GitHub. Check internet connection.',
      })
      resolve()
    })

    req.setTimeout(8000, () => {
      req.destroy()
      sendStatus({
        type: 'error',
        currentVersion: app.getVersion(),
        message: 'Connection timed out checking for updates.',
      })
      resolve()
    })
  })
}

export function registerUpdaterHandlers(win: BrowserWindow | null): void {
  mainWindowRef = win

  // Configure autoUpdater
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.allowPrerelease = true

  // Event: checking for update
  autoUpdater.on('checking-for-update', () => {
    console.log('[Updater] Checking for update...')
    sendStatus({
      type: 'checking',
      currentVersion: app.getVersion(),
      message: 'Checking for updates...',
    })
  })

  // Event: update available
  autoUpdater.on('update-available', (info: UpdateInfo) => {
    console.log(`[Updater] Update available: v${info.version}`)
    const releaseNotes = typeof info.releaseNotes === 'string'
      ? info.releaseNotes
      : Array.isArray(info.releaseNotes)
        ? info.releaseNotes.map((n) => (typeof n === 'string' ? n : n.note)).join('\n')
        : undefined

    sendStatus({
      type: 'available',
      currentVersion: app.getVersion(),
      version: info.version,
      releaseNotes,
      message: `Version ${info.version} is available. Starting download...`,
    })
  })

  // Event: update not available
  autoUpdater.on('update-not-available', (info: UpdateInfo) => {
    console.log(`[Updater] Up to date (v${info.version})`)
    sendStatus({
      type: 'not-available',
      currentVersion: app.getVersion(),
      version: info.version,
      message: 'Lokal is up to date.',
    })
  })

  // Event: download progress
  autoUpdater.on('download-progress', (progress) => {
    const percent = Math.round(progress.percent * 10) / 10
    sendStatus({
      type: 'downloading',
      currentVersion: app.getVersion(),
      percent,
      bytesPerSecond: progress.bytesPerSecond,
      transferred: progress.transferred,
      total: progress.total,
      message: `Downloading update: ${percent}%`,
    })
  })

  // Event: update downloaded
  autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
    console.log(`[Updater] Update downloaded: v${info.version}`)
    sendStatus({
      type: 'downloaded',
      currentVersion: app.getVersion(),
      version: info.version,
      message: `Update v${info.version} ready to install.`,
    })
  })

  // Event: error
  autoUpdater.on('error', async (err: Error) => {
    console.error('[Updater] autoUpdater error:', err)
    const errStr = String(err?.message || err)
    if (
      errStr.includes('404') ||
      errStr.includes('latest.yml') ||
      errStr.includes('Cannot find') ||
      errStr.includes('HttpError')
    ) {
      console.log('[Updater] latest.yml missing or 404, falling back to direct GitHub releases API...')
      await checkGitHubReleasesDirectly()
      return
    }

    sendStatus({
      type: 'error',
      currentVersion: app.getVersion(),
      error: err.message || 'Failed to check for updates',
      message: 'Failed to check for updates. Check internet connection.',
    })
  })

  // ── IPC Handlers ────────────────────────────────────────────────
  ipcMain.handle('updater:get-version', () => {
    return app.getVersion()
  })

  ipcMain.handle('updater:get-last-status', () => {
    return lastStatus
  })

  ipcMain.handle('updater:check', async () => {
    if (!app.isPackaged && process.env.NODE_ENV === 'development') {
      console.log('[Updater] In development mode, autoUpdater will simulate check.')
      sendStatus({
        type: 'checking',
        currentVersion: app.getVersion(),
        message: 'Checking for updates (Dev mode)...',
      })
      setTimeout(() => {
        sendStatus({
          type: 'not-available',
          currentVersion: app.getVersion(),
          message: `Lokal v${app.getVersion()} is up to date (Dev Mode).`,
        })
      }, 1000)
      return { success: true }
    }

    try {
      sendStatus({
        type: 'checking',
        currentVersion: app.getVersion(),
        message: 'Checking for updates...',
      })
      await autoUpdater.checkForUpdates()
      return { success: true }
    } catch (err: any) {
      console.error('[Updater] checkForUpdates failed:', err)
      const errStr = String(err?.message || err)
      if (
        errStr.includes('404') ||
        errStr.includes('latest.yml') ||
        errStr.includes('Cannot find') ||
        errStr.includes('HttpError')
      ) {
        console.log('[Updater] Falling back to direct GitHub check on check error...')
        await checkGitHubReleasesDirectly()
        return { success: true }
      }
      sendStatus({
        type: 'error',
        currentVersion: app.getVersion(),
        error: err.message,
        message: 'Could not connect to update server.',
      })
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('updater:download', async () => {
    try {
      await autoUpdater.downloadUpdate()
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('updater:install', () => {
    autoUpdater.quitAndInstall(false, true)
  })
}

export async function checkForUpdatesQuietly(): Promise<void> {
  if (app.isPackaged) {
    try {
      await autoUpdater.checkForUpdates()
    } catch (e: any) {
      console.warn('[Updater] Background update check:', e)
      const errStr = String(e?.message || e)
      if (errStr.includes('404') || errStr.includes('latest.yml')) {
        await checkGitHubReleasesDirectly()
      }
    }
  }
}


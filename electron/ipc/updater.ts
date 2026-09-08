import { app, ipcMain, BrowserWindow } from 'electron'
import { autoUpdater, UpdateInfo } from 'electron-updater'

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

export function registerUpdaterHandlers(win: BrowserWindow | null): void {
  mainWindowRef = win

  // Configure autoUpdater
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.allowPrerelease = false

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
  autoUpdater.on('error', (err: Error) => {
    console.error('[Updater] Error:', err)
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
      await autoUpdater.checkForUpdates()
      return { success: true }
    } catch (err: any) {
      console.error('[Updater] checkForUpdates failed:', err)
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
    } catch (e) {
      console.warn('[Updater] Background update check:', e)
    }
  }
}


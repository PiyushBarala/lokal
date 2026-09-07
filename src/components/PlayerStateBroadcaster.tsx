import { useEffect } from 'react'
import { usePlayerStore } from '../stores/playerStore'

/**
 * Invisible component that lives in the MAIN window only.
 * Watches the Zustand player store and forwards state changes to the
 * mini player window via IPC whenever the mini player is open.
 * (If the mini player window doesn't exist, the IPC message is silently dropped.)
 */
export function PlayerStateBroadcaster(): null {
  const {
    currentTrack, isPlaying, seekPosition, duration,
    volume, isMuted, shuffle, repeat,
  } = usePlayerStore()

  useEffect(() => {
    window.lokal.miniplayer.syncState({
      currentTrack, isPlaying, seekPosition, duration,
      volume, isMuted, shuffle, repeat,
    })
  }, [currentTrack, isPlaying, seekPosition, duration, volume, isMuted, shuffle, repeat])

  return null
}

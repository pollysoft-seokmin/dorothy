import { useEffect } from 'react'
import { usePlayerStore } from '~/stores/player-store'

interface ShortcutActions {
  play: () => void
  pause: () => void
  seek: (time: number) => void
}

export function useKeyboardShortcuts(actions: ShortcutActions) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // input/textarea 포커스 시 단축키 비활성화
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return
      }

      const state = usePlayerStore.getState()

      switch (e.key) {
        case ' ':
          e.preventDefault()
          if (state.status === 'playing') {
            actions.pause()
          } else if (state.fileName) {
            actions.play()
          }
          break

        case 'ArrowLeft':
          e.preventDefault()
          actions.seek(state.currentTime - 5)
          break

        case 'ArrowRight':
          e.preventDefault()
          actions.seek(state.currentTime + 5)
          break

        case 'ArrowUp':
          e.preventDefault()
          state.setVolume(Math.min(1, state.volume + 0.1))
          break

        case 'ArrowDown':
          e.preventDefault()
          state.setVolume(Math.max(0, state.volume - 0.1))
          break

        case 'm':
        case 'M':
          e.preventDefault()
          state.toggleMute()
          break
      }
    }

    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [actions])
}

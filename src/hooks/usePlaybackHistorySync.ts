import { useEffect, useRef } from 'react'
import { useSession } from '~/lib/auth-client'
import { usePlayerStore } from '~/stores/player-store'
import { appendPlaybackHistory } from '~/server/personalization'

export function usePlaybackHistorySync() {
  const { data } = useSession()
  const userId = data?.user?.id
  const lastLoggedKeyRef = useRef<string | null>(null)

  useEffect(() => {
    if (!userId) return
    const unsub = usePlayerStore.subscribe((s) => {
      if (s.status !== 'playing') return
      if (!s.fileName) return
      const key = `${userId}::${s.fileName}`
      if (lastLoggedKeyRef.current === key) return
      lastLoggedKeyRef.current = key
      void appendPlaybackHistory({
        data: {
          fileName: s.fileName,
          title: s.metadata?.title ?? null,
          artist: s.metadata?.artist ?? null,
          album: s.metadata?.album ?? null,
          durationSeconds: s.duration > 0 ? Math.round(s.duration) : null,
        },
      }).catch(() => {})
    })
    return () => unsub()
  }, [userId])
}

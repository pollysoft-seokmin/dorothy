import { useEffect, useRef } from 'react'
import { useSession } from '~/lib/auth-client'
import { usePlayerStore } from '~/stores/player-store'
import {
  getMyPreferences,
  updateMyPreferences,
} from '~/server/personalization'

const DEBOUNCE_MS = 500

export function usePreferencesSync() {
  const { data, isPending } = useSession()
  const userId = data?.user?.id
  const lastUserIdRef = useRef<string | null>(null)
  const hydratedRef = useRef(false)

  useEffect(() => {
    if (isPending) return
    if (!userId) {
      lastUserIdRef.current = null
      hydratedRef.current = false
      return
    }
    if (lastUserIdRef.current === userId) return
    lastUserIdRef.current = userId
    hydratedRef.current = false

    let cancelled = false
    void getMyPreferences().then((prefs) => {
      if (cancelled) return
      usePlayerStore.setState({ volume: prefs.volume })
      hydratedRef.current = true
    })
    return () => {
      cancelled = true
    }
  }, [userId, isPending])

  useEffect(() => {
    if (!userId) return
    let timer: ReturnType<typeof setTimeout> | null = null
    const unsub = usePlayerStore.subscribe((s, prev) => {
      if (!hydratedRef.current) return
      if (s.volume === prev.volume) return
      if (timer) clearTimeout(timer)
      const volume = s.volume
      timer = setTimeout(() => {
        void updateMyPreferences({ data: { volume } }).catch(() => {})
      }, DEBOUNCE_MS)
    })
    return () => {
      unsub()
      if (timer) clearTimeout(timer)
    }
  }, [userId])
}

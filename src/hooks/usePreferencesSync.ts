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
      usePlayerStore.setState({
        lyricsLanguage: prefs.lyricsLanguage,
        viewMode: prefs.viewMode,
      })
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
      if (
        s.lyricsLanguage === prev.lyricsLanguage &&
        s.viewMode === prev.viewMode
      )
        return
      if (timer) clearTimeout(timer)
      // updateMyPreferences 는 받은 필드만이 아니라 환경설정 한 행을 통째로 덮어쓰므로
      // 어느 한쪽만 바뀌어도 두 값을 함께 보내 다른 쪽이 default 로 초기화되지 않게 한다.
      const payload = { lyricsLanguage: s.lyricsLanguage, viewMode: s.viewMode }
      timer = setTimeout(() => {
        void updateMyPreferences({ data: payload }).catch(() => {})
      }, DEBOUNCE_MS)
    })
    return () => {
      unsub()
      if (timer) clearTimeout(timer)
    }
  }, [userId])
}

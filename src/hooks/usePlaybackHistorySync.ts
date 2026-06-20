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
      // 로드 시점부터 최근 재생 목록에 노출되도록, 재생 상태와 무관하게
      // fileName 이 새로 잡히면 한 번 기록한다 (#90). 로드 직후엔 메타데이터가
      // 아직 추출되지 않아 title/artist/album 은 null 일 수 있고, 라이브러리
      // 매칭은 fileName 기준이라 디스플레이는 그대로 동작한다.
      if (!s.fileName) return
      // 최근 목록은 재생 가능한 Drive 기록만 다룬다(#129). 로컬 재생은 파일
      // 핸들이 휘발돼 다시 재생할 수 없으므로 기록하지 않는다.
      if (s.source !== 'google_drive' || !s.providerFileId) return
      const key = `${userId}::${s.source}::${s.providerFileId}`
      if (lastLoggedKeyRef.current === key) return
      lastLoggedKeyRef.current = key
      void appendPlaybackHistory({
        data: {
          fileName: s.fileName,
          title: s.metadata?.title ?? null,
          artist: s.metadata?.artist ?? null,
          album: s.metadata?.album ?? null,
          source: s.source,
          providerFileId: s.providerFileId,
          providerLrcFileId: s.providerLrcFileId,
          mediaType: s.mediaType,
          durationSeconds: s.duration > 0 ? Math.round(s.duration) : null,
        },
      }).catch(() => {})
    })
    return () => unsub()
  }, [userId])
}

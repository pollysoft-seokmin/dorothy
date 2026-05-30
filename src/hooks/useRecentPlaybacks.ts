import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  getRecentPlaybacks,
  resolveRecentPlayback,
} from '~/server/personalization'
import type { RecentPlayback } from '~/components/library/library-shared'

type PlayPayload = {
  url: string
  name: string
  mediaType: 'audio' | 'video'
  lrcUrl?: string
}

// 최근 재생 목록 fetch + 행 클릭 시 resolve→재생. "내 미디어"의 최근 탭이
// 데스크톱/모바일에서 공유하는 로직 (#105). 라이브러리는 player 와 같은 트리에
// 있어 onResolved 로 받은 페이로드를 곧장 재생에 위임하면 된다.
export function useRecentPlaybacks({
  active,
  onResolved,
}: {
  // 최근 탭이 보이는 동안만 true — 다른 탭/닫힘 상태에서 불필요한 fetch 방지.
  active: boolean
  onResolved: (payload: PlayPayload) => void
}) {
  const [recent, setRecent] = useState<RecentPlayback[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [resolvingId, setResolvingId] = useState<string | null>(null)

  // onResolved 는 매 렌더 새 함수일 수 있으므로 ref 로 고정해 playRecent 를 안정화.
  const onResolvedRef = useRef(onResolved)
  onResolvedRef.current = onResolved

  // active 가 false→true 로 바뀔 때마다 최신 목록을 가져온다(탭 재진입 시 갱신).
  useEffect(() => {
    if (!active) return
    let cancelled = false
    setError(null)
    getRecentPlaybacks()
      .then((rows) => {
        if (!cancelled) setRecent(rows)
      })
      .catch((e) => {
        if (!cancelled)
          setError(e instanceof Error ? e.message : 'unknown error')
      })
    return () => {
      cancelled = true
    }
  }, [active])

  const playRecent = useCallback(
    async (row: RecentPlayback) => {
      if (resolvingId) return
      setResolvingId(row.id)
      try {
        const payload = await resolveRecentPlayback({
          data: { fileName: row.fileName },
        })
        onResolvedRef.current(payload)
      } catch (e) {
        // 404 → Response 객체로 던지므로 status 분기로 안내 문구를 갈음.
        if (e instanceof Response && e.status === 404) {
          toast.error('더 이상 라이브러리에 없는 파일입니다')
        } else {
          toast.error('재생 정보를 가져오지 못했습니다')
        }
      } finally {
        setResolvingId(null)
      }
    },
    [resolvingId],
  )

  return { recent, error, resolvingId, playRecent }
}

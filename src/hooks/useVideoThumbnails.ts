import { useEffect, useRef, useState } from 'react'
import { getOrCreateVideoThumbnail } from '~/lib/video-thumbnail'

/**
 * 목록의 비디오 항목에 대한 썸네일 object URL 맵(cacheKey → url)을 만든다.
 *
 * - cacheKey 는 Drive 파일 id(= transcode/thumbnail 캐시 키). 캐시된(트랜스코딩된)
 *   영상만 썸네일이 생기고, 없으면 호출부가 아이콘으로 폴백한다.
 * - 보이는 비디오만 lazy 로 추출하고, 언마운트 시 생성한 object URL 을 revoke 한다.
 *
 * @param items 표시 중인 항목들. id 가 비었거나 isVideo=false 면 건너뛴다.
 */
export function useVideoThumbnails(
  items: { id: string | null | undefined; isVideo: boolean }[],
): Record<string, string> {
  const [thumbs, setThumbs] = useState<Record<string, string>>({})
  const thumbsRef = useRef(thumbs)
  thumbsRef.current = thumbs

  // 비디오 id 목록을 안정적인 문자열 키로 만들어 effect 의존성으로 쓴다
  // (items 배열은 매 렌더 새 참조일 수 있으므로).
  const videoIds = items
    .filter((i) => i.isVideo && i.id)
    .map((i) => i.id as string)
  const depKey = videoIds.join(',')

  useEffect(() => {
    let cancelled = false
    void (async () => {
      for (const id of videoIds) {
        if (cancelled) return
        if (thumbsRef.current[id]) continue
        const blob = await getOrCreateVideoThumbnail(id)
        if (cancelled || !blob) continue
        const url = URL.createObjectURL(blob)
        setThumbs((prev) => {
          if (prev[id]) {
            URL.revokeObjectURL(url)
            return prev
          }
          return { ...prev, [id]: url }
        })
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depKey])

  useEffect(() => {
    return () => {
      for (const url of Object.values(thumbsRef.current)) URL.revokeObjectURL(url)
    }
  }, [])

  return thumbs
}

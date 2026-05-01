import { useRef, useEffect, useCallback, useState } from 'react'
import { usePlayerStore } from '~/stores/player-store'
import { readID3Tags } from '~/lib/id3-reader'
import { toast } from 'sonner'
import type { MediaType } from '~/types'

const VIDEO_EXTS = new Set(['mp4', 'webm', 'mov'])
const AUDIO_EXTS = new Set(['mp3'])

function detectMediaType(fileName: string): MediaType | null {
  const ext = fileName.toLowerCase().split('.').pop() ?? ''
  if (VIDEO_EXTS.has(ext)) return 'video'
  if (AUDIO_EXTS.has(ext)) return 'audio'
  return null
}

export function useMediaPlayer() {
  const mediaRef = useRef<HTMLMediaElement>(null)
  const objectUrlRef = useRef<string | null>(null)
  const rafRef = useRef<number>(0)
  const lastSyncRef = useRef<number>(0)
  const [objectUrl, setObjectUrl] = useState<string | null>(null)

  const store = usePlayerStore
  const mediaType = usePlayerStore((s) => s.mediaType)

  // rAF loop: currentTime 추적 + Zustand 동기화
  const startRafLoop = useCallback(() => {
    const tick = () => {
      const media = mediaRef.current
      if (!media) return

      const now = media.currentTime
      const elapsed = performance.now() - lastSyncRef.current

      // 100ms마다 Zustand에 동기화
      if (elapsed >= 100) {
        store.getState().setCurrentTime(now)

        // 가사 인덱스 업데이트
        const { lyrics, currentLineIndex, setCurrentLineIndex } =
          store.getState()
        if (lyrics && lyrics.lines.length > 0) {
          const newIndex = findLineIndex(lyrics.lines, now)
          if (newIndex !== currentLineIndex) {
            setCurrentLineIndex(newIndex)
          }
        }

        // 구간 반복 경계 감지
        const {
          checkedLines,
          sectionRepeatCount,
          sectionRepeatCurrent,
          setSectionRepeatCurrent,
          duration: dur,
        } = store.getState()
        if (checkedLines.size > 0 && lyrics && lyrics.lines.length > 0) {
          const indices = Array.from(checkedLines)
          const minIdx = Math.min(...indices)
          const maxIdx = Math.max(...indices)
          const sectionStart = lyrics.lines[minIdx].time
          const sectionEnd =
            maxIdx + 1 < lyrics.lines.length
              ? lyrics.lines[maxIdx + 1].time
              : dur

          if (sectionEnd > 0 && now >= sectionEnd) {
            const nextCurrent = sectionRepeatCurrent + 1
            if (nextCurrent < sectionRepeatCount) {
              media.currentTime = sectionStart
              setSectionRepeatCurrent(nextCurrent)
            } else {
              setSectionRepeatCurrent(0)
            }
          }
        }

        lastSyncRef.current = performance.now()
      }

      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [])

  const stopRafLoop = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = 0
    }
  }, [])

  // 이진 탐색으로 현재 가사 라인 인덱스 결정
  function findLineIndex(
    lines: { time: number }[],
    time: number,
  ): number {
    if (lines.length === 0) return -1
    if (time < lines[0].time) return -1

    let lo = 0
    let hi = lines.length - 1
    while (lo <= hi) {
      const mid = (lo + hi) >>> 1
      if (lines[mid].time <= time) {
        lo = mid + 1
      } else {
        hi = mid - 1
      }
    }
    return hi
  }

  const play = useCallback(() => {
    const media = mediaRef.current
    if (!media || !media.src) return
    media.play().then(() => {
      store.getState().setStatus('playing')
      startRafLoop()
    })
  }, [startRafLoop])

  const pause = useCallback(() => {
    const media = mediaRef.current
    if (!media) return
    media.pause()
    store.getState().setStatus('paused')
    stopRafLoop()
  }, [stopRafLoop])

  const stop = useCallback(() => {
    const media = mediaRef.current
    if (!media) return
    media.pause()
    media.currentTime = 0
    store.getState().setStatus('stopped')
    store.getState().setCurrentTime(0)
    store.getState().setCurrentLineIndex(-1)
    stopRafLoop()
  }, [stopRafLoop])

  const seek = useCallback((time: number) => {
    const media = mediaRef.current
    if (!media) return
    const clamped = Math.max(0, Math.min(time, media.duration || 0))
    media.currentTime = clamped
    store.getState().setCurrentTime(clamped)
  }, [])

  const loadFile = useCallback(
    async (file: File) => {
      const newType = detectMediaType(file.name)
      if (!newType) {
        toast.error('지원하지 않는 파일 형식입니다')
        return
      }

      // 기존 재생 정리
      const current = mediaRef.current
      if (current) current.pause()
      stopRafLoop()
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
      }

      // 새 ObjectURL 생성 — src 적용은 useEffect에서 (엘리먼트 교체 대응)
      const url = URL.createObjectURL(file)
      objectUrlRef.current = url
      setObjectUrl(url)

      // ID3 태그는 오디오일 때만 읽기
      const metadata = newType === 'audio' ? await readID3Tags(file) : null
      store.getState().loadTrack(file.name, newType, metadata)
    },
    [stopRafLoop],
  )

  // mediaType/objectUrl 변경 시 활성 엘리먼트에 src 적용
  // (오디오↔비디오 전환 시 ref가 새 엘리먼트로 교체되므로 effect로 처리)
  useEffect(() => {
    const media = mediaRef.current
    if (!media) return
    if (objectUrl) {
      if (media.src !== objectUrl) media.src = objectUrl
    } else {
      media.removeAttribute('src')
      media.load()
    }
  }, [mediaType, objectUrl])

  // media 이벤트 리스너
  useEffect(() => {
    const media = mediaRef.current
    if (!media) return

    const onLoadedMetadata = () => {
      store.getState().setDuration(media.duration)
    }

    const onEnded = () => {
      const { isLooping, checkedLines } = store.getState()
      if (checkedLines.size > 0) return
      if (isLooping) {
        media.currentTime = 0
        media.play()
      } else {
        store.getState().setStatus('stopped')
        store.getState().setCurrentTime(0)
        store.getState().setCurrentLineIndex(-1)
        stopRafLoop()
      }
    }

    const onError = () => {
      const mediaType = store.getState().mediaType
      const msg =
        mediaType === 'video'
          ? '비디오 파일을 재생할 수 없습니다 (H.264/AAC MP4 권장)'
          : '오디오 파일을 재생할 수 없습니다'
      toast.error(msg)
      store.getState().reset()
      stopRafLoop()
    }

    media.addEventListener('loadedmetadata', onLoadedMetadata)
    media.addEventListener('ended', onEnded)
    media.addEventListener('error', onError)

    return () => {
      media.removeEventListener('loadedmetadata', onLoadedMetadata)
      media.removeEventListener('ended', onEnded)
      media.removeEventListener('error', onError)
    }
  }, [stopRafLoop])

  // Zustand volume/muted 동기화
  useEffect(() => {
    const unsub = store.subscribe((state, prev) => {
      const media = mediaRef.current
      if (!media) return
      if (state.volume !== prev.volume) media.volume = state.volume
      if (state.isMuted !== prev.isMuted) media.muted = state.isMuted
    })
    // 초기값 설정
    const media = mediaRef.current
    if (media) {
      media.volume = store.getState().volume
      media.muted = store.getState().isMuted
    }
    return unsub
  }, [])

  // cleanup
  useEffect(() => {
    return () => {
      stopRafLoop()
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
      }
    }
  }, [stopRafLoop])

  return { mediaRef, play, pause, stop, seek, loadFile }
}

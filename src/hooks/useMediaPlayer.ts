import { useRef, useEffect, useCallback } from 'react'
import { usePlayerStore } from '~/stores/player-store'
import { readID3Tags } from '~/lib/id3-reader'
import { transcodeMpgToMp4 } from '~/lib/transcode'
import { toast } from 'sonner'
import type { MediaType } from '~/types'

const VIDEO_EXTS = new Set(['mp4', 'webm', 'mov'])
const AUDIO_EXTS = new Set(['mp3'])
const TRANSCODE_VIDEO_EXTS = new Set(['mpg', 'mpeg'])

function getExt(fileName: string): string {
  return fileName.toLowerCase().split('.').pop() ?? ''
}

function detectMediaType(fileName: string): MediaType | null {
  const ext = getExt(fileName)
  if (VIDEO_EXTS.has(ext) || TRANSCODE_VIDEO_EXTS.has(ext)) return 'video'
  if (AUDIO_EXTS.has(ext)) return 'audio'
  return null
}

function needsTranscode(fileName: string): boolean {
  return TRANSCODE_VIDEO_EXTS.has(getExt(fileName))
}

export function useMediaPlayer() {
  const mediaRef = useRef<HTMLMediaElement>(null)
  const objectUrlRef = useRef<string | null>(null)
  const rafRef = useRef<number>(0)
  const lastSyncRef = useRef<number>(0)

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

      // 비호환 비디오(.mpg/.mpeg)는 ffmpeg.wasm으로 트랜스코딩 후 진행
      let playable = file
      let displayName = file.name
      if (needsTranscode(file.name)) {
        const toastId = toast.loading(
          '비디오 변환 중... (FFmpeg 코어 로드 ~25MB, 첫 사용 시에만)',
        )
        try {
          playable = await transcodeMpgToMp4(file, ({ ratio }) => {
            const pct = Math.round(ratio * 100)
            toast.loading(`비디오 변환 중... ${pct}%`, { id: toastId })
          })
          toast.success('비디오 변환 완료', { id: toastId })
        } catch (err) {
          console.error('transcode failed:', err)
          toast.error('비디오 변환에 실패했습니다', { id: toastId })
          return
        }
      }

      const url = URL.createObjectURL(playable)
      objectUrlRef.current = url

      // 같은 mediaType이면 현재 엘리먼트에 즉시 src 적용 (동기 동작 보장).
      // 다른 mediaType이면 loadTrack이 mediaType을 바꿔 엘리먼트가 교체되며,
      // 아래 useEffect가 새 엘리먼트에 src를 적용한다.
      if (current && store.getState().mediaType === newType) {
        current.src = url
      }

      // ID3 태그는 오디오일 때만 읽기. 표시는 원본 파일명(displayName)을 유지.
      const metadata = newType === 'audio' ? await readID3Tags(file) : null
      store.getState().loadTrack(displayName, newType, metadata)
    },
    [stopRafLoop],
  )

  // media 이벤트 리스너 + ObjectURL 적용을 한 effect로 묶는다.
  // mediaType이 바뀌면 audio↔video 엘리먼트가 교체되며 mediaRef.current가
  // 새 엘리먼트로 갱신되므로 리스너를 새로 붙여야 한다. 또한 listener를
  // src 적용보다 먼저 붙여야 빠르게 발생하는 loadedmetadata/durationchange를
  // 놓치지 않는다.
  useEffect(() => {
    const media = mediaRef.current
    if (!media) return

    const onDurationChange = () => {
      if (Number.isFinite(media.duration)) {
        store.getState().setDuration(media.duration)
      }
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

    media.addEventListener('loadedmetadata', onDurationChange)
    media.addEventListener('durationchange', onDurationChange)
    media.addEventListener('ended', onEnded)
    media.addEventListener('error', onError)

    // 보관해둔 ObjectURL을 새 엘리먼트에 적용 (audio↔video 전환 케이스).
    // 리스너 attach 후에 src를 설정해야 빠른 metadata 이벤트를 받을 수 있다.
    const url = objectUrlRef.current
    if (url && media.src !== url) {
      media.src = url
    } else if (Number.isFinite(media.duration)) {
      // 이미 src가 적용돼 metadata 이벤트가 지나간 케이스(엘리먼트 재마운트
      // 없이 src만 갱신)에서도 store에 반영
      store.getState().setDuration(media.duration)
    }

    return () => {
      media.removeEventListener('loadedmetadata', onDurationChange)
      media.removeEventListener('durationchange', onDurationChange)
      media.removeEventListener('ended', onEnded)
      media.removeEventListener('error', onError)
    }
  }, [stopRafLoop, mediaType])

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

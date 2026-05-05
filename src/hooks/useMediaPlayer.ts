import { useRef, useEffect, useCallback } from 'react'
import { usePlayerStore } from '~/stores/player-store'
import { readID3Tags } from '~/lib/id3-reader'
import { extractEmbeddedSami } from '~/lib/sami-trailer'
import { transcodeToMp4, probeVideoPlayable } from '~/lib/transcode'
import { toast } from 'sonner'
import type { MediaType } from '~/types'

const VIDEO_EXTS = new Set([
  'mp4',
  'webm',
  'mov',
  'mpg',
  'mpeg',
  'm4v',
  'avi',
  'mkv',
  'flv',
  'wmv',
  '3gp',
])
const AUDIO_EXTS = new Set(['mp3'])
// 브라우저가 native로 재생하지 않는 컨테이너 — probe해도 의미 없으므로
// 항상 ffmpeg.wasm으로 변환한다.
const ALWAYS_TRANSCODE_EXTS = new Set([
  'mpg',
  'mpeg',
  'avi',
  'mkv',
  'flv',
  'wmv',
  '3gp',
])

function getExt(fileName: string): string {
  return fileName.toLowerCase().split('.').pop() ?? ''
}

function detectMediaType(fileName: string): MediaType | null {
  const ext = getExt(fileName)
  if (VIDEO_EXTS.has(ext)) return 'video'
  if (AUDIO_EXTS.has(ext)) return 'audio'
  return null
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

        // 구간 반복 경계 감지 (체크된 라인이 있을 때만 의미 있음)
        const {
          checkedLines,
          repeatCount,
          repeatCurrent,
          setRepeatCurrent,
          duration: dur,
        } = store.getState()
        if (
          checkedLines.size > 0 &&
          repeatCount > 0 &&
          lyrics &&
          lyrics.lines.length > 0
        ) {
          const indices = Array.from(checkedLines)
          const minIdx = Math.min(...indices)
          const maxIdx = Math.max(...indices)
          const sectionStart = lyrics.lines[minIdx].time
          const sectionEnd =
            maxIdx + 1 < lyrics.lines.length
              ? lyrics.lines[maxIdx + 1].time
              : dur

          if (sectionEnd > 0 && now >= sectionEnd) {
            const nextCurrent = repeatCurrent + 1
            if (nextCurrent < repeatCount) {
              media.currentTime = sectionStart
              setRepeatCurrent(nextCurrent)
            } else {
              // 마지막 회차 종료 — 체크 자동 해제 (clearCheckedLines가
              // repeatCount/repeatCurrent까지 리셋하므로 다음 tick부터 분기 미진입).
              store.getState().clearCheckedLines()
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

      // Polly-format SAMI 자막 트레일러는 원본 파일 끝부분에 붙어 있다.
      // 트랜스코딩하면 트레일러가 사라지므로 변환 전에 추출한다.
      // 실패/없음은 silent — 일반 미디어 파일에선 기대된 동작.
      const embeddedLyrics = await extractEmbeddedSami(file).catch(() => null)

      // 비호환 비디오는 ffmpeg.wasm으로 H.264/AAC MP4로 트랜스코딩 후 진행.
      // 분류:
      //  - .mpg/.mpeg: 브라우저가 demux 자체를 못하므로 항상 트랜스코딩
      //  - 그 외 비디오(.mp4/.webm/.mov): 컨테이너만 호환이고 안의 코덱이
      //    비호환(예: MPEG-4 Part 2)인 케이스가 있어 먼저 재생 가능 여부를
      //    프로브하고, 실패하면 트랜스코딩
      let playable = file
      const displayName = file.name
      if (newType === 'video') {
        const ext = getExt(file.name)
        const alwaysTranscode = ALWAYS_TRANSCODE_EXTS.has(ext)
        const needs =
          alwaysTranscode || !(await probeVideoPlayable(file))
        if (needs) {
          const toastId = toast.loading(
            '비디오 변환 중... (FFmpeg 코어 로드 ~25MB, 첫 사용 시에만)',
          )
          try {
            playable = await transcodeToMp4(file, ({ ratio }) => {
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

      // 임베디드 SAMI 자막이 있으면 LRC 가사 자리에 채운다.
      // loadTrack이 lyrics를 null로 리셋한 직후에 호출해야 덮이지 않는다.
      if (embeddedLyrics && embeddedLyrics.lines.length > 0) {
        store.getState().loadLyrics(embeddedLyrics)
      }
    },
    [stopRafLoop],
  )

  // 라이브러리(Vercel Blob URL)에서 직접 로드. 트랜스코딩/태그 읽기는 생략.
  // ObjectURL과 동일한 슬롯(objectUrlRef)에 보관 — revokeObjectURL은 일반 URL에
  // 대해선 no-op이므로 안전하게 공유 가능.
  const loadUrl = useCallback(
    (params: { url: string; name: string; mediaType: MediaType }) => {
      const current = mediaRef.current
      if (current) current.pause()
      stopRafLoop()
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
      }
      objectUrlRef.current = params.url
      if (current && store.getState().mediaType === params.mediaType) {
        current.src = params.url
      }
      store.getState().loadTrack(params.name, params.mediaType, null)
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
      // 반복은 체크된 구간이 있을 때만 동작하며 rAF 경계 검출이 처리한다.
      // 트랙이 끝난 시점이면 정상 정지로 처리.
      store.getState().setStatus('stopped')
      store.getState().setCurrentTime(0)
      store.getState().setCurrentLineIndex(-1)
      stopRafLoop()
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

  return { mediaRef, play, pause, stop, seek, loadFile, loadUrl }
}

import { useRef, useEffect, useCallback } from 'react'
import { usePlayerStore } from '~/stores/player-store'
import { readID3Tags } from '~/lib/id3-reader'
import { toast } from 'sonner'

export function useAudioPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null)
  const objectUrlRef = useRef<string | null>(null)
  const rafRef = useRef<number>(0)
  const lastSyncRef = useRef<number>(0)

  const store = usePlayerStore

  // rAF loop: currentTime 추적 + Zustand 동기화
  const startRafLoop = useCallback(() => {
    const tick = () => {
      const audio = audioRef.current
      if (!audio) return

      const now = audio.currentTime
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
              audio.currentTime = sectionStart
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
    const audio = audioRef.current
    if (!audio || !audio.src) return
    audio.play().then(() => {
      store.getState().setStatus('playing')
      startRafLoop()
    })
  }, [startRafLoop])

  const pause = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.pause()
    store.getState().setStatus('paused')
    stopRafLoop()
  }, [stopRafLoop])

  const stop = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.pause()
    audio.currentTime = 0
    store.getState().setStatus('stopped')
    store.getState().setCurrentTime(0)
    store.getState().setCurrentLineIndex(-1)
    stopRafLoop()
  }, [stopRafLoop])

  const seek = useCallback((time: number) => {
    const audio = audioRef.current
    if (!audio) return
    const clamped = Math.max(0, Math.min(time, audio.duration || 0))
    audio.currentTime = clamped
    store.getState().setCurrentTime(clamped)
  }, [])

  const loadFile = useCallback(
    async (file: File) => {
      const audio = audioRef.current
      if (!audio) return

      // 기존 재생 정리
      audio.pause()
      stopRafLoop()
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
      }

      // 새 ObjectURL 생성
      const url = URL.createObjectURL(file)
      objectUrlRef.current = url
      audio.src = url

      // ID3 태그 읽기
      const metadata = await readID3Tags(file)
      store.getState().loadTrack(file.name, 'audio', metadata)
    },
    [stopRafLoop],
  )

  // audio 이벤트 리스너
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onLoadedMetadata = () => {
      store.getState().setDuration(audio.duration)
    }

    const onEnded = () => {
      const { isLooping, checkedLines } = store.getState()
      if (checkedLines.size > 0) return
      if (isLooping) {
        audio.currentTime = 0
        audio.play()
      } else {
        store.getState().setStatus('stopped')
        store.getState().setCurrentTime(0)
        store.getState().setCurrentLineIndex(-1)
        stopRafLoop()
      }
    }

    const onError = () => {
      toast.error('오디오 파일을 재생할 수 없습니다')
      store.getState().reset()
      stopRafLoop()
    }

    audio.addEventListener('loadedmetadata', onLoadedMetadata)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('error', onError)

    return () => {
      audio.removeEventListener('loadedmetadata', onLoadedMetadata)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('error', onError)
    }
  }, [stopRafLoop])

  // Zustand volume/muted 동기화
  useEffect(() => {
    const unsub = store.subscribe((state, prev) => {
      const audio = audioRef.current
      if (!audio) return
      if (state.volume !== prev.volume) audio.volume = state.volume
      if (state.isMuted !== prev.isMuted) audio.muted = state.isMuted
    })
    // 초기값 설정
    const audio = audioRef.current
    if (audio) {
      audio.volume = store.getState().volume
      audio.muted = store.getState().isMuted
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

  return { audioRef, play, pause, stop, seek, loadFile }
}

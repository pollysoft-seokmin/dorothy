import { create } from 'zustand'
import type { MediaType, PlayStatus, TrackMetadata, ParsedLyrics } from '~/types'

// 0 = off, 그 외 값은 N회 반복. 사이클 순서를 데이터로 표현해 UI/스토어가 공유.
export const REPEAT_CYCLE = [0, 2, 5] as const
export type RepeatCount = (typeof REPEAT_CYCLE)[number]

export interface PlayerStore {
  // 재생 상태
  status: PlayStatus
  currentTime: number
  duration: number
  volume: number
  isMuted: boolean

  // 파일 정보
  fileName: string
  mediaType: MediaType
  metadata: TrackMetadata | null

  // 가사
  lyrics: ParsedLyrics | null
  currentLineIndex: number

  // 반복 (구간이 선택돼 있으면 구간에, 아니면 전체 트랙에 적용)
  checkedLines: Set<number>
  repeatCount: RepeatCount
  repeatCurrent: number

  // 액션
  setStatus: (status: PlayStatus) => void
  setCurrentTime: (time: number) => void
  setDuration: (duration: number) => void
  setVolume: (volume: number) => void
  toggleMute: () => void
  cycleRepeat: () => void
  loadTrack: (
    fileName: string,
    mediaType: MediaType,
    metadata: TrackMetadata | null,
  ) => void
  loadLyrics: (lyrics: ParsedLyrics) => void
  setCurrentLineIndex: (index: number) => void
  toggleCheckedLine: (index: number) => void
  clearCheckedLines: () => void
  setRepeatCurrent: (current: number) => void
  reset: () => void
}

function nextRepeat(current: RepeatCount): RepeatCount {
  const i = REPEAT_CYCLE.indexOf(current)
  return REPEAT_CYCLE[(i + 1) % REPEAT_CYCLE.length]
}

export const usePlayerStore = create<PlayerStore>((set) => ({
  status: 'idle',
  currentTime: 0,
  duration: 0,
  volume: 0.8,
  isMuted: false,
  fileName: '',
  mediaType: 'audio',
  metadata: null,
  lyrics: null,
  currentLineIndex: -1,
  checkedLines: new Set<number>(),
  repeatCount: 0,
  repeatCurrent: 0,

  setStatus: (status) => set({ status }),
  setCurrentTime: (currentTime) => set({ currentTime }),
  setDuration: (duration) => set({ duration }),
  setVolume: (volume) => set({ volume }),
  toggleMute: () => set((s) => ({ isMuted: !s.isMuted })),
  cycleRepeat: () =>
    set((s) => ({ repeatCount: nextRepeat(s.repeatCount), repeatCurrent: 0 })),
  loadTrack: (fileName, mediaType, metadata) =>
    set({
      fileName,
      mediaType,
      metadata,
      status: 'idle',
      currentTime: 0,
      duration: 0,
      lyrics: null,
      currentLineIndex: -1,
      checkedLines: new Set<number>(),
      repeatCount: 0,
      repeatCurrent: 0,
    }),
  loadLyrics: (lyrics) =>
    set({
      lyrics,
      currentLineIndex: -1,
      checkedLines: new Set<number>(),
      repeatCount: 0,
      repeatCurrent: 0,
    }),
  setCurrentLineIndex: (index) => set({ currentLineIndex: index }),
  // 빈 상태에서 첫 체크가 들어오면 반복을 2x로 자동 설정해 세션을 연다.
  // 모두 풀리면 0으로 리셋해 버튼 disabled 상태와 카운트 표시를 일치.
  toggleCheckedLine: (index) =>
    set((s) => {
      const next = new Set(s.checkedLines)
      const isFirstCheck = !next.has(index) && s.checkedLines.size === 0
      if (next.has(index)) next.delete(index)
      else next.add(index)
      let repeatCount: RepeatCount = s.repeatCount
      if (next.size === 0) repeatCount = 0
      else if (isFirstCheck) repeatCount = 2
      return {
        checkedLines: next,
        repeatCount,
        repeatCurrent: 0,
      }
    }),
  clearCheckedLines: () =>
    set({ checkedLines: new Set<number>(), repeatCount: 0, repeatCurrent: 0 }),
  setRepeatCurrent: (current) => set({ repeatCurrent: current }),
  reset: () =>
    set({
      status: 'idle',
      currentTime: 0,
      duration: 0,
      fileName: '',
      mediaType: 'audio',
      metadata: null,
      lyrics: null,
      currentLineIndex: -1,
      checkedLines: new Set<number>(),
      repeatCount: 0,
      repeatCurrent: 0,
    }),
}))

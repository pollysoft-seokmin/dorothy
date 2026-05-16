import { create } from 'zustand'
import type { MediaType, PlayStatus, TrackMetadata, ParsedLyrics } from '~/types'

// 0 = off, 그 외 값은 N회 반복. 사이클 순서를 데이터로 표현해 UI/스토어가 공유.
export const REPEAT_CYCLE = [0, 2, 5] as const
export type RepeatCount = (typeof REPEAT_CYCLE)[number]

// 가사 표시 언어 토글. SAMI 자막에서만 의미를 가지며 사용자 환경설정으로
// DB에 영구 저장된다(personalization). LRC 가사는 항상 text 그대로 표시.
export const LYRICS_LANGUAGE_CYCLE = ['en-ko', 'en', 'ko'] as const
export type LyricsLanguage = (typeof LYRICS_LANGUAGE_CYCLE)[number]

// 라인 마스킹 상태: 0=expose-none(전부 가림), 1=expose-short(첫 3글자), 2=expose-all(전체 노출).
// 전체 토글(globalLineMask)과 라인별 override(lineMaskStates) 모두 이 도메인을 사용한다.
export type LineMaskState = 0 | 1 | 2

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
  lyricsLoading: boolean

  // 반복 (구간이 선택돼 있으면 구간에, 아니면 전체 트랙에 적용)
  checkedLines: Set<number>
  repeatCount: RepeatCount
  repeatCurrent: number

  // 라인 마스킹 — 라인별 override 맵. entry가 있으면 globalLineMask보다 우선.
  // 토글 순환 0 → 1 → 2 → 0. 모든 라인이 globalLineMask와 동일하면 빈 맵.
  // (entry로 0을 명시 저장할 수 있어야 globalLineMask가 1/2일 때 특정 라인만 가릴 수 있음)
  lineMaskStates: Map<number, LineMaskState>

  // 가사 전체 노출 상태. 라인별 override가 없는 라인에 적용되는 기본 상태.
  // 전체 토글 버튼이 변경하며, 변경 시 lineMaskStates는 초기화되어 모든 라인이 균일해짐.
  // 새 트랙/가사 로드 시 0으로 초기화.
  globalLineMask: LineMaskState

  // 가사 표시 언어 — SAMI 자막에서만 적용. 사용자 환경설정으로 영구 저장되므로
  // 트랙/가사 로드/reset에서는 초기화하지 않는다.
  lyricsLanguage: LyricsLanguage

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
  setLyricsLoading: (loading: boolean) => void
  setCurrentLineIndex: (index: number) => void
  toggleCheckedLine: (index: number) => void
  clearCheckedLines: () => void
  setRepeatCurrent: (current: number) => void
  cycleLineMask: (index: number) => void
  cycleGlobalLineMask: () => void
  cycleLyricsLanguage: () => void
  setLyricsLanguage: (language: LyricsLanguage) => void
  reset: () => void
}

function nextRepeat(current: RepeatCount): RepeatCount {
  const i = REPEAT_CYCLE.indexOf(current)
  return REPEAT_CYCLE[(i + 1) % REPEAT_CYCLE.length]
}

function nextLyricsLanguage(current: LyricsLanguage): LyricsLanguage {
  const i = LYRICS_LANGUAGE_CYCLE.indexOf(current)
  return LYRICS_LANGUAGE_CYCLE[(i + 1) % LYRICS_LANGUAGE_CYCLE.length]
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
  lyricsLoading: false,
  checkedLines: new Set<number>(),
  repeatCount: 0,
  repeatCurrent: 0,
  lineMaskStates: new Map<number, LineMaskState>(),
  globalLineMask: 0,
  lyricsLanguage: 'en-ko',

  setStatus: (status) => set({ status }),
  setCurrentTime: (currentTime) => set({ currentTime }),
  setDuration: (duration) => set({ duration }),
  setVolume: (volume) => set({ volume }),
  toggleMute: () => set((s) => ({ isMuted: !s.isMuted })),
  cycleRepeat: () =>
    set((s) => {
      const next = nextRepeat(s.repeatCount)
      // OFF로 돌아오면 체크된 가사도 함께 해제 — 사용자가 "반복 끔"을 명시한 시점이므로
      // 잔존 체크가 다음 첫 체크 시 자동 진입 로직과 부딪치지 않도록 정리한다.
      if (next === 0) {
        return {
          repeatCount: next,
          repeatCurrent: 0,
          checkedLines: new Set<number>(),
        }
      }
      return { repeatCount: next, repeatCurrent: 0 }
    }),
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
      lyricsLoading: true,
      checkedLines: new Set<number>(),
      repeatCount: 0,
      repeatCurrent: 0,
      lineMaskStates: new Map<number, LineMaskState>(),
      globalLineMask: 0,
    }),
  loadLyrics: (lyrics) =>
    set({
      lyrics,
      currentLineIndex: -1,
      lyricsLoading: false,
      checkedLines: new Set<number>(),
      repeatCount: 0,
      repeatCurrent: 0,
      lineMaskStates: new Map<number, LineMaskState>(),
      globalLineMask: 0,
    }),
  setLyricsLoading: (loading) => set({ lyricsLoading: loading }),
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
  // 토글 순환 0 → 1 → 2 → 0. globalLineMask가 0이 아닐 때 라인을 강제로 0(가림)으로
  // 만드는 경우가 있으므로 entry를 삭제하지 않고 항상 명시적으로 저장한다.
  cycleLineMask: (index) =>
    set((s) => {
      const current = s.lineMaskStates.get(index) ?? s.globalLineMask
      const nextState = ((current + 1) % 3) as LineMaskState
      const next = new Map(s.lineMaskStates)
      next.set(index, nextState)
      return { lineMaskStates: next }
    }),
  // 전체 토글: globalLineMask를 다음 상태로 순환시키고, 라인별 override를 모두 비워
  // 사용자의 "전체에 적용" 의도를 충실히 반영한다.
  cycleGlobalLineMask: () =>
    set((s) => ({
      globalLineMask: ((s.globalLineMask + 1) % 3) as LineMaskState,
      lineMaskStates: new Map<number, LineMaskState>(),
    })),
  cycleLyricsLanguage: () =>
    set((s) => ({ lyricsLanguage: nextLyricsLanguage(s.lyricsLanguage) })),
  setLyricsLanguage: (language) => set({ lyricsLanguage: language }),
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
      lyricsLoading: false,
      checkedLines: new Set<number>(),
      repeatCount: 0,
      repeatCurrent: 0,
      lineMaskStates: new Map<number, LineMaskState>(),
      globalLineMask: 0,
    }),
}))

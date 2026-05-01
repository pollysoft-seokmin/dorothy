import { create } from 'zustand'
import type { PlayStatus, TrackMetadata, ParsedLyrics } from '~/types'

export interface PlayerStore {
  // 재생 상태
  status: PlayStatus
  currentTime: number
  duration: number
  volume: number
  isMuted: boolean
  isLooping: boolean

  // 파일 정보
  fileName: string
  metadata: TrackMetadata | null

  // 가사
  lyrics: ParsedLyrics | null
  currentLineIndex: number

  // 구간 반복
  checkedLines: Set<number>
  sectionRepeatCount: number
  sectionRepeatCurrent: number

  // 액션
  setStatus: (status: PlayStatus) => void
  setCurrentTime: (time: number) => void
  setDuration: (duration: number) => void
  setVolume: (volume: number) => void
  toggleMute: () => void
  toggleLoop: () => void
  loadTrack: (fileName: string, metadata: TrackMetadata | null) => void
  loadLyrics: (lyrics: ParsedLyrics) => void
  setCurrentLineIndex: (index: number) => void
  toggleCheckedLine: (index: number) => void
  clearCheckedLines: () => void
  setSectionRepeatCount: (count: number) => void
  setSectionRepeatCurrent: (current: number) => void
  reset: () => void
}

export const usePlayerStore = create<PlayerStore>((set) => ({
  status: 'idle',
  currentTime: 0,
  duration: 0,
  volume: 0.8,
  isMuted: false,
  isLooping: false,
  fileName: '',
  metadata: null,
  lyrics: null,
  currentLineIndex: -1,
  checkedLines: new Set<number>(),
  sectionRepeatCount: 2,
  sectionRepeatCurrent: 0,

  setStatus: (status) => set({ status }),
  setCurrentTime: (currentTime) => set({ currentTime }),
  setDuration: (duration) => set({ duration }),
  setVolume: (volume) => set({ volume }),
  toggleMute: () => set((s) => ({ isMuted: !s.isMuted })),
  toggleLoop: () => set((s) => ({ isLooping: !s.isLooping })),
  loadTrack: (fileName, metadata) =>
    set({
      fileName,
      metadata,
      status: 'idle',
      currentTime: 0,
      duration: 0,
      lyrics: null,
      currentLineIndex: -1,
      checkedLines: new Set<number>(),
      sectionRepeatCurrent: 0,
    }),
  loadLyrics: (lyrics) =>
    set({ lyrics, currentLineIndex: -1, checkedLines: new Set<number>(), sectionRepeatCurrent: 0 }),
  setCurrentLineIndex: (index) => set({ currentLineIndex: index }),
  toggleCheckedLine: (index) =>
    set((s) => {
      const next = new Set(s.checkedLines)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return { checkedLines: next, sectionRepeatCurrent: 0 }
    }),
  clearCheckedLines: () =>
    set({ checkedLines: new Set<number>(), sectionRepeatCurrent: 0 }),
  setSectionRepeatCount: (count) =>
    set({ sectionRepeatCount: Math.max(1, Math.min(10, count)), sectionRepeatCurrent: 0 }),
  setSectionRepeatCurrent: (current) => set({ sectionRepeatCurrent: current }),
  reset: () =>
    set({
      status: 'idle',
      currentTime: 0,
      duration: 0,
      fileName: '',
      metadata: null,
      lyrics: null,
      currentLineIndex: -1,
      checkedLines: new Set<number>(),
      sectionRepeatCount: 2,
      sectionRepeatCurrent: 0,
    }),
}))

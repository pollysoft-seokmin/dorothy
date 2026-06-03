import { create } from 'zustand'
import type { PendingItem } from '~/components/library/library-shared'

// 업로드 진행 상태(pending)를 전역으로 둔다 — 라이브러리(요약 셀)와 헤더(원형
// 진행 링)가 같은 소스를 읽기 위함. setItems 는 useState 의 setter 와 동일한
// 시그니처라 기존 setPending((prev) => ...) 호출을 그대로 옮길 수 있다.
type Updater = PendingItem[] | ((prev: PendingItem[]) => PendingItem[])

interface UploadStore {
  items: PendingItem[]
  setItems: (updater: Updater) => void
}

export const useUploadStore = create<UploadStore>((set) => ({
  items: [],
  setItems: (updater) =>
    set((s) => ({
      items: typeof updater === 'function' ? updater(s.items) : updater,
    })),
}))

import { create } from 'zustand'

// AuthHeader(__root.tsx)와 index 라우트가 서로 다른 트리에 있어 trigger와 panel을
// 직접 연결할 수 없다. drawer 열림 상태만 공유 store로 두고, panel 자체는 player
// 상태가 사는 index에서 마운트한다.
interface UiStore {
  isMobileLibraryOpen: boolean
  openMobileLibrary: () => void
  closeMobileLibrary: () => void
  toggleMobileLibrary: () => void
}

export const useUiStore = create<UiStore>((set) => ({
  isMobileLibraryOpen: false,
  openMobileLibrary: () => set({ isMobileLibraryOpen: true }),
  closeMobileLibrary: () => set({ isMobileLibraryOpen: false }),
  toggleMobileLibrary: () =>
    set((s) => ({ isMobileLibraryOpen: !s.isMobileLibraryOpen })),
}))

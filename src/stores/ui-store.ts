import { create } from 'zustand'

// AuthHeader(__root.tsx)와 index 라우트가 서로 다른 트리에 있어 trigger와 panel을
// 직접 연결할 수 없다. 모달/드로어 열림 상태만 공유 store로 두고, panel 자체는
// 적절한 위치(panel 데이터가 있는 트리)에서 마운트한다.
interface UiStore {
  isMobileLibraryOpen: boolean
  openMobileLibrary: () => void
  closeMobileLibrary: () => void
  toggleMobileLibrary: () => void

  // 모바일 계정 bottom sheet — 헤더 우측 아바타 탭으로 열린다. 데스크톱은
  // 기존 /account 라우트를 유지하므로 lg 미만 폭에서만 의미를 갖는다.
  isAccountSheetOpen: boolean
  openAccountSheet: () => void
  closeAccountSheet: () => void
}

export const useUiStore = create<UiStore>((set) => ({
  isMobileLibraryOpen: false,
  openMobileLibrary: () => set({ isMobileLibraryOpen: true }),
  closeMobileLibrary: () => set({ isMobileLibraryOpen: false }),
  toggleMobileLibrary: () =>
    set((s) => ({ isMobileLibraryOpen: !s.isMobileLibraryOpen })),

  isAccountSheetOpen: false,
  openAccountSheet: () => set({ isAccountSheetOpen: true }),
  closeAccountSheet: () => set({ isAccountSheetOpen: false }),
}))

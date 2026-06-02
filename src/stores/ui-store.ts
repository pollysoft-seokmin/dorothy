import { create } from 'zustand'

// AuthHeader(__root.tsx)와 index 라우트가 서로 다른 트리에 있어 trigger와 panel을
// 직접 연결할 수 없다. 모달/드로어 열림 상태만 공유 store로 두고, panel 자체는
// 적절한 위치(panel 데이터가 있는 트리)에서 마운트한다.

interface UiStore {
  isMobileLibraryOpen: boolean
  openMobileLibrary: () => void
  closeMobileLibrary: () => void
  toggleMobileLibrary: () => void

  // 데스크톱 "내 미디어" 패널 표시 여부. 모바일 드로어와 달리 기본 열림 상태로,
  // 타이틀의 Library 토글 버튼으로 보였다/숨겼다 한다 (#100).
  isDesktopLibraryOpen: boolean
  toggleDesktopLibrary: () => void
  closeDesktopLibrary: () => void

  // 계정 정보(프로필 + 스토리지 + 최근 재생) 열림 상태 — 같은 슬라이스로
  // 모바일=Bottom Sheet, 데스크톱=중앙 모달이 분기된다. 슬라이스명은 모바일이
  // 먼저 만들어진 역사를 반영해 isAccountSheet 그대로 유지.
  isAccountSheetOpen: boolean
  openAccountSheet: () => void
  closeAccountSheet: () => void

  // 비로그인 상태에서 상단 "+" 버튼이 미디어 파일 선택을 요청하는 일회성 신호.
  // FileDropZone(player 트리)이 nonce 변화를 감지해 파일 선택창을 연다 (#105).
  mediaPickNonce: number
  requestMediaPick: () => void
}

export const useUiStore = create<UiStore>((set) => ({
  isMobileLibraryOpen: false,
  openMobileLibrary: () => set({ isMobileLibraryOpen: true }),
  closeMobileLibrary: () => set({ isMobileLibraryOpen: false }),
  toggleMobileLibrary: () =>
    set((s) => ({ isMobileLibraryOpen: !s.isMobileLibraryOpen })),

  isDesktopLibraryOpen: true,
  toggleDesktopLibrary: () =>
    set((s) => ({ isDesktopLibraryOpen: !s.isDesktopLibraryOpen })),
  closeDesktopLibrary: () => set({ isDesktopLibraryOpen: false }),

  isAccountSheetOpen: false,
  openAccountSheet: () => set({ isAccountSheetOpen: true }),
  closeAccountSheet: () => set({ isAccountSheetOpen: false }),

  mediaPickNonce: 0,
  requestMediaPick: () => set((s) => ({ mediaPickNonce: s.mediaPickNonce + 1 })),
}))

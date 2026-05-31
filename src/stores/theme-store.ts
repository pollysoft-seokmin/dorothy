import { create } from 'zustand'
import {
  applyTheme,
  readStoredTheme,
  storeTheme,
  type Theme,
} from '~/lib/theme'

// SSR 안전을 위해 기본은 'system' 으로 시작하고, 클라이언트 마운트 시 init()
// 이 localStorage 값으로 하이드레이트한다. 페이지 색상 FOUC 는 __root.tsx 의
// 사전 적용 스크립트가 막으므로, 여기서는 컨트롤 상태 동기화만 담당 (#107).
interface ThemeStore {
  theme: Theme
  setTheme: (theme: Theme) => void
  init: () => void
}

export const useThemeStore = create<ThemeStore>((set) => ({
  theme: 'system',
  setTheme: (theme) => {
    applyTheme(theme)
    storeTheme(theme)
    set({ theme })
  },
  init: () => {
    const theme = readStoredTheme()
    applyTheme(theme)
    set({ theme })
  },
}))

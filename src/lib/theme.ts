// 테마 선택/적용 헬퍼. 'system' 은 OS 의 prefers-color-scheme 를 따른다.
// 적용은 <html> 의 .dark 클래스 토글 + color-scheme 로 한다 (#107).

export type Theme = 'system' | 'light' | 'dark'

export const THEME_STORAGE_KEY = 'dorothy-theme'

export function isTheme(v: unknown): v is Theme {
  return v === 'system' || v === 'light' || v === 'dark'
}

// 선택한 테마가 실제로 다크인지 — system 이면 OS 설정을 본다.
export function resolveDark(theme: Theme): boolean {
  if (theme === 'dark') return true
  if (theme === 'light') return false
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  )
}

export function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return
  const dark = resolveDark(theme)
  document.documentElement.classList.toggle('dark', dark)
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
}

export function readStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'system'
  try {
    const v = window.localStorage.getItem(THEME_STORAGE_KEY)
    return isTheme(v) ? v : 'system'
  } catch {
    return 'system'
  }
}

export function storeTheme(theme: Theme): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // localStorage 접근 불가(프라이빗 모드 등) — 적용만 하고 저장은 건너뛴다.
  }
}

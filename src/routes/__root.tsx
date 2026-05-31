import { useEffect } from 'react'
import {
  Outlet,
  HeadContent,
  Scripts,
  createRootRoute,
} from '@tanstack/react-router'
import { Toaster } from 'sonner'
import { AuthHeader } from '~/components/auth/AuthHeader'
import { MobileAccountSheet } from '~/components/account/MobileAccountSheet'
import { DesktopAccountModal } from '~/components/account/DesktopAccountModal'
import { useThemeStore } from '~/stores/theme-store'
import { usePlayerStore } from '~/stores/player-store'
import { applyTheme, THEME_STORAGE_KEY } from '~/lib/theme'
import appCss from '~/styles/app.css?url'

// 하이드레이션 전에 동기 실행돼 저장된 테마를 <html> 에 적용 — 라이트/다크
// 전환 시 첫 페인트 FOUC 를 막는다 (#107).
const themeInitScript = `(function(){try{var t=localStorage.getItem('${THEME_STORAGE_KEY}')||'system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);document.documentElement.style.colorScheme=d?'dark':'light';}catch(e){}})();`

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Dorothy' },
      {
        name: 'description',
        content: 'Local MP3 Player with Lyrics',
      },
    ],
    links: [
      { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossOrigin: 'anonymous',
      },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap',
      },
      { rel: 'stylesheet', href: appCss },
    ],
  }),
  component: RootDocument,
})

function RootDocument() {
  // 마운트 시 store 를 localStorage 값으로 하이드레이트하고, theme='system'
  // 인 동안 OS 다크모드 변경에 반응한다.
  useEffect(() => {
    useThemeStore.getState().init()
    usePlayerStore.getState().initPlaybackPrefs()
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => {
      if (useThemeStore.getState().theme === 'system') applyTheme('system')
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return (
    <html lang="ko">
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="h-dvh overflow-hidden bg-background text-foreground antialiased flex flex-col">
        <AuthHeader />
        {/* body는 뷰포트에 고정, 이 래퍼만 내부 스크롤. 모바일/데스크톱 통일된
            앱 셸 레이아웃. 짧은 라우트(/login 등)는 내부 빈 공간만 생기고,
            긴 라우트는 컨테이너만 스크롤되어 페이지 자체는 움직이지 않는다. */}
        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col">
          <Outlet />
        </div>
        {/* 계정 팝업 — 같은 isAccountSheetOpen 슬라이스로 모바일은 Bottom Sheet,
            데스크톱은 중앙 모달이 뜬다. lg breakpoint로 두 컴포넌트가 자동 분기되어
            한 시점에 하나만 보인다. */}
        <MobileAccountSheet />
        <DesktopAccountModal />
        <Toaster richColors closeButton position="bottom-center" />
        <Scripts />
      </body>
    </html>
  )
}

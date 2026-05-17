import {
  Outlet,
  HeadContent,
  Scripts,
  createRootRoute,
} from '@tanstack/react-router'
import { Toaster } from 'sonner'
import { AuthHeader } from '~/components/auth/AuthHeader'
import appCss from '~/styles/app.css?url'

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
      { rel: 'stylesheet', href: appCss },
    ],
  }),
  component: RootDocument,
})

function RootDocument() {
  return (
    <html lang="ko">
      <head>
        <HeadContent />
      </head>
      <body className="h-dvh overflow-hidden bg-background text-foreground antialiased flex flex-col">
        <AuthHeader />
        {/* body는 뷰포트에 고정, 이 래퍼만 내부 스크롤. 모바일/데스크톱 통일된
            앱 셸 레이아웃. 짧은 라우트(/login 등)는 내부 빈 공간만 생기고,
            긴 라우트는 컨테이너만 스크롤되어 페이지 자체는 움직이지 않는다. */}
        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col">
          <Outlet />
        </div>
        <Toaster richColors closeButton position="bottom-center" />
        <Scripts />
      </body>
    </html>
  )
}

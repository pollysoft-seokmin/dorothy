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
      <body className="h-dvh overflow-hidden sm:h-auto sm:overflow-visible sm:min-h-screen bg-background text-foreground antialiased flex flex-col">
        <AuthHeader />
        {/* 모바일: 본문 자체는 뷰포트에 고정되고 이 래퍼만 내부 스크롤을 가진다.
            데스크톱: 일반 흐름으로 되돌려 페이지 스크롤이 원래대로 동작. */}
        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col sm:flex-initial sm:min-h-0 sm:overflow-visible">
          <Outlet />
        </div>
        <Toaster richColors closeButton position="bottom-center" />
        <Scripts />
      </body>
    </html>
  )
}

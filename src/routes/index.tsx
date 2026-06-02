import { useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { AudioPlayer } from '~/components/player/AudioPlayer'
import { MediaLibrary } from '~/components/library/MediaLibrary'
import { MobileLibrarySheet } from '~/components/library/MobileLibrarySheet'
import { useMediaPlayer } from '~/hooks/useMediaPlayer'
import { useSession } from '~/lib/auth-client'
import { useUiStore } from '~/stores/ui-store'

export const Route = createFileRoute('/')({
  component: Home,
})

// 데스크톱 aside는 `hidden lg:flex`로 CSS 숨김 처리만 하면 React상 항상
// 마운트되어 모바일에서도 useEffect가 fetch를 쏘게 된다. 모바일 폭에서
// 드로어와 동시 마운트되면 동일 server fn이 두 군데서 병렬 호출되어 race
// 가능성이 생기므로, JS로 뷰포트를 본 뒤 lg 이상에서만 마운트한다.
function useIsLgUp(): boolean {
  const [isLgUp, setIsLgUp] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    setIsLgUp(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setIsLgUp(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return isLgUp
}

function Home() {
  const player = useMediaPlayer()
  const { data: session } = useSession()
  const userId = session?.user?.id ?? null
  const isLgUp = useIsLgUp()

  const isDesktopLibraryOpen = useUiStore((s) => s.isDesktopLibraryOpen)

  return (
    <main className="relative flex-1 min-h-0 flex">
      {/* 플레이어는 항상 풀폭으로 제자리에 둔다. 라이브러리는 더 이상 flex
          형제로 폭을 차지하지 않으므로 토글해도 재생 화면이 reflow 되지 않는다. */}
      <div className="flex-1 flex items-stretch justify-center min-w-0">
        <AudioPlayer player={player} isLoggedIn={!!userId} />
      </div>
      {userId && isLgUp && (
        // 좌측 도킹 floating 패널 — push 대신 재생 화면 위로 슬라이드 인/아웃 (#118).
        // 열림/닫힘 transition 을 위해 상시 마운트하고 isDesktopLibraryOpen 으로
        // translate-x 만 토글한다(재오픈 시 재fetch 방지 + 폴더/탭 상태 보존).
        // 스크림 없음 — 재생 화면을 가리지 않고 그대로 보이게 한다.
        // bg-card(#121212) + border-r + 우측 그림자로 본문(#000) 위에 떠 보인다.
        // 디자인 명세 폭 340. 닫힘 상태(-translate-x-full)에선 그림자 누수를
        // 막기 위해 shadow 를 끄고 pointer-events 를 비활성화한다(#88 패턴).
        <aside
          aria-hidden={!isDesktopLibraryOpen}
          className={`absolute inset-y-0 left-0 z-30 flex w-[340px] flex-col overflow-hidden border-r bg-card transition-transform duration-250 ease-out ${
            isDesktopLibraryOpen
              ? 'translate-x-0 shadow-[6px_0_18px_-10px_rgba(0,0,0,0.35)]'
              : '-translate-x-full pointer-events-none'
          }`}
        >
          <MediaLibrary userId={userId} onPlay={player.loadUrl} />
        </aside>
      )}
      {userId && <MobileLibrarySheet userId={userId} onPlay={player.loadUrl} />}
    </main>
  )
}

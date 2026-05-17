import { useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { AudioPlayer } from '~/components/player/AudioPlayer'
import { MediaLibrary } from '~/components/library/MediaLibrary'
import { MobileLibraryDrawer } from '~/components/library/MobileLibraryDrawer'
import { useMediaPlayer } from '~/hooks/useMediaPlayer'
import { useSession } from '~/lib/auth-client'

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

  return (
    <main className="min-h-screen flex">
      <div className="flex-1 flex items-start justify-center min-w-0">
        <AudioPlayer player={player} isLoggedIn={!!userId} />
      </div>
      {userId && isLgUp && (
        <aside className="flex w-96 border-l flex-col h-screen sticky top-0">
          <MediaLibrary userId={userId} onPlay={player.loadUrl} />
        </aside>
      )}
      {userId && <MobileLibraryDrawer userId={userId} onPlay={player.loadUrl} />}
    </main>
  )
}

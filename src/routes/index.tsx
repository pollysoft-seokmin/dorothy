import { createFileRoute } from '@tanstack/react-router'
import { AudioPlayer } from '~/components/player/AudioPlayer'
import { MediaLibrary } from '~/components/library/MediaLibrary'
import { useMediaPlayer } from '~/hooks/useMediaPlayer'
import { useSession } from '~/lib/auth-client'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  const player = useMediaPlayer()
  const { data: session } = useSession()
  const userId = session?.user?.id ?? null

  return (
    <main className="min-h-screen flex">
      <div className="flex-1 flex items-start justify-center min-w-0">
        <AudioPlayer player={player} isLoggedIn={!!userId} />
      </div>
      {userId && (
        <aside className="hidden lg:flex w-96 border-l flex-col h-screen sticky top-0">
          <MediaLibrary userId={userId} onPlay={player.loadUrl} />
        </aside>
      )}
    </main>
  )
}

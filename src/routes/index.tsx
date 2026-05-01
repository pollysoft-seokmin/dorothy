import { createFileRoute } from '@tanstack/react-router'
import { AudioPlayer } from '~/components/player/AudioPlayer'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  return (
    <main className="min-h-screen flex items-start justify-center">
      <AudioPlayer />
    </main>
  )
}

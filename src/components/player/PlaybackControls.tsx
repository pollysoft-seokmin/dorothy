import { Play, Pause } from 'lucide-react'
import { Button } from '~/components/ui/button'
import type { PlayStatus } from '~/types'

interface PlaybackControlsProps {
  status: PlayStatus
  disabled: boolean
  onPlay: () => void
  onPause: () => void
}

export function PlaybackControls({
  status,
  disabled,
  onPlay,
  onPause,
}: PlaybackControlsProps) {
  const isPlaying = status === 'playing'

  // Button 기본 스타일이 [&_svg]:size-4 로 자식 SVG를 강제하므로 `!`로 우선순위
  // 끌어올린 size-15(3.75rem = 60px)를 별도 selector로 적용해 3배 크기 보장.
  return (
    <Button
      variant="ghost"
      size="icon"
      disabled={disabled}
      onClick={isPlaying ? onPause : onPlay}
      aria-label={isPlaying ? '일시정지' : '재생'}
      className="h-30 w-30 [&_svg]:!size-15"
    >
      {isPlaying ? <Pause /> : <Play />}
    </Button>
  )
}

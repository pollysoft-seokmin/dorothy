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
  // 끌어올린 size-10(2.5rem = 40px)을 별도 selector로 적용. 원본 h-10 / h-5 의 2배.
  return (
    <Button
      variant="ghost"
      size="icon"
      disabled={disabled}
      onClick={isPlaying ? onPause : onPlay}
      aria-label={isPlaying ? '일시정지' : '재생'}
      className="h-20 w-20 [&_svg]:!size-10"
    >
      {isPlaying ? <Pause /> : <Play />}
    </Button>
  )
}

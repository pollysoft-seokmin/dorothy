import { Play, Pause, Square, Repeat } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { cn } from '~/lib/utils'
import type { PlayStatus } from '~/types'

interface PlaybackControlsProps {
  status: PlayStatus
  isLooping: boolean
  disabled: boolean
  onPlay: () => void
  onPause: () => void
  onStop: () => void
  onToggleLoop: () => void
}

export function PlaybackControls({
  status,
  isLooping,
  disabled,
  onPlay,
  onPause,
  onStop,
  onToggleLoop,
}: PlaybackControlsProps) {
  const isPlaying = status === 'playing'

  return (
    <div className="flex items-center justify-center gap-2">
      {/* Repeat 토글 */}
      <Button
        variant="ghost"
        size="icon"
        disabled={disabled}
        onClick={onToggleLoop}
        aria-label="반복 재생"
        className={cn(isLooping && 'text-primary')}
      >
        <Repeat className="h-4 w-4" />
      </Button>

      {/* Play / Pause 토글 */}
      <Button
        variant="ghost"
        size="icon"
        disabled={disabled}
        onClick={isPlaying ? onPause : onPlay}
        aria-label={isPlaying ? '일시정지' : '재생'}
        className="h-10 w-10"
      >
        {isPlaying ? (
          <Pause className="h-5 w-5" />
        ) : (
          <Play className="h-5 w-5" />
        )}
      </Button>

      {/* Stop */}
      <Button
        variant="ghost"
        size="icon"
        disabled={disabled}
        onClick={onStop}
        aria-label="정지"
      >
        <Square className="h-4 w-4" />
      </Button>
    </div>
  )
}

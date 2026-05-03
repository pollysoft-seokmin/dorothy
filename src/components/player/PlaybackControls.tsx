import { Play, Pause, Square, Repeat, RepeatOff } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { cn } from '~/lib/utils'
import type { PlayStatus } from '~/types'

interface PlaybackControlsProps {
  status: PlayStatus
  repeatCount: number
  hasCheckedLines: boolean
  disabled: boolean
  onPlay: () => void
  onPause: () => void
  onStop: () => void
  onCycleRepeat: () => void
}

export function PlaybackControls({
  status,
  repeatCount,
  hasCheckedLines,
  disabled,
  onPlay,
  onPause,
  onStop,
  onCycleRepeat,
}: PlaybackControlsProps) {
  const isPlaying = status === 'playing'
  const isRepeating = repeatCount > 0
  // 반복 기능은 체크된 가사 구간이 있을 때만 의미가 있다.
  const repeatDisabled = disabled || !hasCheckedLines
  const repeatLabel = !hasCheckedLines
    ? '반복 (구간 체크 필요)'
    : isRepeating
      ? `반복 ${repeatCount}회`
      : '반복 끄기'

  return (
    <div className="flex items-center justify-center gap-2">
      {/* Repeat 사이클 (Off → 2x → 5x). Off는 RepeatOff 아이콘으로 명시. */}
      <Button
        variant="ghost"
        size="icon"
        disabled={repeatDisabled}
        onClick={onCycleRepeat}
        aria-label={repeatLabel}
        className={cn(isRepeating ? 'text-primary' : 'text-muted-foreground')}
      >
        {isRepeating ? <Repeat /> : <RepeatOff />}
      </Button>
      {/* 카운트 상태 표시 — 버튼 밖에 라벨로 노출 (Off일 땐 폭만 유지) */}
      <span
        aria-hidden
        className={cn(
          'text-xs font-medium tabular-nums w-5 text-center',
          isRepeating ? 'text-primary' : 'text-transparent',
        )}
      >
        {isRepeating ? `${repeatCount}x` : '0x'}
      </span>

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

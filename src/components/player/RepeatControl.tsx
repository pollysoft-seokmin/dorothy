import { Repeat, RepeatOff } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { cn } from '~/lib/utils'

interface RepeatControlProps {
  repeatCount: number
  hasCheckedLines: boolean
  disabled: boolean
  onCycleRepeat: () => void
}

export function RepeatControl({
  repeatCount,
  hasCheckedLines,
  disabled,
  onCycleRepeat,
}: RepeatControlProps) {
  const isRepeating = repeatCount > 0
  // 반복 기능은 체크된 가사 구간이 있을 때만 의미가 있다.
  const repeatDisabled = disabled || !hasCheckedLines
  const repeatLabel = !hasCheckedLines
    ? '반복 (구간 체크 필요)'
    : isRepeating
      ? `반복 ${repeatCount}회`
      : '반복 끄기'

  return (
    <div className="flex items-center">
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
      {/* 카운트 배지 — Off일 땐 폭만 유지해 레이아웃이 흔들리지 않게 한다 */}
      <span
        aria-hidden
        className={cn(
          'text-xs font-medium tabular-nums w-5 text-center',
          isRepeating ? 'text-primary' : 'text-transparent',
        )}
      >
        {isRepeating ? `${repeatCount}x` : '0x'}
      </span>
    </div>
  )
}

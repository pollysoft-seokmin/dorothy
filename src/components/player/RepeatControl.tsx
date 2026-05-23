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
        // Button 기본 [&_svg]:size-4(16px)를 !size-6(24px)로 끌어올린다.
        // off 상태는 화이트로 다크 톤에 맞추고, on 상태는 Spotify 패턴대로 그린 인디케이터.
        className={cn(
          'size-11 shrink-0 hover:bg-white/10 [&_svg]:!size-6',
          isRepeating
            ? 'text-primary hover:text-primary'
            : 'text-foreground hover:text-foreground',
        )}
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

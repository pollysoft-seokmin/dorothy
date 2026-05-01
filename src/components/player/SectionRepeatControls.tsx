import { Minus, Plus, X } from 'lucide-react'
import { Button } from '~/components/ui/button'

interface SectionRepeatControlsProps {
  repeatCount: number
  hasCheckedLines: boolean
  onIncrement: () => void
  onDecrement: () => void
  onClearAll: () => void
}

export function SectionRepeatControls({
  repeatCount,
  hasCheckedLines,
  onIncrement,
  onDecrement,
  onClearAll,
}: SectionRepeatControlsProps) {
  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        onClick={onDecrement}
        disabled={repeatCount <= 1}
        aria-label="반복 횟수 감소"
        className="h-7 w-7"
      >
        <Minus className="h-3 w-3" />
      </Button>
      <span className="text-xs tabular-nums w-6 text-center font-medium">
        x{repeatCount}
      </span>
      <Button
        variant="ghost"
        size="icon"
        onClick={onIncrement}
        disabled={repeatCount >= 10}
        aria-label="반복 횟수 증가"
        className="h-7 w-7"
      >
        <Plus className="h-3 w-3" />
      </Button>
      {hasCheckedLines && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onClearAll}
          aria-label="구간 선택 해제"
          className="h-7 w-7"
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  )
}

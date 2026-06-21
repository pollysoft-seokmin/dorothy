import { Columns2, Square } from 'lucide-react'
import { Button } from '~/components/ui/button'
import type { ViewMode } from '~/stores/player-store'

interface ViewModeToggleProps {
  viewMode: ViewMode
  disabled?: boolean
  onCycle: () => void
}

// 현재 모드 기준 "다음에 보여줄 모드"를 아이콘/라벨로 표시한다(ExposeToggle 패턴).
// 아직 default ↔ split 두 모드만 순환하므로, split 이면 단일 컬럼 복귀 아이콘을,
// 그 외(default 등)면 2단 분할 아이콘을 노출한다.
export function ViewModeToggle({
  viewMode,
  disabled = false,
  onCycle,
}: ViewModeToggleProps) {
  const isSplit = viewMode === 'split'
  const Icon = isSplit ? Square : Columns2
  const label = isSplit ? '단일 컬럼으로 보기' : '2단(영상/자막)으로 보기'
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onCycle}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="size-10 shrink-0 rounded-full bg-transparent text-primary hover:bg-foreground/10 hover:text-primary-bright [&_svg]:size-6"
    >
      <Icon className="flex size-6 shrink-0" />
    </Button>
  )
}

import { Columns2, Square } from 'lucide-react'
import type { ViewMode } from '~/stores/player-store'

interface ViewModeToggleProps {
  viewMode: ViewMode
  onCycle: () => void
}

// 상단 헤더(AuthHeader)에 노출되는 2단/단일 보기 전환 버튼. 헤더의 다른 아이콘
// 트리거(Library 등)와 같은 raw 버튼 chrome 을 쓴다. 아직 default ↔ split 두 모드만
// 순환하므로, split 이면 단일 컬럼 복귀 아이콘을, 그 외면 2단 분할 아이콘을 보인다.
export function ViewModeToggle({ viewMode, onCycle }: ViewModeToggleProps) {
  const isSplit = viewMode === 'split'
  const Icon = isSplit ? Square : Columns2
  const label = isSplit ? '단일 컬럼으로 보기' : '2단(영상/자막)으로 보기'
  return (
    <button
      type="button"
      onClick={onCycle}
      aria-label={label}
      title={label}
      className="-ml-1 p-1.5 rounded text-muted-foreground hover:bg-muted hover:text-foreground"
    >
      <Icon className="size-5" />
    </button>
  )
}

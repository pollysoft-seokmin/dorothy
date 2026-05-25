import { Button } from '~/components/ui/button'
import { MaskedIcon, type MaskedIconName } from './MaskedIcon'
import type { LineMaskState } from '~/stores/player-store'

interface ExposeToggleProps {
  globalLineMask: LineMaskState
  disabled?: boolean
  onCycle: () => void
}

const ICON_BY_MASK: Record<LineMaskState, MaskedIconName> = {
  0: 'expose-none',
  1: 'expose-short',
  2: 'expose-all',
}

const LABEL_BY_MASK: Record<LineMaskState, string> = {
  0: '전부 가림',
  1: '첫 3글자만 노출',
  2: '전체 노출',
}

export function ExposeToggle({
  globalLineMask,
  disabled = false,
  onCycle,
}: ExposeToggleProps) {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onCycle}
      disabled={disabled}
      aria-label={`가사 노출: ${LABEL_BY_MASK[globalLineMask]} (클릭하여 변경)`}
      // 평시 투명 + primary, hover 시 화이트 10% 둥근 하이라이트로 다크 배경에서
      // 버튼임을 명확히 인지시킨다.
      className="size-10 shrink-0 rounded-full bg-transparent text-primary hover:bg-white/10 hover:text-primary-bright [&_svg]:size-6"
    >
      <MaskedIcon name={ICON_BY_MASK[globalLineMask]} className="flex size-6 shrink-0" />
    </Button>
  )
}

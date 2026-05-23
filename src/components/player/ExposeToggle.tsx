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
      className="size-11 shrink-0 bg-transparent text-primary hover:bg-transparent hover:text-primary-bright [&_svg]:!size-6"
    >
      <MaskedIcon name={ICON_BY_MASK[globalLineMask]} className="flex shrink-0" />
    </Button>
  )
}

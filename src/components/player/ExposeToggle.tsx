import { Button } from '~/components/ui/button'
import type { LineMaskState } from '~/stores/player-store'
import exposeNoneIcon from '~/assets/icons/expose-none.svg'
import exposeShortIcon from '~/assets/icons/expose-short.svg'
import exposeAllIcon from '~/assets/icons/expose-all.svg'

interface ExposeToggleProps {
  globalLineMask: LineMaskState
  disabled?: boolean
  onCycle: () => void
}

const ICON_BY_MASK: Record<LineMaskState, string> = {
  0: exposeNoneIcon,
  1: exposeShortIcon,
  2: exposeAllIcon,
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
      className="shrink-0"
    >
      <img
        src={ICON_BY_MASK[globalLineMask]}
        alt=""
        aria-hidden="true"
        className="h-4 w-4"
      />
    </Button>
  )
}

import { Button } from '~/components/ui/button'
import { cn } from '~/lib/utils'
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

// LanguageToggle과 동일 — fill="#000000"이 박힌 원본 SVG를 mask-image로
// 사용해 색을 currentColor에 위임한다.
function maskStyle(icon: string): React.CSSProperties {
  return {
    WebkitMaskImage: `url(${icon})`,
    maskImage: `url(${icon})`,
    WebkitMaskRepeat: 'no-repeat',
    maskRepeat: 'no-repeat',
    WebkitMaskPosition: 'center',
    maskPosition: 'center',
    WebkitMaskSize: 'contain',
    maskSize: 'contain',
  }
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
      className="size-11 shrink-0 text-foreground hover:bg-white/10 hover:text-foreground"
    >
      <span
        aria-hidden
        className={cn('size-6 shrink-0 bg-current')}
        style={maskStyle(ICON_BY_MASK[globalLineMask])}
      />
    </Button>
  )
}

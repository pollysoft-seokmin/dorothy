import { Button } from '~/components/ui/button'
import { cn } from '~/lib/utils'
import type { LyricsLanguage } from '~/stores/player-store'
import enKoIcon from '~/assets/icons/language-en-ko.svg'
import enIcon from '~/assets/icons/language-en.svg'
import koIcon from '~/assets/icons/language-ko.svg'

interface LanguageToggleProps {
  language: LyricsLanguage
  disabled?: boolean
  onCycle: () => void
}

const ICON_BY_LANGUAGE: Record<LyricsLanguage, string> = {
  'en-ko': enKoIcon,
  en: enIcon,
  ko: koIcon,
}

const LABEL_BY_LANGUAGE: Record<LyricsLanguage, string> = {
  'en-ko': '영어/한글 모두',
  en: '영어만',
  ko: '한글만',
}

// 원본 SVG에 fill="#000000"이 박혀 있어 다크 배경에서 묻힌다. 색은 CSS에서
// 통제하기 위해 SVG를 mask-image로 깔고 background로 currentColor를 입힌다.
// 이렇게 하면 부모의 text-foreground / disabled opacity가 자연스럽게 흐른다.
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

export function LanguageToggle({
  language,
  disabled = false,
  onCycle,
}: LanguageToggleProps) {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onCycle}
      disabled={disabled}
      aria-label={`가사 언어: ${LABEL_BY_LANGUAGE[language]} (클릭하여 변경)`}
      className="size-11 shrink-0 text-foreground hover:bg-white/10 hover:text-foreground"
    >
      <span
        aria-hidden
        className={cn('size-6 shrink-0 bg-current')}
        style={maskStyle(ICON_BY_LANGUAGE[language])}
      />
    </Button>
  )
}

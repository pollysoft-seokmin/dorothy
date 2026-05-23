import { Button } from '~/components/ui/button'
import { MaskedIcon, type MaskedIconName } from './MaskedIcon'
import type { LyricsLanguage } from '~/stores/player-store'

interface LanguageToggleProps {
  language: LyricsLanguage
  disabled?: boolean
  onCycle: () => void
}

const ICON_BY_LANGUAGE: Record<LyricsLanguage, MaskedIconName> = {
  'en-ko': 'language-en-ko',
  en: 'language-en',
  ko: 'language-ko',
}

const LABEL_BY_LANGUAGE: Record<LyricsLanguage, string> = {
  'en-ko': '영어/한글 모두',
  en: '영어만',
  ko: '한글만',
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
      // 배경 항상 투명, 아이콘은 primary(그린). hover에서는 primary-bright로 살짝 밝아진다.
      // Button 기본 [&_svg]:size-4(16px) 제약을 [&_svg]:!size-6(24px)로 끌어올려
      // inline SVG가 부모 span을 가득 채우게 한다.
      className="size-11 shrink-0 bg-transparent text-primary hover:bg-transparent hover:text-primary-bright [&_svg]:!size-6"
    >
      <MaskedIcon name={ICON_BY_LANGUAGE[language]} className="flex shrink-0" />
    </Button>
  )
}
